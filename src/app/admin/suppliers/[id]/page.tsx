'use client';

import { use } from 'react';
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import SupplierDetailPanel from '@/components/admin/SupplierDetailPanel';

export default function AdminSupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <AdminPageShell>
      <SupplierDetailPanel supplierId={id} />
    </AdminPageShell>
  );
}
