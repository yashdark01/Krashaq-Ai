import fs from 'fs';
import path from 'path';
import { IndexFlatIP } from 'faiss-node';
import { getConfig } from '@/lib/server/config';
import { getCollection } from '@/lib/server/db/mongodb';
import {
  defaultEmbeddingModel,
  isEmbeddingConfigured,
  resolveEmbeddingProvider,
} from '@/lib/server/rag/embedding-config';
import { embedTexts } from '@/lib/server/rag/embeddings';
import { clearFaissStoreCache } from '@/lib/server/rag/faiss-store';
import { chunkText, l2Normalize } from '@/lib/server/rag/scoring';
import type { FaissIndexMeta } from '@/lib/server/rag/types';

export interface KbDocumentRecord {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  search_aliases: string;
  content: string;
  status: 'draft' | 'published';
  chunk_count: number;
  source: 'admin' | 'file';
  created_by?: string | null;
  updated_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface KbIndexStatus {
  available: boolean;
  provider?: string;
  model?: string;
  dimension?: number;
  chunk_count?: number;
  built_at?: string;
  document_count?: number;
  embedding_configured: boolean;
}

interface ChunkRow {
  _id: string;
  doc_id: string;
  title: string;
  category: string;
  tags: string[];
  chunk_index: number;
  content: string;
}

interface DocMeta {
  title: string;
  tags: string[];
  search_aliases: string;
}

export function buildEmbedText(
  title: string,
  tags: string[],
  searchAliases: string,
  chunk: string
): string {
  const parts = [title];
  if (tags.length) parts.push(`Tags: ${tags.join(', ')}`);
  if (searchAliases) parts.push(`Search terms: ${searchAliases}`);
  parts.push(chunk);
  return parts.join('\n\n');
}

function resolveFaissPaths() {
  const cfg = getConfig();
  const indexPath = path.isAbsolute(cfg.faissIndexPath)
    ? cfg.faissIndexPath
    : path.join(process.cwd(), cfg.faissIndexPath);
  const idMapPath = path.isAbsolute(cfg.faissIdMapPath)
    ? cfg.faissIdMapPath
    : path.join(process.cwd(), cfg.faissIdMapPath);
  return { indexPath, idMapPath, faissDir: path.dirname(indexPath) };
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function syncDocumentChunks(
  docId: string,
  doc: {
    title: string;
    category: string;
    tags: string[];
    search_aliases: string;
    content: string;
  }
): Promise<number> {
  const parts = chunkText(doc.content);
  const chunksCol = await getCollection('kb_chunks');

  await chunksCol.deleteMany({ doc_id: docId });

  if (!parts.length) return 0;

  const now = new Date();
  for (let i = 0; i < parts.length; i++) {
    await chunksCol.insertOne({
      _id: `${docId}-ch${i}`,
      doc_id: docId,
      title: doc.title,
      category: doc.category,
      tags: doc.tags,
      chunk_index: i,
      content: parts[i],
      tokens: parts[i].split(/\s+/).filter(Boolean).length,
      updated_at: now,
    } as never);
  }

  return parts.length;
}

export async function rebuildFaissIndex(): Promise<FaissIndexMeta> {
  if (!isEmbeddingConfigured()) {
    throw new Error('Embeddings not configured — set EMBEDDING_PROVIDER and required API keys');
  }

  const chunksCol = await getCollection('kb_chunks');
  const docsCol = await getCollection('kb_documents');

  const chunkRows = (await chunksCol
    .find({})
    .sort({ doc_id: 1, chunk_index: 1 })
    .toArray()) as unknown as ChunkRow[];

  const publishedDocs = await docsCol
    .find({ status: { $ne: 'draft' } })
    .project({ _id: 1, title: 1, tags: 1, search_aliases: 1 })
    .toArray();

  const publishedIds = new Set(publishedDocs.map((d) => String(d._id)));
  const activeChunks = chunkRows.filter((c) => publishedIds.has(c.doc_id));

  const docMeta = new Map<string, DocMeta>();
  for (const doc of publishedDocs) {
    docMeta.set(String(doc._id), {
      title: String(doc.title),
      tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
      search_aliases: String(doc.search_aliases ?? ''),
    });
  }

  if (!activeChunks.length) {
    throw new Error('No published chunks to index');
  }

  const embedInputs: string[] = [];
  const indexRecords: Array<{ chunkId: string }> = [];

  for (const chunk of activeChunks) {
    const meta = docMeta.get(chunk.doc_id);
    if (!meta) continue;
    embedInputs.push(buildEmbedText(meta.title, meta.tags, meta.search_aliases, chunk.content));
    indexRecords.push({ chunkId: chunk._id });
  }

  const provider = resolveEmbeddingProvider();
  const model = defaultEmbeddingModel(provider);
  const embeddings: number[][] = [];

  const batchSize = 16;
  for (let i = 0; i < embedInputs.length; i += batchSize) {
    const batch = embedInputs.slice(i, i + batchSize);
    const batchEmbeddings = await embedTexts(batch);
    embeddings.push(...batchEmbeddings);
  }

  if (embeddings.length !== indexRecords.length) {
    throw new Error('Embedding count mismatch during index rebuild');
  }

  const dimension = embeddings[0]?.length ?? 0;
  if (!dimension) {
    throw new Error('Empty embedding vectors');
  }

  const index = new IndexFlatIP(dimension);
  const flatVectors: number[] = [];

  for (const vec of embeddings) {
    flatVectors.push(...l2Normalize(vec));
  }

  index.add(flatVectors);

  const { indexPath, idMapPath, faissDir } = resolveFaissPaths();
  fs.mkdirSync(faissDir, { recursive: true });
  index.write(indexPath);

  const builtAt = new Date().toISOString();
  const idMap = {
    version: 1,
    provider,
    model,
    dimension,
    built_at: builtAt,
    entries: indexRecords.map((record, faiss_id) => ({
      faiss_id,
      chunk_id: record.chunkId,
    })),
  };

  fs.writeFileSync(idMapPath, JSON.stringify(idMap, null, 2));

  const meta: FaissIndexMeta = {
    version: 1,
    provider,
    model,
    dimension,
    chunk_count: indexRecords.length,
    built_at: builtAt,
  };

  fs.writeFileSync(`${indexPath}.meta.json`, JSON.stringify(meta, null, 2));
  clearFaissStoreCache();

  return meta;
}

export async function getKbIndexStatus(): Promise<KbIndexStatus> {
  const { indexPath } = resolveFaissPaths();
  const metaPath = `${indexPath}.meta.json`;
  const docsCol = await getCollection('kb_documents');

  const documentCount = await docsCol.countDocuments({ status: { $ne: 'draft' } });

  if (!fs.existsSync(metaPath)) {
    return {
      available: false,
      document_count: documentCount,
      embedding_configured: isEmbeddingConfigured(),
    };
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as FaissIndexMeta;
  return {
    available: fs.existsSync(indexPath),
    provider: meta.provider,
    model: meta.model,
    dimension: meta.dimension,
    chunk_count: meta.chunk_count,
    built_at: meta.built_at,
    document_count: documentCount,
    embedding_configured: isEmbeddingConfigured(),
  };
}
