import fs from 'fs';
import path from 'path';
import { cacheGet, cacheSet } from '@/lib/server/cache/redis';
import { getConfig } from '@/lib/server/config';
import type { SemanticSearchResult } from '@/lib/server/rag/types';

const CACHE_VERSION = 'v2';

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolvePath(relativePath: string): string {
  return path.isAbsolute(relativePath) ? relativePath : path.join(process.cwd(), relativePath);
}

function indexCacheFingerprint(): string {
  const cfg = getConfig();
  const metaPath = `${resolvePath(cfg.faissIndexPath)}.meta.json`;
  if (!fs.existsSync(metaPath)) return 'no-index';

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as {
      provider?: string;
      model?: string;
      built_at?: string;
    };
    return `${meta.provider ?? 'unknown'}:${meta.model ?? 'unknown'}:${meta.built_at ?? 'unknown'}`;
  } catch {
    return 'no-index';
  }
}

export function ragCacheKey(query: string, topK: number): string {
  return `rag:${CACHE_VERSION}:${indexCacheFingerprint()}:${normalizeQuery(query)}:k${topK}`;
}

export async function getCachedRetrieval(
  query: string,
  topK: number
): Promise<SemanticSearchResult | null> {
  const cfg = getConfig();
  if (!cfg.ragCacheEnabled) return null;
  return cacheGet<SemanticSearchResult>(ragCacheKey(query, topK));
}

export async function setCachedRetrieval(
  query: string,
  topK: number,
  result: SemanticSearchResult
): Promise<void> {
  const cfg = getConfig();
  if (!cfg.ragCacheEnabled) return;
  await cacheSet(ragCacheKey(query, topK), result, cfg.ragCacheTtl);
}
