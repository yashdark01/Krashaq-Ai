'use client';

import { use } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { KrashaqChat } from '@/modules/conversation/components/KrashaqChat';

export default function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <ProtectedRoute>
      <MainLayout fullHeight>
        <div className="flex h-full min-h-[calc(100dvh-var(--header-height)-var(--bottom-nav-height))] md:min-h-[calc(100dvh-var(--header-height))] flex-col">
          <KrashaqChat sessionId={sessionId} />
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
