'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChatMessage } from '@/modules/conversation/types/message';
import { ChatMessageBubble } from './ChatMessage';
import { ChatEmptyState } from './ChatEmptyState';

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
  isStreaming?: boolean;
  userName?: string;
  onSelectPrompt: (prompt: string) => void;
  onRegenerate?: () => void;
  onFeedback?: (messageId: string, feedback: 'up' | 'down' | null) => void;
  onRetry?: (content: string) => void;
}

export function ChatMessageList({
  messages,
  loading,
  isStreaming,
  userName,
  onSelectPrompt,
  onRegenerate,
  onFeedback,
  onRetry,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const userNearBottom = useRef(true);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    userNearBottom.current = dist < 120;
    setShowScrollBtn(dist > 200);
  }, []);

  useEffect(() => {
    if (userNearBottom.current || isStreaming) {
      scrollToBottom(!isStreaming);
    }
  }, [messages, isStreaming, scrollToBottom]);

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-16 w-3/4 rounded-xl" />
        <Skeleton className="h-24 w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-16 w-2/3 ml-auto rounded-xl" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <ChatEmptyState onSelect={onSelectPrompt} userName={userName} />
      </div>
    );
  }

  const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant');
  const lastAssistantId =
    lastAssistantIdx >= 0 ? messages[messages.length - 1 - lastAssistantIdx]?.id : null;

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            onRegenerate={
              message.id === lastAssistantId && message.status === 'complete'
                ? onRegenerate
                : undefined
            }
            onFeedback={onFeedback ? (fb) => onFeedback(message.id, fb) : undefined}
            onRetry={
              message.status === 'error' && onRetry
                ? () => {
                    const prevUser = messages
                      .slice(0, messages.indexOf(message))
                      .reverse()
                      .find((m) => m.role === 'user');
                    if (prevUser) onRetry(prevUser.content);
                  }
                : undefined
            }
          />
        ))}
        <div ref={bottomRef} className="h-1" />
      </div>

      {showScrollBtn && (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full shadow-md z-10"
          onClick={() => scrollToBottom()}
          aria-label="Scroll to latest message"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
