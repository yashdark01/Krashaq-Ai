'use client';

import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Marker, MarkerContent } from '@/components/ui/marker';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { Spinner } from '@/components/ui/spinner';
import type { ChatMessage } from '@/modules/conversation/types/message';
import { looksLikeTechnicalError } from '@/modules/conversation/utils/chat-errors';
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

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

type ListRow =
  | { type: 'separator'; id: string; label: string }
  | { type: 'message'; message: ChatMessage };

function buildRows(messages: ChatMessage[]): ListRow[] {
  const rows: ListRow[] = [];
  let lastDate = '';

  for (const message of messages) {
    const dateKey = new Date(message.created_at).toDateString();
    if (dateKey !== lastDate) {
      rows.push({
        type: 'separator',
        id: `sep-${dateKey}`,
        label: formatDateLabel(message.created_at),
      });
      lastDate = dateKey;
    }
    rows.push({ type: 'message', message });
  }

  return rows;
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
  const rows = useMemo(() => buildRows(messages), [messages]);

  const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant');
  const lastAssistantId =
    lastAssistantIdx >= 0 ? messages[messages.length - 1 - lastAssistantIdx]?.id : null;

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-6">
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

  return (
    <MessageScrollerProvider
      autoScroll={isStreaming}
      defaultScrollPosition="last-anchor"
      scrollPreviousItemPeek={72}
      scrollEdgeThreshold={120}
    >
      <MessageScroller className="relative flex-1 min-h-0">
        <MessageScrollerViewport>
          <MessageScrollerContent>
            {rows.map((row) => {
              if (row.type === 'separator') {
                return (
                  <MessageScrollerItem key={row.id} messageId={row.id}>
                    <Marker variant="separator">
                      <MarkerContent>{row.label}</MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                );
              }

              const message = row.message;
              return (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={message.role === 'user'}
                >
                  <ChatMessageBubble
                    message={message}
                    onRegenerate={
                      message.id === lastAssistantId && message.status === 'complete'
                        ? onRegenerate
                        : undefined
                    }
                    onFeedback={onFeedback ? (fb) => onFeedback(message.id, fb) : undefined}
                    onRetry={
                      (message.status === 'error' || looksLikeTechnicalError(message.content)) &&
                      onRetry
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
                </MessageScrollerItem>
              );
            })}

            {isStreaming && (
              <MessageScrollerItem messageId="assistant-streaming-status">
                <Marker role="status" className="px-4 py-2">
                  <MarkerContent className="inline-flex items-center gap-2 text-shimmer">
                    <Spinner className="size-3.5" />
                    Krashaq is thinking…
                  </MarkerContent>
                </Marker>
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton direction="end" />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
