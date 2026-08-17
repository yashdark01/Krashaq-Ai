'use client';

import { use } from 'react';
import KbDocumentForm from '@/components/admin/KbDocumentForm';
import { AdminPageShell } from '@/components/admin/AdminPageShell';

export default function AdminKbEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <AdminPageShell>
      <KbDocumentForm documentId={decodeURIComponent(id)} />
    </AdminPageShell>
  );
}
