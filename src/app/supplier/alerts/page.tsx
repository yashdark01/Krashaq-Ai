'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AlertRow {
  id: string;
  name: string;
  alert_type: string;
  enabled: boolean;
  channel: string;
  schedule: { hour: number; minute: number; frequency: string };
  target: { mode: string; farmer_ids?: string[] };
  last_run_at?: string | null;
}

interface FarmerOption {
  id: string;
  name: string;
}

export default function SupplierAlertsPage() {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<AlertRow[]>([]);
  const [farmers, setFarmers] = useState<FarmerOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    alert_type: 'weather',
    hour: 7,
    minute: 0,
    mode: 'all_farmers',
  });

  const load = () =>
    fetchWithAuth('/api/supplier/alerts')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));

  useEffect(() => {
    void load();
    fetchWithAuth('/api/farmers')
      .then((r) => r.json())
      .then((data: FarmerOption[]) => setFarmers(data))
      .catch(() => {});
  }, [fetchWithAuth]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.mode === 'selected' && selectedFarmerIds.length === 0) {
      alert('Select at least one farmer');
      return;
    }
    const res = await fetchWithAuth('/api/supplier/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        alert_type: form.alert_type,
        schedule: {
          frequency: 'daily',
          hour: form.hour,
          minute: form.minute,
          timezone: 'Asia/Kolkata',
        },
        target:
          form.mode === 'selected'
            ? { mode: 'selected', farmer_ids: selectedFarmerIds }
            : { mode: 'all_farmers' },
        channel: 'in_app',
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: '', alert_type: 'weather', hour: 7, minute: 0, mode: 'all_farmers' });
      setSelectedFarmerIds([]);
      void load();
    }
  };

  const toggle = async (id: string, enabled: boolean) => {
    await fetchWithAuth(`/api/supplier/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    void load();
  };

  const runNow = async (id: string) => {
    const res = await fetchWithAuth(`/api/supplier/alerts/${id}/run`, { method: 'POST' });
    if (res.ok) {
      const d = await res.json();
      alert(`Sent ${d.notifications_sent} notification(s) to farmers`);
      void load();
    }
  };

  const toggleFarmer = (id: string) => {
    setSelectedFarmerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <RoleGuard roles={['supplier']} message="Supplier access required">
      <MainLayout>
        <div className="krashaq-page-padding max-w-3xl mx-auto py-6 space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold">Farmer alerts</h1>
              <p className="text-sm text-muted-foreground">
                Schedules deliver in-app notifications to farmers (hourly cron + Run now)
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'New alert'}
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create alert schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={create} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Morning weather update"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={form.alert_type}
                        onChange={(e) => setForm({ ...form, alert_type: e.target.value })}
                      >
                        <option value="weather">Weather</option>
                        <option value="custom">Custom message</option>
                        <option value="irrigation">Irrigation</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={form.mode}
                        onChange={(e) => setForm({ ...form, mode: e.target.value })}
                      >
                        <option value="all_farmers">All my farmers</option>
                        <option value="selected">Selected farmers</option>
                      </select>
                    </div>
                  </div>

                  {form.mode === 'selected' && (
                    <div className="space-y-2 rounded-lg border p-3 max-h-40 overflow-y-auto">
                      <Label>Select farmers</Label>
                      {farmers.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No farmers registered yet</p>
                      ) : (
                        farmers.map((f) => (
                          <label
                            key={f.id}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFarmerIds.includes(f.id)}
                              onChange={() => toggleFarmer(f.id)}
                            />
                            {f.name}
                          </label>
                        ))
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Hour (IST)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={form.hour}
                        onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Minute</Label>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={form.minute}
                        onChange={(e) => setForm({ ...form, minute: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button type="submit">Save schedule</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts scheduled yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((a) => (
                <Card key={a.id}>
                  <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {a.alert_type} · {a.schedule.frequency} at{' '}
                        {String(a.schedule.hour).padStart(2, '0')}:
                        {String(a.schedule.minute).padStart(2, '0')} ·{' '}
                        {a.target.mode === 'selected'
                          ? `${a.target.farmer_ids?.length ?? 0} farmers`
                          : 'all farmers'}{' '}
                        · {a.channel}
                      </p>
                      {a.last_run_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last run: {new Date(a.last_run_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={a.enabled ? 'default' : 'outline'}>
                        {a.enabled ? 'On' : 'Off'}
                      </Badge>
                      <Button size="sm" variant="secondary" onClick={() => runNow(a.id)}>
                        Run now
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggle(a.id, a.enabled)}>
                        {a.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button variant="ghost" asChild>
            <Link href="/supplier">← Supplier dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
