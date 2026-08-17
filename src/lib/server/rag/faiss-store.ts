import fs from 'fs';
import path from 'path';
import { IndexFlatIP } from 'faiss-node';
import { getConfig } from '@/lib/server/config';
import { getCollection } from '@/lib/server/db/mongodb';
import { embedQuery } from '@/lib/server/rag/embeddings';
import { l2Normalize } from '@/lib/server/rag/scoring';
import type { FaissIdMapEntry, FaissIndexMeta, KbChunkRecord } from '@/lib/server/rag/types';

declare global {
  var _krashaqFaissIndex: IndexFlatIP | undefined;
  var _krashaqFaissIdMap: FaissIdMapEntry[] | undefined;
  var _krashaqFaissMeta: FaissIndexMeta | undefined;
  var _krashaqFaissChunkCache: Map<string, KbChunkRecord> | undefined;
}

export interface FaissSearchHit {
  chunk_id: string;
  score: number;
}

function resolvePath(relativePath: string): string {
  return path.isAbsolute(relativePath) ? relativePath : path.join(process.cwd(), relativePath);
}

function readIdMapFile(idMapPath: string): FaissIdMapEntry[] {
  if (!fs.existsSync(idMapPath)) return [];

  const raw = JSON.parse(fs.readFileSync(idMapPath, 'utf8')) as {
    entries?: FaissIdMapEntry[];
  };

  return (raw.entries ?? []).slice().sort((a, b) => a.faiss_id - b.faiss_id);
}

function readMetaFile(indexPath: string): FaissIndexMeta | null {
  const metaPath = `${indexPath}.meta.json`;
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, 'utf8')) as FaissIndexMeta;
}

async function loadChunkCache(entries: FaissIdMapEntry[]): Promise<Map<string, KbChunkRecord>> {
  const cache = new Map<string, KbChunkRecord>();
  if (!entries.length) return cache;

  const chunkIds = entries.map((e) => e.chunk_id);
  const col = await getCollection('kb_chunks');
  const docs = await col.find({ _id: { $in: chunkIds } } as Record<string, unknown>).toArray();

  for (const doc of docs) {
    cache.set(String(doc._id), {
      id: String(doc._id),
      doc_id: String(doc.doc_id),
      title: doc.title as string,
      content: doc.content as string,
      category: (doc.category as string) ?? 'general',
      tags: (doc.tags as string[]) ?? [],
      chunk_index: (doc.chunk_index as number) ?? 0,
    });
  }

  return cache;
}

export function isFaissIndexAvailable(): boolean {
  const cfg = getConfig();
  const indexPath = resolvePath(cfg.faissIndexPath);
  const idMapPath = resolvePath(cfg.faissIdMapPath);
  return fs.existsSync(indexPath) && fs.existsSync(idMapPath);
}

export async function loadFaissStore(): Promise<boolean> {
  if (global._krashaqFaissIndex && global._krashaqFaissIdMap) {
    return true;
  }

  const cfg = getConfig();
  const indexPath = resolvePath(cfg.faissIndexPath);
  const idMapPath = resolvePath(cfg.faissIdMapPath);

  if (!fs.existsSync(indexPath) || !fs.existsSync(idMapPath)) {
    return false;
  }

  const idMap = readIdMapFile(idMapPath);
  if (!idMap.length) return false;

  global._krashaqFaissIndex = IndexFlatIP.read(indexPath);
  global._krashaqFaissIdMap = idMap;
  global._krashaqFaissMeta = readMetaFile(indexPath) ?? undefined;
  global._krashaqFaissChunkCache = await loadChunkCache(idMap);

  return true;
}

export function clearFaissStoreCache() {
  global._krashaqFaissIndex = undefined;
  global._krashaqFaissIdMap = undefined;
  global._krashaqFaissMeta = undefined;
  global._krashaqFaissChunkCache = undefined;
}

export async function faissSimilaritySearch(query: string, k: number): Promise<FaissSearchHit[]> {
  const loaded = await loadFaissStore();
  if (!loaded) return [];

  const queryVec = await embedQuery(query);
  if (!queryVec?.length) return [];

  const index = global._krashaqFaissIndex!;
  const idMap = global._krashaqFaissIdMap!;
  const normalized = l2Normalize(queryVec);

  const { labels, distances } = index.search(normalized, Math.min(k, index.ntotal()));
  const hits: FaissSearchHit[] = [];

  for (let i = 0; i < labels.length; i++) {
    const faissId = labels[i];
    if (faissId < 0) continue;

    const entry = idMap[faissId];
    if (!entry) continue;

    hits.push({
      chunk_id: entry.chunk_id,
      score: distances[i],
    });
  }

  return hits;
}

export async function getChunkById(chunkId: string): Promise<KbChunkRecord | null> {
  await loadFaissStore();
  const cached = global._krashaqFaissChunkCache?.get(chunkId);
  if (cached) return cached;

  const col = await getCollection('kb_chunks');
  const doc = await col.findOne({ _id: chunkId } as Record<string, unknown>);
  if (!doc) return null;

  return {
    id: String(doc._id),
    doc_id: String(doc.doc_id),
    title: doc.title as string,
    content: doc.content as string,
    category: (doc.category as string) ?? 'general',
    tags: (doc.tags as string[]) ?? [],
    chunk_index: (doc.chunk_index as number) ?? 0,
  };
}

export function getFaissIndexMeta(): FaissIndexMeta | null {
  return global._krashaqFaissMeta ?? null;
}
