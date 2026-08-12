'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { ChatSessionSummary } from '@/modules/conversation/types/message';

const LLM_STORAGE_KEY = 'krashaq_llm';

interface ChatSessionsContextType {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  sessions: ChatSessionSummary[];
  sessionsLoading: boolean;
  refreshSessions: () => Promise<void>;
  startNewChat: () => void;
  openSession: (id: string) => void;
  deleteSessionById: (id: string) => Promise<void>;
  provider: string;
  model: string;
  setProvider: (p: string) => void;
  setModel: (m: string) => void;
}

const ChatSessionsContext = createContext<ChatSessionsContextType | undefined>(undefined);

export function ChatSessionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [provider, setProviderState] = useState('groq');
  const [model, setModelState] = useState('llama-3.3-70b-versatile');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LLM_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.provider) setProviderState(parsed.provider);
        if (parsed.model) setModelState(parsed.model);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistLlm = useCallback((p: string, m: string) => {
    localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify({ provider: p, model: m }));
  }, []);

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

  const setProvider = useCallback(
    (p: string) => {
      setProviderState(p);
      persistLlm(p, model);
    },
    [model, persistLlm]
  );

  const setModel = useCallback(
    (m: string) => {
      setModelState(m);
      persistLlm(provider, m);
    },
    [provider, persistLlm]
  );

  return (
    <ChatSessionsContext.Provider
      value={{
        sessionId,
        setSessionId,
        sessions,
        sessionsLoading,
        refreshSessions,
        startNewChat,
        openSession,
        deleteSessionById,
        provider,
        model,
        setProvider,
        setModel,
      }}
    >
      {children}
    </ChatSessionsContext.Provider>
  );
}

export function useChatSessions() {
  const ctx = useContext(ChatSessionsContext);
  if (!ctx) throw new Error('useChatSessions must be used within ChatSessionsProvider');
  return ctx;
}

// Backward-compatible hooks
export function useChatSession(initialSessionId?: string) {
  const ctx = useChatSessions();
  useEffect(() => {
    if (initialSessionId) ctx.setSessionId(initialSessionId);
  }, [initialSessionId, ctx]);
  return ctx;
}

export function useLlmPreferences() {
  const { provider, model, setProvider, setModel } = useChatSessions();
  return { provider, model, setProvider, setModel };
}
