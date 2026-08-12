import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({ message = 'Loading Krashaq…', className }: PageLoadingProps) {
  return (
    <div
      className={cn('min-h-[50vh] flex flex-col items-center justify-center px-6 py-12', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" role="status">
      <div className="w-full max-w-sm space-y-6 text-center animate-fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-xl font-bold">
          K
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-3/4 mx-auto rounded-lg" />
        </div>
        <p className="text-sm text-muted-foreground">Preparing your farm dashboard…</p>
      </div>
    </div>
  );
}
