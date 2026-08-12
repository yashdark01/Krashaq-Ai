'use client';

import { AdminPageShell } from '@/components/admin/AdminPageShell';
import SupplierOnboardForm from '@/components/admin/SupplierOnboardForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminSupplierNewPage() {
  return (
    <AdminPageShell>
      <div className="space-y-4 max-w-lg">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/suppliers">← Suppliers</Link>
        </Button>
        <SupplierOnboardForm />
      </div>
    </AdminPageShell>
  );
}
