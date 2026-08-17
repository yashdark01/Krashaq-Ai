'use client';

import { memo } from 'react';
import { Sprout, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/components/ui/message';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/modules/conversation/types/message';
import { MarkdownContent } from './MarkdownContent';
import { ChatMessageActions } from './ChatMessageActions';
import { ToolCallList } from './ToolCallChip';
import { CitationList } from './CitationList';
import { friendlyErrorContent, looksLikeTechnicalError } from '@/modules/conversation/utils/chat-errors';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onFeedback?: (feedback: 'up' | 'down' | null) => void;
  onRetry?: () => void;
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  onRegenerate,
  onFeedback,
  onRetry,
}: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';
  const technicalError = !isUser && looksLikeTechnicalError(message.content);
  const showError = isError || technicalError;
  const displayContent = technicalError ? friendlyErrorContent(message.content) : message.content;

  if (isUser) {
    return (
      <Message align="end">
        <MessageContent className="w-full">
          <Bubble variant="default" align="end">
            <BubbleContent className="whitespace-pre-wrap">{message.content}</BubbleContent>
          </Bubble>
        </MessageContent>
        <MessageAvatar>
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
              <User className="h-3.5 w-3.5" aria-hidden />
            </AvatarFallback>
          </Avatar>
        </MessageAvatar>
      </Message>
    );
  }

  return (
    <Message align="start">
      <MessageAvatar>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-accent text-primary">
            <Sprout className="h-3.5 w-3.5" aria-hidden />
          </AvatarFallback>
        </Avatar>
      </MessageAvatar>

      <MessageContent className="w-full">
        <MessageHeader>
          <span className="text-xs font-semibold text-foreground">Krashaq</span>
          {message.language && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              {message.language}
            </Badge>
          )}
          {message.tools_used
            ?.filter(
              (tool) =>
                !(message.tool_calls ?? []).some((c) => c.tool === tool && c.status === 'done')
            )
            .map((tool) => (
              <Badge key={tool} variant="weather" className="h-5 px-1.5 text-[10px]">
                {tool.replace(/_/g, ' ')}
              </Badge>
            ))}
          {message.llm_provider && message.llm_provider !== 'none' && (
            <Badge variant="ai" className="h-5 px-1.5 text-[10px]">
              {message.llm_provider}
              {message.llm_model ? ` · ${message.llm_model.split('-').slice(0, 2).join('-')}` : ''}
            </Badge>
          )}
        </MessageHeader>

        {message.tool_calls && message.tool_calls.length > 0 && (
          <ToolCallList calls={message.tool_calls} />
        )}

        <Bubble
          variant={showError ? 'outline' : 'ghost'}
          className={cn(showError && 'border-destructive/40')}
        >
          <BubbleContent
            className={cn('px-0 py-0', showError && 'border-l-2 border-destructive pl-3 text-destructive')}
          >
            {showError && !displayContent ? (
              <p>{message.error?.message ?? 'Something went wrong.'}</p>
            ) : showError ? (
              <p>{displayContent}</p>
            ) : (
              <MarkdownContent
                content={message.content || (isStreaming ? ' ' : '')}
                streaming={isStreaming}
              />
            )}
          </BubbleContent>
        </Bubble>

        {message.citations && message.citations.length > 0 && (
          <CitationList citations={message.citations} />
        )}

        <MessageFooter>
          {message.status === 'complete' && message.content && (
            <ChatMessageActions
              content={message.content}
              feedback={message.feedback}
              onRegenerate={onRegenerate}
              onFeedback={onFeedback}
            />
          )}
          {showError && (message.error?.retryable ?? technicalError) && onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onRetry}
            >
              Try again
            </Button>
          )}
        </MessageFooter>
      </MessageContent>
    </Message>
  );
});
