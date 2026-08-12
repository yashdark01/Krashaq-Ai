'use client';

import AdminDashboard from '@/components/admin/AdminDashboard';
import { AdminPageShell } from '@/components/admin/AdminPageShell';

export default function AdminPage() {
  return (
    <AdminPageShell>
      <AdminDashboard />
    </AdminPageShell>
  );
}
