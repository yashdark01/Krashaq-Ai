'use client';

import { useEffect, useState } from 'react';
import { SupplierUsagePanel } from '@/modules/supplier/components/SupplierUsagePanel';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SupplierDetail {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  is_active: boolean;
  suspension_reason: string | null;
  farmer_count: number;
  license: {
    plan: string;
    max_farmers: number;
    status: string;
    valid_until: string;
  } | null;
  farmers: Array<{ id: string; name: string; phone: string | null; location: string | null }>;
}

export default function SupplierDetailPanel({ supplierId }: { supplierId: string }) {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspendReason, setSuspendReason] = useState('');
  const [renewDate, setRenewDate] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renewPlan, setRenewPlan] = useState('starter');

  const load = async () => {
    setLoading(true);
    const res = await fetchWithAuth(`/api/admin/suppliers/${supplierId}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [supplierId, fetchWithAuth]);

  const suspend = async () => {
    if (!suspendReason.trim()) return;
    setErrorMsg(null);
    const res = await fetchWithAuth(`/api/admin/suppliers/${supplierId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: suspendReason }),
    });
    if (res.ok) {
      setMessage('Supplier suspended — they cannot log in');
      setSuspendReason('');
      void load();
    } else {
      const d = await res.json();
      setErrorMsg(d.detail || 'Suspend failed');
    }
  };

  const reactivate = async () => {
    setErrorMsg(null);
    const res = await fetchWithAuth(`/api/admin/suppliers/${supplierId}/suspend`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setMessage('Supplier reactivated');
      void load();
    } else {
      const d = await res.json();
      setErrorMsg(d.detail || 'Reactivate failed');
    }
  };

  const renew = async () => {
    if (!renewDate) return;
    setErrorMsg(null);
    const res = await fetchWithAuth(`/api/admin/suppliers/${supplierId}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valid_until: new Date(renewDate).toISOString(),
        plan: renewPlan,
      }),
    });
    if (res.ok) {
      setMessage('License renewed');
      void load();
    } else {
      const d = await res.json();
      setErrorMsg(d.detail || 'Renew failed');
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-destructive">Supplier not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{data.company_name ?? data.name}</h1>
          <p className="text-muted-foreground">{data.email}</p>
        </div>
        <Badge variant={data.is_active ? 'default' : 'destructive'}>
          {data.is_active ? 'Active' : 'Suspended'}
        </Badge>
      </div>

      {message && <p className="text-sm text-primary">{message}</p>}
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">License</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {data.license ? (
              <>
                <p>
                  Plan: <strong className="capitalize">{data.license.plan}</strong> (
                  {data.license.status})
                </p>
                <p>
                  Farmers: {data.farmer_count} / {data.license.max_farmers}
                </p>
                <p>Valid until: {new Date(data.license.valid_until).toLocaleDateString()}</p>
              </>
            ) : (
              <p className="text-muted-foreground">No license on file</p>
            )}
            <div className="pt-2 space-y-2">
              <Label htmlFor="renew-plan">Plan on renew</Label>
              <select
                id="renew-plan"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={renewPlan}
                onChange={(e) => setRenewPlan(e.target.value)}
              >
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <Label htmlFor="renew">Renew until</Label>
              <Input
                id="renew"
                type="date"
                value={renewDate}
                onChange={(e) => setRenewDate(e.target.value)}
              />
              <Button size="sm" onClick={renew} disabled={!renewDate}>
                Renew license
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.is_active ? (
              <>
                <Label htmlFor="reason">Suspension reason</Label>
                <Input
                  id="reason"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Non-payment, terms violation…"
                />
                <Button variant="destructive" size="sm" onClick={suspend}>
                  Suspend supplier
                </Button>
              </>
            ) : (
              <>
                {data.suspension_reason && (
                  <p className="text-sm text-muted-foreground">Reason: {data.suspension_reason}</p>
                )}
                <Button size="sm" onClick={reactivate}>
                  Reactivate supplier
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <SupplierUsagePanel supplierId={supplierId} showFarmerLinks={false} />

      <Button variant="outline" asChild>
        <Link href="/admin/suppliers">← Back to suppliers</Link>
      </Button>
    </div>
  );
}
