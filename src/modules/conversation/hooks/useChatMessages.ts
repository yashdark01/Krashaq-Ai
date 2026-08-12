'use client';

import { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';
import type { ChatMessage } from '@/modules/conversation/types/message';

function toChatMessage(item: {
  id: string;
  role: string;
  content: string;
  created_at: string | Date;
  tools_used?: string[];
  llm_provider?: string;
  llm_model?: string;
  detected_crop?: string | null;
  language?: string;
  feedback?: 'up' | 'down' | null;
  starred?: boolean;
}): ChatMessage {
  return {
    id: item.id,
    role: item.role as 'user' | 'assistant',
    content: item.content,
    status: 'complete',
    created_at: new Date(item.created_at).toISOString(),
    tools_used: item.tools_used,
    llm_provider: item.llm_provider,
    llm_model: item.llm_model,
    detected_crop: item.detected_crop,
    language: item.language,
    feedback: item.feedback,
  };
}

export function useChatMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const loadMessages = useCallback(async (sid: string) => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const res = await authenticatedFetch(`/api/messages?session_id=${encodeURIComponent(sid)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.items.map(toChatMessage));
      } else if (res.status === 404 || res.status === 403) {
        setMessages([]);
        setAccessDenied(true);
      }
    } catch (e) {
      console.error('Failed to load messages', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId);
    } else {
      setMessages([]);
      setAccessDenied(false);
    }
  }, [sessionId, loadMessages]);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessage = useCallback(
    (
      id: string,
      patch: Partial<ChatMessage> | ((current: ChatMessage) => Partial<ChatMessage>)
    ) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          const next = typeof patch === 'function' ? patch(m) : patch;
          return { ...m, ...next };
        })
      );
    },
    []
  );

  const appendDelta = useCallback((id: string, delta: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, content: m.content + delta, status: 'streaming' as const } : m
      )
    );
  }, []);

  const setFeedback = useCallback(
    async (messageId: string, feedback: 'up' | 'down' | null, sid: string) => {
      updateMessage(messageId, { feedback });
      await authenticatedFetch(`/api/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid, feedback }),
      });
    },
    [updateMessage]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    messages,
    loading,
    accessDenied,
    appendMessage,
    updateMessage,
    appendDelta,
    setFeedback,
    clearMessages,
    setMessages,
  };
}
