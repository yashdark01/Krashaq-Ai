import { getConfig } from '@/lib/server/config';
import { isEmbeddingConfigured, embeddingSetupHint } from '@/lib/server/rag/embeddings';
import {
  evaluateRagCase,
  formatEvalReport,
  summarizeEvalResults,
  type RagEvalCase,
  type RagEvalCaseResult,
  type RagEvalSummary,
} from '@/lib/server/rag/eval';
import {
  faissSimilaritySearch,
  getChunkById,
  isFaissIndexAvailable,
  loadFaissStore,
} from '@/lib/server/rag/faiss-store';
import { formatKbContextForPrompt } from '@/lib/server/rag/format';
import {
  applySemanticMmr,
  buildSemanticSearchResult,
  passesRelevanceThreshold,
} from '@/lib/server/rag/relevance-grader';
import { getCachedRetrieval, setCachedRetrieval } from '@/lib/server/rag/retrieval-cache';
import { buildRetrievalQuery, resolveRetrievalMinScore } from '@/lib/server/rag/query-language';
import { traceRagRetrieval } from '@/lib/server/rag/tracing';
import type { KbCitation, KbChunkRecord, SemanticSearchResult } from '@/lib/server/rag/types';

export type { KbCitation, KbChunkRecord, SemanticSearchResult };
export type { RagEvalCase, RagEvalCaseResult, RagEvalSummary };
export { evaluateRagCase, formatEvalReport, summarizeEvalResults };

export async function semanticSearchKb(
  query: string,
  limit?: number
): Promise<SemanticSearchResult> {
  const started = Date.now();
  const cfg = getConfig();
  const topK = limit ?? cfg.ragTopK;
  const fetchK = Math.max(cfg.ragFetchK, topK);
  const q = query.trim();

  if (!q) {
    return { chunks: [], citations: [], hasRelevant: false, topScore: 0 };
  }

  if (!isEmbeddingConfigured()) {
    console.warn(`[RAG] Embeddings not configured — ${embeddingSetupHint()}`);
    return { chunks: [], citations: [], hasRelevant: false, topScore: 0 };
  }

  if (!isFaissIndexAvailable()) {
    console.warn('[RAG] FAISS index not found — run npm run kb:ingest');
    return { chunks: [], citations: [], hasRelevant: false, topScore: 0 };
  }

  const cached = await getCachedRetrieval(q, topK);
  if (cached) {
    traceRagRetrieval({
      query: q,
      result: cached,
      latencyMs: Date.now() - started,
      cacheHit: true,
    });
    return cached;
  }

  await loadFaissStore();

  const searchQuery = buildRetrievalQuery(q);
  const rawHits = await faissSimilaritySearch(searchQuery, fetchK);
  const scored: Array<KbChunkRecord & { score: number }> = [];

  for (const hit of rawHits) {
    const chunk = await getChunkById(hit.chunk_id);
    if (chunk) {
      scored.push({ ...chunk, score: hit.score });
    }
  }

  if (!scored.length) {
    const empty: SemanticSearchResult = {
      chunks: [],
      citations: [],
      hasRelevant: false,
      topScore: 0,
    };
    traceRagRetrieval({ query: q, result: empty, latencyMs: Date.now() - started });
    return empty;
  }

  const diversified = applySemanticMmr(scored, topK);
  const topScore = diversified[0]?.score ?? 0;
  const minScore = resolveRetrievalMinScore(q);
  const hasRelevant = passesRelevanceThreshold(topScore, minScore) && diversified.length > 0;
  const result = buildSemanticSearchResult(hasRelevant ? diversified : [], hasRelevant);

  await setCachedRetrieval(q, topK, result);
  traceRagRetrieval({ query: q, result, latencyMs: Date.now() - started, cacheHit: false });

  return result;
}

export function formatSemanticContext(result: SemanticSearchResult): string {
  return formatKbContextForPrompt(result.chunks, result.citations);
}

export async function runRagEval(cases: RagEvalCase[]): Promise<{
  results: RagEvalCaseResult[];
  summary: RagEvalSummary;
}> {
  const results: RagEvalCaseResult[] = [];

  for (const testCase of cases) {
    const searchResult = await semanticSearchKb(testCase.query, 5);
    results.push(evaluateRagCase(testCase, searchResult));
  }

  return { results, summary: summarizeEvalResults(results) };
}
