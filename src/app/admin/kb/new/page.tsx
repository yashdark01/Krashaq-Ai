'use client';

import KbDocumentForm from '@/components/admin/KbDocumentForm';
import { AdminPageShell } from '@/components/admin/AdminPageShell';

export default function AdminKbNewPage() {
  return (
    <AdminPageShell>
      <KbDocumentForm />
    </AdminPageShell>
  );
}
