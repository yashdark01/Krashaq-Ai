'use client';

import { useCallback, useRef, useState } from 'react';
import type { ChatMessage, StreamEvent } from '@/modules/conversation/types/message';
import { friendlyErrorContent, looksLikeTechnicalError } from '@/modules/conversation/utils/chat-errors';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

function friendlyLlmErrorMessage(raw: string): string {
  return friendlyErrorContent(raw);
}

interface UseChatStreamOptions {
  sessionId: string | null;
  location: string;
  provider: string;
  model: string;
  onSessionId: (id: string) => void;
  appendMessage: (msg: ChatMessage) => void;
  updateMessage: (
    id: string,
    patch: Partial<ChatMessage> | ((current: ChatMessage) => Partial<ChatMessage>)
  ) => void;
  appendDelta: (id: string, delta: string) => void;
  refreshSessions: () => Promise<void>;
}

export function useChatStream({
  sessionId,
  location,
  provider,
  model,
  onSessionId,
  appendMessage,
  updateMessage,
  appendDelta,
  refreshSessions,
}: UseChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userId = `user-${Date.now()}`;
      const assistantId = `assistant-${Date.now()}`;

      appendMessage({
        id: userId,
        role: 'user',
        content: text.trim(),
        status: 'complete',
        created_at: new Date().toISOString(),
      });

      appendMessage({
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        created_at: new Date().toISOString(),
      });

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      let activeSessionId = sessionId;
      let streamStatus: ChatMessage['status'] = 'complete';

      try {
        const res = await authenticatedFetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            location,
            session_id: sessionId,
            provider,
            model,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(res.status === 401 ? 'Please log in to chat' : 'Stream request failed');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6)) as StreamEvent;

              if (event.type === 'session') {
                activeSessionId = event.session_id;
                onSessionId(event.session_id);
              } else if (event.type === 'meta') {
                updateMessage(assistantId, {
                  language: event.language,
                  tools_used: event.tools_used,
                  llm_provider: event.llm_provider,
                  llm_model: event.llm_model,
                  detected_crop: event.detected_crop,
                });
              } else if (event.type === 'tool_start') {
                updateMessage(assistantId, (prev) => {
                  const inputKey = JSON.stringify(event.input);
                  const existing = prev.tool_calls ?? [];
                  const duplicate = existing.some(
                    (c) =>
                      c.tool === event.tool &&
                      c.status === 'running' &&
                      JSON.stringify(c.input) === inputKey
                  );
                  if (duplicate) return {};
                  return {
                    tool_calls: [
                      ...existing,
                      {
                        tool: event.tool,
                        input: event.input,
                        status: 'running' as const,
                      },
                    ],
                  };
                });
              } else if (event.type === 'tool_result') {
                updateMessage(assistantId, (prev) => {
                  const existing = [...(prev.tool_calls ?? [])];
                  const idx = existing.findIndex(
                    (c) => c.tool === event.tool && c.status === 'running'
                  );
                  if (idx >= 0) {
                    existing[idx] = {
                      ...existing[idx],
                      output: event.output,
                      duration_ms: event.duration_ms,
                      status: 'done',
                    };
                  }
                  const tools_used = [...(prev.tools_used ?? [])];
                  if (!tools_used.includes(event.tool)) tools_used.push(event.tool);
                  return { tool_calls: existing, tools_used };
                });
              } else if (event.type === 'citation') {
                updateMessage(assistantId, (prev) => {
                  const existing = prev.citations ?? [];
                  const dup = existing.some(
                    (c) =>
                      c.doc_id === event.doc_id && event.doc_id != null && c.index === event.index
                  );
                  if (dup) return {};
                  return {
                    citations: [
                      ...existing,
                      {
                        index: event.index,
                        title: event.title,
                        snippet: event.snippet,
                        url: event.url,
                        source: event.source,
                        doc_id: event.doc_id,
                      },
                    ],
                  };
                });
              } else if (event.type === 'token') {
                appendDelta(assistantId, event.delta);
              } else if (event.type === 'done') {
                const content = looksLikeTechnicalError(event.full_content)
                  ? friendlyLlmErrorMessage(event.full_content)
                  : event.full_content;
                if (looksLikeTechnicalError(event.full_content)) {
                  streamStatus = 'error';
                }
                updateMessage(assistantId, {
                  id: event.message_id,
                  content,
                  status: streamStatus === 'error' ? 'error' : 'complete',
                  ...(streamStatus === 'error'
                    ? {
                        error: {
                          code: 'LLM_ERROR',
                          message: content,
                          retryable: true,
                        },
                      }
                    : {}),
                });
              } else if (event.type === 'error') {
                streamStatus = 'error';
                updateMessage(assistantId, {
                  status: 'error',
                  content: event.message,
                  error: {
                    code: event.code,
                    message: event.message,
                    retryable: event.retryable,
                  },
                });
              }
            } catch {
              /* skip malformed SSE */
            }
          }
        }

        if (streamStatus !== 'error') {
          updateMessage(assistantId, (current) =>
            current.status === 'error' ? {} : { status: 'complete' }
          );
        }
      } catch (err) {
        if (controller.signal.aborted) {
          updateMessage(assistantId, { status: 'cancelled' });
        } else {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          updateMessage(assistantId, {
            status: 'error',
            content: friendlyLlmErrorMessage(errorMessage),
            error: {
              code: 'NETWORK',
              message: errorMessage,
              retryable: true,
            },
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        if (activeSessionId) {
          await refreshSessions();
        }
      }
    },
    [
      isStreaming,
      sessionId,
      location,
      provider,
      model,
      onSessionId,
      appendMessage,
      updateMessage,
      appendDelta,
      refreshSessions,
    ]
  );

  const regenerate = useCallback(
    async (messages: ChatMessage[]) => {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUser) await send(lastUser.content);
    },
    [send]
  );

  return { send, stop, isStreaming, regenerate };
}
