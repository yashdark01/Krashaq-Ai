'use client';

import KbDocumentList from '@/components/admin/KbDocumentList';
import { AdminPageShell } from '@/components/admin/AdminPageShell';

export default function AdminKbPage() {
  return (
    <AdminPageShell>
      <KbDocumentList />
    </AdminPageShell>
  );
}
