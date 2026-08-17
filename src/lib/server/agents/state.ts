import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { AgentRoute } from '@/lib/server/agents/router';
import type { KbCitation, KbChunkRecord } from '@/lib/server/rag/types';

export const KrashaqStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  route: Annotation<AgentRoute>({
    reducer: (_left, right) => right,
    default: () => 'tools' as AgentRoute,
  }),
  tools_used: Annotation<string[]>({
    reducer: (left, right) => left.concat(Array.isArray(right) ? right : [right]),
    default: () => [],
  }),
  iteration: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  location: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => 'Delhi',
  }),
  language: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => 'en',
  }),
  user_id: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => '',
  }),
  user_role: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => 'farmer',
  }),
  detected_crop: Annotation<string | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  kb_ready: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
  kb_events_emitted: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
  executed_tool_keys: Annotation<string[]>({
    reducer: (left, right) => left.concat(Array.isArray(right) ? right : [right]),
    default: () => [],
  }),
  rag_query: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => '',
  }),
  rag_chunks: Annotation<KbChunkRecord[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  rag_citations: Annotation<KbCitation[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  rag_score: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  rag_relevant: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
  rag_context: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => '',
  }),
});

export type KrashaqState = typeof KrashaqStateAnnotation.State;

export interface AgentRunCallbacks {
  onToolStart?: (tool: string, input: Record<string, unknown>) => void;
  onToolEnd?: (tool: string, output: string, durationMs: number) => void;
  onToken?: (delta: string) => void;
  onCitation?: (citation: {
    index: number;
    title: string;
    snippet: string;
    doc_id?: string;
    source?: 'kb' | 'web';
  }) => void;
}

export interface AgentGraphConfig {
  groqModel: string;
  providerModel?: string;
  maxIterations: number;
  callbacks?: AgentRunCallbacks;
}
