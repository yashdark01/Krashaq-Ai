import { getConfig } from '@/lib/server/config';
import type { SemanticSearchResult } from '@/lib/server/rag/types';

export interface RagRetrievalTrace {
  query: string;
  result: SemanticSearchResult;
  latencyMs: number;
  cacheHit?: boolean;
}

function langsmithEndpoint(): string {
  const cfg = getConfig();
  return cfg.langsmithEndpoint || 'https://api.smith.langchain.com';
}

/** Fire-and-forget LangSmith trace for FAISS retrieval runs. */
export function traceRagRetrieval(trace: RagRetrievalTrace): void {
  const cfg = getConfig();
  if (!cfg.langsmithTracing || !cfg.langsmithApiKey) return;

  const runId = crypto.randomUUID();
  const endpoint = langsmithEndpoint();
  const chunkIds = trace.result.chunks.map((c) => c.id);
  const docIds = [...new Set(trace.result.chunks.map((c) => c.doc_id))];

  const body = {
    id: runId,
    name: 'faiss_retrieval',
    run_type: 'retriever',
    inputs: { query: trace.query },
    outputs: {
      topScore: trace.result.topScore,
      hasRelevant: trace.result.hasRelevant,
      chunk_ids: chunkIds,
      doc_ids: docIds,
      citation_count: trace.result.citations.length,
    },
    session_name: cfg.langsmithProject,
    tags: ['rag', 'faiss', trace.cacheHit ? 'cache_hit' : 'cache_miss'],
    extra: {
      metadata: {
        retrieval: 'faiss',
        latency_ms: trace.latencyMs,
        cache_hit: Boolean(trace.cacheHit),
      },
    },
  };

  fetch(`${endpoint}/api/v1/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.langsmithApiKey,
    },
    body: JSON.stringify(body),
  }).catch(() => {
    /* tracing must not affect retrieval */
  });
}
