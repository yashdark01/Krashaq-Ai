'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import SystemHealth from '@/components/admin/SystemHealth';

export default function AdminHealthPage() {
  return (
    <RoleGuard roles={['admin']} message="Admin access required">
      <div className="container mx-auto py-8">
        <SystemHealth />
      </div>
    </RoleGuard>
  );
}
