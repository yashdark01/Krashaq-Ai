'use client';

import { useCallback, useRef, useState } from 'react';
import type { ChatMessage, StreamEvent } from '@/modules/conversation/types/message';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

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
                updateMessage(assistantId, (prev) => ({
                  tool_calls: [
                    ...(prev.tool_calls ?? []),
                    {
                      tool: event.tool,
                      input: event.input,
                      status: 'running' as const,
                    },
                  ],
                }));
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
                updateMessage(assistantId, (prev) => ({
                  citations: [
                    ...(prev.citations ?? []),
                    {
                      index: event.index,
                      title: event.title,
                      snippet: event.snippet,
                      url: event.url,
                      source: event.source,
                      doc_id: event.doc_id,
                    },
                  ],
                }));
              } else if (event.type === 'token') {
                appendDelta(assistantId, event.delta);
              } else if (event.type === 'done') {
                updateMessage(assistantId, {
                  id: event.message_id,
                  content: event.full_content,
                  status: 'complete',
                });
              } else if (event.type === 'error') {
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

        updateMessage(assistantId, { status: 'complete' });
      } catch (err) {
        if (controller.signal.aborted) {
          updateMessage(assistantId, { status: 'cancelled' });
        } else {
          updateMessage(assistantId, {
            status: 'error',
            content: "Sorry, I couldn't process your request. Please try again.",
            error: {
              code: 'NETWORK',
              message: err instanceof Error ? err.message : 'Unknown error',
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
