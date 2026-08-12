'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import SchedulerConfigPanel from '@/components/admin/SchedulerConfigPanel';

export default function AdminSchedulerPage() {
  return (
    <RoleGuard roles={['admin']} message="Admin access required">
      <div className="container mx-auto py-8">
        <SchedulerConfigPanel />
      </div>
    </RoleGuard>
  );
}
