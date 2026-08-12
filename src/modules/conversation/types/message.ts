export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error' | 'cancelled';

export interface ToolCallRecord {
  tool: string;
  input: Record<string, unknown>;
  output?: string;
  duration_ms?: number;
  status: 'running' | 'done' | 'error';
}

export interface MessageCitation {
  index: number;
  title: string;
  snippet: string;
  url?: string;
  source?: 'kb' | 'web';
  doc_id?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: MessageStatus;
  created_at: string;
  tools_used?: string[];
  tool_calls?: ToolCallRecord[];
  citations?: MessageCitation[];
  llm_provider?: string;
  llm_model?: string;
  detected_crop?: string | null;
  language?: string;
  feedback?: 'up' | 'down' | null;
  error?: { code: string; message: string; retryable: boolean };
}

export interface ChatSessionSummary {
  session_id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

export type StreamEvent =
  | { type: 'session'; session_id: string }
  | {
      type: 'meta';
      language: string;
      tools_used: string[];
      llm_provider: string;
      llm_model: string;
      detected_crop: string | null;
    }
  | { type: 'tool_start'; tool: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; output: string; duration_ms?: number }
  | {
      type: 'citation';
      index: number;
      title: string;
      url?: string;
      snippet: string;
      source?: 'kb' | 'web';
      doc_id?: string;
    }
  | { type: 'token'; delta: string }
  | { type: 'done'; message_id: string; full_content: string }
  | { type: 'error'; code: string; message: string; retryable: boolean };
