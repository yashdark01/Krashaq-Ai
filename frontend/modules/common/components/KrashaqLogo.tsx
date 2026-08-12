import { Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KrashaqLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: 'h-9 w-9', icon: 'h-5 w-5', title: 'text-sm' },
  md: { box: 'h-12 w-12', icon: 'h-6 w-6', title: 'text-lg' },
  lg: { box: 'h-16 w-16', icon: 'h-8 w-8', title: 'text-2xl' },
};

export function KrashaqLogo({ size = 'md', showText = true, className }: KrashaqLogoProps) {
  const s = sizeMap[size];
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm',
          s.box
        )}
        aria-hidden="true"
      >
        <Sprout className={s.icon} />
      </div>
      {showText && (
        <div className="text-center">
          <p className={cn('font-display font-bold', s.title)}>Krashaq</p>
          <p className="text-xs text-muted-foreground">Smart farming assistant</p>
        </div>
      )}
    </div>
  );
}
