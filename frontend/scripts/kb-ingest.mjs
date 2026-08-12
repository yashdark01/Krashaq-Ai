#!/usr/bin/env node
/**
 * Ingest content/kb/*.md into MongoDB kb_documents + kb_chunks.
 * Optional OpenAI embeddings when OPENAI_API_KEY or EMBEDDING_API_KEY is set.
 *
 * Usage: npm run kb:ingest [-- --force]
 */
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(process.cwd(), 'content', 'kb');

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

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
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

async function embedBatch(texts) {
  const apiKey = process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey || !texts.length) return [];

  const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    console.warn('Embedding API failed:', res.status, await res.text());
    return [];
  }

  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

async function main() {
  const force = process.argv.includes('--force');
  const url = process.env.MONGODB_URL ?? 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB ?? 'krashaq';

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

    const docId = `kb-${slug}`;
    await docs.updateOne(
      { _id: docId },
      {
        $set: {
          title,
          category,
          tags,
          content: body,
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    );
    docCount++;

    const parts = chunkText(body);
    await chunks.deleteMany({ doc_id: docId });

    const embeddings = await embedBatch(parts);

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
      if (embeddings[i]) {
        record.embedding = embeddings[i];
      }
      await chunks.insertOne(record);
      chunkCount++;
    }

    console.log(`✓ ${file} → ${parts.length} chunk(s)${embeddings.length ? ' + embeddings' : ''}`);
  }

  await client.close();
  console.log(`\nDone: ${docCount} documents, ${chunkCount} chunks ingested.`);
  if (!(process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY)) {
    console.log('Tip: set OPENAI_API_KEY for vector search (keyword search works without it).');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
