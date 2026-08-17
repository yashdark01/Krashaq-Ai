import * as React from 'react';
import { cn } from '@/lib/utils';

function MessageGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-group"
      className={cn('flex min-w-0 flex-col gap-1', className)}
      {...props}
    />
  );
}

function Message({
  className,
  align = 'start',
  ...props
}: React.ComponentProps<'div'> & { align?: 'start' | 'end' }) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        'group/message relative flex w-full min-w-0 gap-3 py-2 max-w-none items-start',
        align === 'end' ? 'flex-row-reverse justify-end' : 'flex-row justify-start',
        className
      )}
      {...props}
    />
  );
}

function MessageAvatar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-avatar"
      className={cn('flex w-fit shrink-0 items-start self-start pb-1', className)}
      {...props}
    />
  );
}

function MessageContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-content"
      className={cn('flex w-full min-w-0 max-w-none flex-col gap-1.5', className)}
      {...props}
    />
  );
}

function MessageHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-header"
      className={cn('flex max-w-full min-w-0 flex-wrap items-center gap-1.5', className)}
      {...props}
    />
  );
}

function MessageFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-footer"
      className={cn(
        'flex min-h-7 max-w-full min-w-0 items-center gap-2',
        'group-data-[align=end]/message:justify-end',
        className
      )}
      {...props}
    />
  );
}

export { MessageGroup, Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader };
