import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

function BubbleGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="bubble-group" className={cn('flex min-w-0 flex-col gap-1', className)} {...props} />
  );
}

const bubbleVariants = cva('relative flex w-full min-w-0 flex-col rounded-2xl', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      muted: 'bg-muted text-foreground',
      outline: 'border border-border bg-card text-foreground',
      ghost: 'bg-transparent text-foreground',
    },
  },
  defaultVariants: {
    variant: 'muted',
  },
});

function Bubble({
  variant = 'muted',
  align = 'start',
  className,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof bubbleVariants> & {
    align?: 'start' | 'end';
  }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(
        bubbleVariants({ variant }),
        align === 'end' ? 'rounded-br-md' : 'rounded-bl-md',
        className
      )}
      {...props}
    />
  );
}

function BubbleContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="bubble-content"
      className={cn('w-full max-w-full min-w-0 px-4 py-2.5 text-sm leading-relaxed', className)}
      {...props}
    />
  );
}

export { BubbleGroup, Bubble, BubbleContent, bubbleVariants };
