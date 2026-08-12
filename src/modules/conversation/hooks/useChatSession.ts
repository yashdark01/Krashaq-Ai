'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatSessionSummary } from '@/modules/conversation/types/message';

/** @deprecated Use useChatSessions from ChatSessionsContext */
export function useChatSession(initialSessionId?: string) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(
          data.items.map((s: ChatSessionSummary) => ({
            ...s,
            updated_at: new Date(s.updated_at).toISOString(),
          }))
        );
      }
    } catch (e) {
      console.error('Failed to load sessions', e);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const startNewChat = useCallback(() => {
    setSessionId(null);
    router.push('/chat');
  }, [router]);

  const openSession = useCallback(
    (id: string) => {
      setSessionId(id);
      router.push(`/chat/${id}`);
    },
    [router]
  );

  const deleteSessionById = useCallback(
    async (id: string) => {
      await fetch(`/api/messages?session_id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.session_id !== id));
      if (sessionId === id) startNewChat();
    },
    [sessionId, startNewChat]
  );

  return {
    sessionId,
    setSessionId,
    sessions,
    sessionsLoading,
    refreshSessions,
    startNewChat,
    openSession,
    deleteSessionById,
  };
}

/** @deprecated Use useChatSessions from ChatSessionsContext */
export function useLlmPreferences() {
  const [provider, setProviderState] = useState('groq');
  const [model, setModelState] = useState('llama-3.3-70b-versatile');
  return { provider, model, setProvider: setProviderState, setModel: setModelState };
}
