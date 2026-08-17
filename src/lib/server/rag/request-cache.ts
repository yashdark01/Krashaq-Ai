import type { KbCitation } from '@/lib/server/rag/types';

export interface CachedKbResult {
  chunks: Array<{
    id: string;
    doc_id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    chunk_index: number;
  }>;
  citations: KbCitation[];
  hasRelevant: boolean;
  topScore: number;
  context: string;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Per-request cache — call clear() at the start of each agent/chat turn. */
class RagRequestCache {
  private kb = new Map<string, CachedKbResult>();

  clear() {
    this.kb.clear();
  }

  has(query: string): boolean {
    return this.kb.has(normalizeQuery(query));
  }

  get(query: string): CachedKbResult | undefined {
    return this.kb.get(normalizeQuery(query));
  }

  set(query: string, result: CachedKbResult) {
    this.kb.set(normalizeQuery(query), result);
  }
}

export const ragRequestCache = new RagRequestCache();
