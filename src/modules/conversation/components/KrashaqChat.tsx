'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useChatSessions } from '@/contexts/ChatSessionsContext';
import { useChatMessages } from '@/modules/conversation/hooks/useChatMessages';
import { useChatStream } from '@/modules/conversation/hooks/useChatStream';
import { ChatMessageList } from './ChatMessageList';
import { ChatComposer } from './ChatComposer';

interface KrashaqChatProps {
  sessionId?: string;
  initialPrompt?: string;
  location?: string;
  compact?: boolean;
}

export function KrashaqChat({
  sessionId: initialSessionId,
  initialPrompt,
  location: locationProp,
  compact = false,
}: KrashaqChatProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { sessionId, setSessionId, refreshSessions, provider, model, setProvider, setModel } =
    useChatSessions();
  const {
    messages,
    loading,
    accessDenied,
    appendMessage,
    updateMessage,
    appendDelta,
    setFeedback,
  } = useChatMessages(sessionId);

  const location =
    locationProp ||
    user?.locality ||
    user?.district ||
    user?.state ||
    user?.default_location ||
    'Delhi';

  const [input, setInput] = useState('');
  const [promptSent, setPromptSent] = useState(false);

  const onSessionId = useCallback(
    (id: string) => {
      setSessionId(id);
      router.replace(`/chat/${id}`, { scroll: false });
    },
    [setSessionId, router]
  );

  const { send, stop, isStreaming, regenerate } = useChatStream({
    sessionId,
    location,
    provider,
    model,
    onSessionId,
    appendMessage,
    updateMessage,
    appendDelta,
    refreshSessions,
  });

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await send(text);
  }, [input, send]);

  const handleSelectPrompt = useCallback(
    async (prompt: string) => {
      setInput('');
      await send(prompt);
    },
    [send]
  );

  useEffect(() => {
    if (initialSessionId) setSessionId(initialSessionId);
  }, [initialSessionId, setSessionId]);

  useEffect(() => {
    if (initialPrompt && !promptSent && !loading && messages.length === 0) {
      setPromptSent(true);
      send(initialPrompt);
    }
  }, [initialPrompt, promptSent, loading, messages.length, send]);

  const handleFeedback = useCallback(
    (messageId: string, feedback: 'up' | 'down' | null) => {
      if (sessionId) setFeedback(messageId, feedback, sessionId);
    },
    [sessionId, setFeedback]
  );

  useEffect(() => {
    if (accessDenied) {
      router.replace('/chat');
    }
  }, [accessDenied, router]);

  if (compact) {
    const lastMessages = messages.slice(-2);
    return (
      <div className="flex flex-col rounded-xl border bg-card overflow-hidden">
        <div className="max-h-48 overflow-hidden p-3 space-y-2">
          {lastMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Start a conversation with Krashaq
            </p>
          ) : (
            lastMessages.map((m) => (
              <p
                key={m.id}
                className={`text-xs line-clamp-2 ${m.role === 'user' ? 'text-right text-primary' : 'text-muted-foreground'}`}
              >
                {m.content.slice(0, 120)}
              </p>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ChatMessageList
        messages={messages}
        loading={loading && !!sessionId}
        isStreaming={isStreaming}
        userName={user?.name}
        onSelectPrompt={handleSelectPrompt}
        onRegenerate={() => regenerate(messages)}
        onFeedback={sessionId ? handleFeedback : undefined}
        onRetry={(content) => send(content)}
      />
      <ChatComposer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
        disabled={isStreaming}
        provider={provider}
        model={model}
        onProviderChange={setProvider}
        onModelChange={setModel}
      />
    </div>
  );
}
