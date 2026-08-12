'use client';

import { ReactNode } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MainLayout } from '@/components/layout/MainLayout';

export function AdminPageShell({ children }: { children: ReactNode }) {
  return (
    <RoleGuard roles={['admin']} message="Admin access required">
      <MainLayout>
        <div className="krashaq-page-padding max-w-6xl mx-auto py-6">{children}</div>
      </MainLayout>
    </RoleGuard>
  );
}
