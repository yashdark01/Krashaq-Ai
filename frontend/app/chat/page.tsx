'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { KrashaqChat } from '@/modules/conversation/components/KrashaqChat';
import { Skeleton } from '@/components/ui/skeleton';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('q') ?? undefined;

  return (
    <MainLayout fullHeight>
      <div className="flex h-full min-h-[calc(100dvh-var(--header-height)-var(--bottom-nav-height))] md:min-h-[calc(100dvh-var(--header-height))] flex-col">
        <KrashaqChat initialPrompt={initialPrompt} />
      </div>
    </MainLayout>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <MainLayout>
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </MainLayout>
        }
      >
        <ChatPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
