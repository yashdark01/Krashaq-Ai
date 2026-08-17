'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatSessionSummary } from '@/modules/conversation/types/message';

const LLM_STORAGE_KEY = 'krashaq_llm';

const DEPRECATED_GEMINI_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
]);

function normalizeStoredLlmPrefs(provider: string, model: string) {
  if (provider === 'gemini' && DEPRECATED_GEMINI_MODELS.has(model)) {
    return { provider, model: 'gemini-3.6-flash' };
  }
  return { provider, model };
}

interface ChatSessionsContextType {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  sessions: ChatSessionSummary[];
  sessionsLoading: boolean;
  refreshSessions: () => Promise<void>;
  startNewChat: () => void;
  openSession: (id: string) => void;
  deleteSessionById: (id: string) => Promise<void>;
  renameSessionById: (id: string, title: string) => Promise<boolean>;
  provider: string;
  model: string;
  setProvider: (p: string) => void;
  setModel: (m: string) => void;
  clearSessions: () => void;
}

const ChatSessionsContext = createContext<ChatSessionsContextType | undefined>(undefined);

export function ChatSessionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [provider, setProviderState] = useState('gemini');
  const [model, setModelState] = useState('gemini-3.6-flash');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LLM_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalizeStoredLlmPrefs(
          parsed.provider ?? 'gemini',
          parsed.model ?? 'gemini-3.6-flash'
        );
        setProviderState(normalized.provider);
        setModelState(normalized.model);
        if (normalized.provider !== parsed.provider || normalized.model !== parsed.model) {
          localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(normalized));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistLlm = useCallback((p: string, m: string) => {
    localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify({ provider: p, model: m }));
  }, []);

  const clearSessions = useCallback(() => {
    setSessions([]);
    setSessionId(null);
    setSessionsLoading(false);
  }, []);

  const refreshSessions = useCallback(async () => {
    if (!isAuthenticated) {
      clearSessions();
      return;
    }
    setSessionsLoading(true);
    try {
      const res = await fetchWithAuth('/api/messages/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(
          data.items.map((s: ChatSessionSummary) => ({
            ...s,
            updated_at: new Date(s.updated_at).toISOString(),
          }))
        );
      } else if (res.status === 401) {
        clearSessions();
      }
    } catch (e) {
      console.error('Failed to load sessions', e);
    } finally {
      setSessionsLoading(false);
    }
  }, [fetchWithAuth, isAuthenticated, clearSessions]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    const onLogout = () => clearSessions();
    window.addEventListener('krashaq:auth-logout', onLogout);
    return () => window.removeEventListener('krashaq:auth-logout', onLogout);
  }, [clearSessions]);

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
      await fetchWithAuth(`/api/messages?session_id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setSessions((prev) => prev.filter((s) => s.session_id !== id));
      if (sessionId === id) startNewChat();
    },
    [sessionId, startNewChat, fetchWithAuth]
  );

  const renameSessionById = useCallback(
    async (id: string, title: string) => {
      const res = await fetchWithAuth(`/api/messages/sessions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) return false;
      setSessions((prev) =>
        prev.map((s) => (s.session_id === id ? { ...s, title: title.trim() } : s))
      );
      return true;
    },
    [fetchWithAuth]
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
        renameSessionById,
        provider,
        model,
        setProvider,
        setModel,
        clearSessions,
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
