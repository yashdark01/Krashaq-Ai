import type { KbCitation, KbChunkRecord } from '@/lib/server/rag/types';

export interface KbRetrievalState {
  rag_query: string;
  rag_chunks: KbChunkRecord[];
  rag_citations: KbCitation[];
  rag_score: number;
  rag_relevant: boolean;
  rag_context: string;
  kb_events_emitted: boolean;
  kb_ready: boolean;
}

export function kbToolKey(query: string): string {
  return `search_knowledge_base:${JSON.stringify({ query })}`;
}

export function retrievalPromptFromKb(kbOutput: string): string {
  if (kbOutput && !kbOutput.startsWith('No matching') && !kbOutput.startsWith('No verified')) {
    return `Verified knowledge base context:\n${kbOutput}\n\nAnswer using only the sources above. Cite as [KB1], [KB2], etc. If information is insufficient, say you cannot verify and suggest consulting the local KVK.`;
  }
  return `No verified knowledge base documents matched this query. Do not invent scheme details, amounts, or helpline numbers. Tell the farmer to verify with the official government portal or Krishi Vigyan Kendra.`;
}

export function emptyKbRetrievalState(): KbRetrievalState {
  return {
    rag_query: '',
    rag_chunks: [],
    rag_citations: [],
    rag_score: 0,
    rag_relevant: false,
    rag_context: '',
    kb_events_emitted: false,
    kb_ready: false,
  };
}

export function kbAlreadyRetrieved(state: {
  rag_query: string;
  rag_relevant: boolean;
  executed_tool_keys: string[];
}): boolean {
  if (!state.rag_query || !state.rag_relevant) return false;
  return state.executed_tool_keys.includes(kbToolKey(state.rag_query));
}
