import { semanticSearchKb, formatSemanticContext } from '@/lib/server/rag/retriever';
import { ragRequestCache, type CachedKbResult } from '@/lib/server/rag/request-cache';
import { getCollection } from '@/lib/server/db/mongodb';

export type { KbCitation } from '@/lib/server/rag/types';

export interface KbDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

/** Clear at the start of each chat/agent turn to avoid stale cross-request data. */
export function clearRagRequestCache() {
  ragRequestCache.clear();
}

async function fetchAndCacheKb(query: string, limit: number): Promise<CachedKbResult> {
  const cached = ragRequestCache.get(query);
  if (cached) return cached;

  const result = await semanticSearchKb(query, limit);
  const full: CachedKbResult = {
    ...result,
    context: formatSemanticContext(result),
  };
  ragRequestCache.set(query, full);
  return full;
}

export async function searchKbDocuments(query: string, limit = 5): Promise<KbDocument[]> {
  const { chunks } = await fetchAndCacheKb(query, limit);
  return chunks.map((c) => ({
    id: c.id,
    title: c.title,
    content: c.content,
    category: c.category,
    tags: c.tags,
  }));
}

export async function searchKbWithCitations(query: string, limit = 5) {
  const { chunks, citations, hasRelevant } = await fetchAndCacheKb(query, limit);
  return { chunks, citations, hasRelevant };
}

export async function retrieveKbContext(query: string, limit = 5) {
  return fetchAndCacheKb(query, limit);
}

/** Legacy seed — prefer `npm run kb:ingest` for full corpus + FAISS index */
export async function seedKbDocumentsIfEmpty() {
  const kb = await getCollection('kb_documents');
  const chunks = await getCollection('kb_chunks');
  const [docCount, chunkCount] = await Promise.all([
    kb.countDocuments({}),
    chunks.countDocuments({}),
  ]);
  if (docCount > 0 || chunkCount > 0) return;

  await kb.insertMany([
    {
      _id: 'kb-pm-kisan',
      title: 'PM-KISAN Scheme Overview',
      category: 'scheme',
      tags: ['pm-kisan', 'subsidy', 'scheme', 'government'],
      content:
        'PM-KISAN provides income support of Rs 6,000 per year in three equal installments to eligible farmer families.',
    },
  ] as never);

  await chunks.insertOne({
    _id: 'kb-pm-kisan-ch0',
    doc_id: 'kb-pm-kisan',
    title: 'PM-KISAN Scheme Overview',
    category: 'scheme',
    tags: ['pm-kisan', 'subsidy'],
    chunk_index: 0,
    content:
      'PM-KISAN provides income support of Rs 6,000 per year in three equal installments. Verify eligibility on the official portal.',
  } as never);
}
