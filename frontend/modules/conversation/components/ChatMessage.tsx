'use client';

import { Sprout, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/modules/conversation/types/message';
import { MarkdownContent } from './MarkdownContent';
import { ChatMessageActions } from './ChatMessageActions';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onFeedback?: (feedback: 'up' | 'down' | null) => void;
  onRetry?: () => void;
}

export function ChatMessageBubble({
  message,
  onRegenerate,
  onFeedback,
  onRetry,
}: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';

  if (isUser) {
    return (
      <div className="group flex justify-end gap-3 px-4 py-2">
        <div className="max-w-[85%] md:max-w-[70%] space-y-1">
          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground text-sm">
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <User className="h-3.5 w-3.5" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 px-4 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-sky/15 text-brand-sky">
        <Sprout className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 max-w-3xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground">Krashaq</span>
          {message.language && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              {message.language}
            </Badge>
          )}
          {message.tools_used?.map((tool) => (
            <Badge key={tool} variant="weather" className="text-[10px] h-5 px-1.5">
              {tool.replace(/_/g, ' ')}
            </Badge>
          ))}
          {message.llm_provider && message.llm_provider !== 'none' && (
            <Badge variant="ai" className="text-[10px] h-5 px-1.5">
              {message.llm_provider}
              {message.llm_model ? ` · ${message.llm_model.split('-').slice(0, 2).join('-')}` : ''}
            </Badge>
          )}
        </div>

        <div
          className={cn(
            'text-sm text-foreground',
            isError && 'border-l-2 border-destructive pl-3 text-destructive'
          )}
        >
          {isError && !message.content ? (
            <p>{message.error?.message ?? 'Something went wrong.'}</p>
          ) : (
            <MarkdownContent
              content={message.content || (isStreaming ? ' ' : '')}
              streaming={isStreaming}
            />
          )}
        </div>

        <div className="flex items-center gap-2 min-h-[28px]">
          {message.status === 'complete' && message.content && (
            <ChatMessageActions
              content={message.content}
              feedback={message.feedback}
              onRegenerate={onRegenerate}
              onFeedback={onFeedback}
            />
          )}
          {isError && message.error?.retryable && onRetry && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
