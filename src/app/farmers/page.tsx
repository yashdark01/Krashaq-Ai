'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/contexts/AuthContext';
import FarmerForm from '@/components/FarmerForm';
import FarmerEditForm from '@/modules/farmers/components/FarmerEditForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/modules/common/components/states/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface Farmer {
  id: string;
  name: string;
  phone: string;
  location: string | null;
  supplier_id?: string | null;
  subscription?: {
    plan: string;
    status: string;
    valid_until: string;
    price_inr: number;
  } | null;
}

export default function FarmersPage() {
  const { fetchWithAuth, isSupplier } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<{
    seats_used: number;
    seats_remaining: number;
    max_farmers: number;
    status: string;
  } | null>(null);

  const fetchFarmers = async () => {
    try {
      const res = await fetchWithAuth('/api/farmers');
      if (!res.ok) throw new Error('Failed to fetch farmers');
      const data = await res.json();
      setFarmers(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch farmers';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
    if (isSupplier()) {
      fetchWithAuth('/api/supplier/license')
        .then((r) => r.json())
        .then((d) => {
          if (d.license) {
            setLicenseInfo({
              seats_used: d.seats_used,
              seats_remaining: d.seats_remaining,
              max_farmers: d.license.max_farmers,
              status: d.license.status,
            });
          }
        })
        .catch(() => {});
    }
  }, [fetchWithAuth, isSupplier]);

  const handleFarmerAdded = (farmer: Farmer) => {
    setFarmers((prev) => [...prev, farmer]);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this farmer?')) return;

    try {
      const res = await fetchWithAuth(`/api/farmers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setFarmers((prev) => prev.filter((f) => f.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      alert(message);
    }
  };

  return (
    <RoleGuard roles={['supplier']} message="Supplier access required">
      <MainLayout>
        <div className="krashaq-page-padding mx-auto max-w-4xl space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-label mb-1">Manage</p>
              <h1 className="font-display text-2xl font-bold">My farmers</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Farmers linked to your supplier license
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/supplier">← Supplier hub</Link>
            </Button>
          </header>

          {licenseInfo && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                licenseInfo.seats_remaining === 0
                  ? 'border-destructive/40 bg-destructive/10 text-destructive'
                  : 'border-border bg-muted/30 text-muted-foreground'
              }`}
            >
              License: <strong className="capitalize">{licenseInfo.status}</strong> ·{' '}
              {licenseInfo.seats_used} / {licenseInfo.max_farmers} farmer seats used
              {licenseInfo.seats_remaining === 0 && ' — upgrade required to add more'}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <CardTitle className="text-lg">Registered Farmers</CardTitle>
              <Button
                size="sm"
                onClick={() => setShowForm(!showForm)}
                disabled={licenseInfo?.seats_remaining === 0}
              >
                {showForm ? 'Cancel' : '+ Add Farmer'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showForm && (
                <div className="rounded-lg border border-border bg-secondary/50 p-4">
                  <FarmerForm onFarmerAdded={handleFarmerAdded} />
                </div>
              )}

              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : farmers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No farmers yet"
                  description='Click "Add Farmer" to register your first farmer.'
                  actionLabel="Add Farmer"
                  onAction={() => licenseInfo?.seats_remaining !== 0 && setShowForm(true)}
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/80">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Phone
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Subscription
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {farmers.map((farmer) => (
                        <tr key={farmer.id} className="hover:bg-secondary/40 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            {editingId === farmer.id ? (
                              <FarmerEditForm
                                farmer={farmer}
                                onSaved={(updated) => {
                                  setFarmers((prev) =>
                                    prev.map((f) => (f.id === updated.id ? updated : f))
                                  );
                                  setEditingId(null);
                                }}
                                onCancel={() => setEditingId(null)}
                              />
                            ) : (
                              farmer.name
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{farmer.phone}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {farmer.location || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {farmer.subscription ? (
                              <Badge variant="outline" className="capitalize text-xs">
                                {farmer.subscription.plan} · {farmer.subscription.status}
                              </Badge>
                            ) : (
                              <span className="text-xs text-destructive">No plan</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            {editingId !== farmer.id && (
                              <>
                                <Button variant="ghost" size="sm" className="h-8" asChild>
                                  <Link href={`/supplier/farmers/${farmer.id}`}>Analytics</Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => setEditingId(farmer.id)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(farmer.id)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Farmers can also register via WhatsApp by messaging the Krashaq bot.
          </p>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
