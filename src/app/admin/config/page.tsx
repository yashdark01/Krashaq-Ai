'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import ConfigPanel from '@/components/admin/ConfigPanel';

export default function AdminConfigPage() {
  return (
    <RoleGuard roles={['admin']} message="Admin access required">
      <div className="container mx-auto py-8">
        <ConfigPanel />
      </div>
    </RoleGuard>
  );
}
