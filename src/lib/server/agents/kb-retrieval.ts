import { retrieveKbContext } from '@/lib/server/services/rag-service';
import type { AgentRunCallbacks } from '@/lib/server/agents/state';
import type { KbCitation } from '@/lib/server/rag/types';
import type { KbRetrievalState } from '@/lib/server/agents/kb-retrieval-helpers';

export type { KbRetrievalState } from '@/lib/server/agents/kb-retrieval-helpers';
export {
  kbToolKey,
  retrievalPromptFromKb,
  emptyKbRetrievalState,
  kbAlreadyRetrieved,
} from '@/lib/server/agents/kb-retrieval-helpers';

function emitKbStreamEvents(
  query: string,
  citations: KbCitation[],
  context: string,
  hasRelevant: boolean,
  callbacks: AgentRunCallbacks,
  started: number
) {
  callbacks.onToolStart?.('search_knowledge_base', { query });
  for (let i = 0; i < citations.length; i++) {
    const cite = citations[i];
    callbacks.onCitation?.({
      index: i + 1,
      title: cite.title,
      snippet: cite.snippet,
      doc_id: cite.doc_id,
      source: 'kb',
    });
  }
  const output = hasRelevant ? context : 'No matching verified documents in knowledge base.';
  callbacks.onToolEnd?.('search_knowledge_base', output.slice(0, 800), Date.now() - started);
}

export async function runKbRetrieval(
  query: string,
  limit: number,
  callbacks: AgentRunCallbacks,
  emitEvents: boolean
): Promise<KbRetrievalState> {
  const started = Date.now();
  const retrieval = await retrieveKbContext(query, limit);

  if (emitEvents) {
    emitKbStreamEvents(
      query,
      retrieval.citations,
      retrieval.context,
      retrieval.hasRelevant,
      callbacks,
      started
    );
  }

  return {
    rag_query: query,
    rag_chunks: retrieval.chunks,
    rag_citations: retrieval.citations,
    rag_score: retrieval.topScore,
    rag_relevant: retrieval.hasRelevant,
    rag_context: retrieval.context,
    kb_events_emitted: emitEvents,
    kb_ready: retrieval.hasRelevant,
  };
}
