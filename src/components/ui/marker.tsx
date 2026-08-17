import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const markerVariants = cva('relative flex w-full items-center gap-2 text-xs text-muted-foreground', {
  variants: {
    variant: {
      default: 'px-4 py-1',
      separator:
        'px-4 py-3 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border [&_[data-slot=marker-content]]:px-3 [&_[data-slot=marker-content]]:text-[11px] [&_[data-slot=marker-content]]:font-medium [&_[data-slot=marker-content]]:uppercase [&_[data-slot=marker-content]]:tracking-wide',
      border: 'border-b border-border/60 px-4 py-2',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function Marker({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof markerVariants>) {
  return (
    <div
      data-slot="marker"
      data-variant={variant}
      className={cn(markerVariants({ variant }), className)}
      {...props}
    />
  );
}

function MarkerIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      {...props}
    />
  );
}

function MarkerContent({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="marker-content"
      className={cn('min-w-0 break-words', className)}
      {...props}
    />
  );
}

export { Marker, MarkerIcon, MarkerContent, markerVariants };
