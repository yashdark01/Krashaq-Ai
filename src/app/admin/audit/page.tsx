'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import AuditLogView from '@/components/admin/AuditLogView';

export default function AdminAuditPage() {
  return (
    <RoleGuard roles={['admin']} message="Admin access required">
      <div className="container mx-auto py-8">
        <AuditLogView />
      </div>
    </RoleGuard>
  );
}
