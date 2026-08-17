'use client';

import { Copy, RotateCcw, ThumbsDown, ThumbsUp, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatMessageActionsProps {
  content: string;
  feedback?: 'up' | 'down' | null;
  onRegenerate?: () => void;
  onFeedback?: (feedback: 'up' | 'down' | null) => void;
  showRegenerate?: boolean;
  className?: string;
}

export function ChatMessageActions({
  content,
  feedback,
  onRegenerate,
  onFeedback,
  showRegenerate = true,
  className,
}: ChatMessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const iconBtn = 'h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80';

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 opacity-0 group-hover/message:opacity-100 group-focus-within/message:opacity-100 transition-opacity',
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={iconBtn}
        onClick={copy}
        aria-label="Copy message"
        title="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      {showRegenerate && onRegenerate && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconBtn}
          onClick={onRegenerate}
          aria-label="Regenerate response"
          title="Regenerate"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
      {onFeedback && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(iconBtn, feedback === 'up' && 'text-primary opacity-100')}
            onClick={() => onFeedback(feedback === 'up' ? null : 'up')}
            aria-label="Good response"
            title="Good response"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(iconBtn, feedback === 'down' && 'text-destructive opacity-100')}
            onClick={() => onFeedback(feedback === 'down' ? null : 'down')}
            aria-label="Bad response"
            title="Bad response"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
