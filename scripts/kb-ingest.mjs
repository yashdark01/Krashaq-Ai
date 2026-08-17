#!/usr/bin/env node
/**
 * Ingest content/kb/*.md into MongoDB kb_documents + kb_chunks,
 * then build a FAISS semantic index (no hybrid / keyword search).
 *
 * Usage: npm run kb:ingest [-- --force]
 */
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { IndexFlatIP } = require('faiss-node');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(process.cwd(), 'content', 'kb');
const FAISS_DIR = path.join(process.cwd(), 'data', 'faiss');
const INDEX_PATH = path.join(FAISS_DIR, 'kb.index');
const ID_MAP_PATH = path.join(FAISS_DIR, 'id-map.json');

function chunkText(text, maxLen = 550) {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = '';
  for (const para of paragraphs) {
    if ((buf + '\n\n' + para).length <= maxLen) {
      buf = buf ? `${buf}\n\n${para}` : para;
    } else {
      if (buf) chunks.push(buf);
      if (para.length <= maxLen) buf = para;
      else {
        for (let i = 0; i < para.length; i += maxLen) chunks.push(para.slice(i, i + maxLen));
        buf = '';
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

function buildEmbedText(title, tags, searchAliases, chunk) {
  const parts = [title];
  if (tags.length) parts.push(`Tags: ${tags.join(', ')}`);
  if (searchAliases) parts.push(`Search terms: ${searchAliases}`);
  parts.push(chunk);
  return parts.join('\n\n');
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function l2Normalize(vec) {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (!norm) return vec;
  return vec.map((v) => v / norm);
}

function loadEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    return {
      meta: {
        title: titleMatch?.[1]?.trim() ?? 'Untitled',
        category: 'general',
        tags: '',
      },
      body: raw.trim(),
    };
  }

  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: match[2].trim() };
}

function resolveEmbeddingProvider() {
  const explicit = (process.env.EMBEDDING_PROVIDER ?? 'auto').toLowerCase();
  const providers = ['groq', 'huggingface', 'ollama', 'gemini', 'openai'];
  if (providers.includes(explicit)) return explicit;
  if (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY) return 'huggingface';
  if (process.env.GOOGLE_API_KEY) return 'gemini';
  if (process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GROQ_API_KEY) return 'groq';
  return 'ollama';
}

function defaultEmbeddingModel(provider) {
  if (process.env.EMBEDDING_MODEL) return process.env.EMBEDDING_MODEL;
  if (provider === 'groq') return 'nomic-embed-text-v1_5';
  if (provider === 'huggingface') return 'sentence-transformers/all-MiniLM-L6-v2';
  if (provider === 'ollama') return 'nomic-embed-text';
  if (provider === 'gemini') return 'gemini-embedding-001';
  return 'text-embedding-3-small';
}

async function embedGroq(texts, model) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('Groq embeddings require GROQ_API_KEY.');
    process.exit(1);
  }

  const res = await fetch('https://api.groq.com/openai/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: texts, encoding_format: 'float' }),
  });

  if (!res.ok) {
    console.error('Groq embed failed:', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

function meanPool(tokenVectors) {
  const dim = tokenVectors[0]?.length ?? 0;
  const out = new Array(dim).fill(0);
  for (const vec of tokenVectors) {
    for (let i = 0; i < dim; i++) out[i] += vec[i] ?? 0;
  }
  for (let i = 0; i < dim; i++) out[i] /= tokenVectors.length;
  return out;
}

function normalizeHfVector(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === 'number') return raw;
  if (Array.isArray(raw[0])) {
    if (raw.length === 1) return raw[0] ?? [];
    return meanPool(raw);
  }
  return [];
}

async function embedHuggingFace(texts, model) {
  const apiKey = process.env.HF_TOKEN ?? process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.error('Hugging Face embeddings require HF_TOKEN.');
    process.exit(1);
  }

  const res = await fetch(
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
    }
  );

  if (!res.ok) {
    console.error('Hugging Face embed failed:', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];
  if (texts.length === 1) return [normalizeHfVector(data)];
  return data.map((item) => normalizeHfVector(item));
}

async function embedOllama(texts, model) {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
  const res = await fetch(`${baseUrl}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    console.error('Ollama embed failed:', res.status, await res.text());
    console.error('Tip: install Ollama and run: ollama pull', model);
    process.exit(1);
  }

  const data = await res.json();
  return data.embeddings ?? [];
}

async function embedGemini(texts, model) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('Gemini embeddings require GOOGLE_API_KEY.');
    process.exit(1);
  }

  const embeddings = [];
  for (const text of texts) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!res.ok) {
      console.error('Gemini embed failed:', res.status, await res.text());
      process.exit(1);
    }

    const data = await res.json();
    embeddings.push(data.embedding?.values ?? []);
  }

  return embeddings;
}

async function embedOpenAI(texts, model) {
  const apiKey = process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OpenAI embeddings require OPENAI_API_KEY or EMBEDDING_API_KEY.');
    process.exit(1);
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    console.error('OpenAI embed failed:', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

async function embedBatch(texts) {
  if (!texts.length) return [];

  const provider = resolveEmbeddingProvider();
  const model = defaultEmbeddingModel(provider);

  console.log(`Embedding via ${provider} (${model})…`);

  if (provider === 'groq') return embedGroq(texts, model);
  if (provider === 'huggingface') return embedHuggingFace(texts, model);
  if (provider === 'ollama') return embedOllama(texts, model);
  if (provider === 'gemini') return embedGemini(texts, model);
  return embedOpenAI(texts, model);
}

function buildFaissIndex(records, embeddings, model, provider) {
  if (!records.length || !embeddings.length) {
    console.error('No chunks to index — cannot build FAISS index.');
    process.exit(1);
  }

  const dimension = embeddings[0].length;
  const index = new IndexFlatIP(dimension);
  const flatVectors = [];

  for (let i = 0; i < embeddings.length; i++) {
    flatVectors.push(...l2Normalize(embeddings[i]));
  }

  index.add(flatVectors);

  fs.mkdirSync(FAISS_DIR, { recursive: true });
  index.write(INDEX_PATH);

  const idMap = {
    version: 1,
    provider,
    model,
    dimension,
    built_at: new Date().toISOString(),
    entries: records.map((record, faiss_id) => ({
      faiss_id,
      chunk_id: record.chunkId,
    })),
  };

  fs.writeFileSync(ID_MAP_PATH, JSON.stringify(idMap, null, 2));

  const meta = {
    version: 1,
    provider,
    model,
    dimension,
    chunk_count: records.length,
    built_at: idMap.built_at,
  };
  fs.writeFileSync(`${INDEX_PATH}.meta.json`, JSON.stringify(meta, null, 2));

  return { dimension, count: records.length };
}

async function main() {
  const force = process.argv.includes('--force');
  const url = process.env.MONGODB_URL ?? 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB ?? 'krashaq';
  const provider = resolveEmbeddingProvider();
  const embeddingModel = defaultEmbeddingModel(provider);

  console.log(`Using embedding provider: ${provider} (${embeddingModel})`);

  if (!fs.existsSync(KB_DIR)) {
    console.error('No content/kb directory found.');
    process.exit(1);
  }

  const files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith('.md'));
  if (!files.length) {
    console.error('No .md files in content/kb');
    process.exit(1);
  }

  const client = new MongoClient(url, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(dbName);
  const docs = db.collection('kb_documents');
  const chunks = db.collection('kb_chunks');

  if (force) {
    await docs.deleteMany({});
    await chunks.deleteMany({});
    console.log('Cleared kb_documents and kb_chunks.');
  }

  const indexRecords = [];
  let docCount = 0;
  let chunkCount = 0;

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(KB_DIR, file), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const title = meta.title ?? slug;
    const category = meta.category ?? 'general';
    const tags = (meta.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const searchAliases = meta.search_aliases ?? meta.searchAliases ?? '';

    const docId = `kb-${slug}`;
    await docs.updateOne(
      { _id: docId },
      {
        $set: {
          slug,
          title,
          category,
          tags,
          search_aliases: searchAliases,
          content: body,
          status: 'published',
          source: 'file',
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    );
    docCount++;

    const parts = chunkText(body);
    await chunks.deleteMany({ doc_id: docId });

    const embedTexts = parts.map((part) => buildEmbedText(title, tags, searchAliases, part));
    const embeddings = await embedBatch(embedTexts);

    for (let i = 0; i < parts.length; i++) {
      const chunkId = `${docId}-ch${i}`;
      const record = {
        _id: chunkId,
        doc_id: docId,
        title,
        category,
        tags,
        chunk_index: i,
        content: parts[i],
        tokens: tokenize(parts[i]).length,
        updated_at: new Date(),
      };
      await chunks.insertOne(record);
      chunkCount++;

      if (embeddings[i]) {
        indexRecords.push({ chunkId, embedding: embeddings[i] });
      }
    }

    await docs.updateOne(
      { _id: docId },
      { $set: { chunk_count: parts.length, updated_at: new Date() } }
    );

    console.log(`✓ ${file} → ${parts.length} chunk(s) + embeddings`);
  }

  await client.close();

  const { dimension, count } = buildFaissIndex(
    indexRecords,
    indexRecords.map((r) => r.embedding),
    embeddingModel,
    provider
  );

  console.log(`\nDone: ${docCount} documents, ${chunkCount} chunks ingested.`);
  console.log(`FAISS index: ${INDEX_PATH} (${count} vectors, dim=${dimension})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
