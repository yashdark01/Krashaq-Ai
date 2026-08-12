'use client';

import { AdminPageShell } from '@/components/admin/AdminPageShell';
import UserList from '@/components/admin/UserList';
import Link from 'next/link';

export default function AdminUsersPage() {
  return (
    <AdminPageShell>
      <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        Supplier accounts are managed separately.{' '}
        <Link href="/admin/suppliers" className="text-primary underline">
          Go to Suppliers →
        </Link>
      </div>
      <UserList />
    </AdminPageShell>
  );
}
