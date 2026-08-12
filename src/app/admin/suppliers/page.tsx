'use client';

import { AdminPageShell } from '@/components/admin/AdminPageShell';
import SupplierList from '@/components/admin/SupplierList';

export default function AdminSuppliersPage() {
  return (
    <AdminPageShell>
      <SupplierList />
    </AdminPageShell>
  );
}
