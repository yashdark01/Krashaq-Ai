'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';

interface SupplierRow {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  is_active: boolean;
  farmer_count: number;
  license: {
    plan: string;
    max_farmers: number;
    status: string;
    valid_until: string;
  } | null;
}

export default function SupplierList() {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/suppliers');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [fetchWithAuth]);

  const filtered = items.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.company_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Licensed clients who manage their farmers</p>
        </div>
        <Button asChild>
          <Link href="/admin/suppliers/new">
            <Plus className="h-4 w-4 mr-1" /> Onboard supplier
          </Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search suppliers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading suppliers…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No suppliers yet.{' '}
            <Link href="/admin/suppliers/new" className="text-primary underline">
              Onboard your first client
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2">Company / Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">License</th>
                <th className="px-4 py-2">Farmers</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.company_name ?? s.name}</div>
                    {s.company_name && (
                      <div className="text-xs text-muted-foreground">{s.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3">
                    {s.license ? (
                      <Badge variant="outline" className="capitalize">
                        {s.license.plan} · {s.license.status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {s.farmer_count}
                    {s.license ? ` / ${s.license.max_farmers}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.is_active ? 'default' : 'destructive'}>
                      {s.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/suppliers/${s.id}`}>Manage</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
