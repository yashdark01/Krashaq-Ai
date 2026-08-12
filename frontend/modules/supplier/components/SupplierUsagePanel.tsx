'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UsageMetricGrid } from '@/modules/common/components/analytics/UsageMetricGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Users,
  Bell,
  KeyRound,
  Activity,
  BarChart3,
} from 'lucide-react';

interface SupplierUsageData {
  summary: {
    farmer_count: number;
    active_farmers_7d: number;
    chat_sessions: number;
    total_messages: number;
    messages_7d: number;
    messages_30d: number;
    alerts_total: number;
    alerts_enabled: number;
    seat_utilization_pct: number;
  };
  subscription: {
    plan: string;
    status: string;
    max_farmers: number;
    valid_until: string;
    days_until_expiry: number;
  } | null;
  subscription_stats?: {
    active: number;
    trial: number;
    expired: number;
    revenue_inr: number;
  };
  farmers: Array<{
    farmer_id: string;
    name: string;
    phone: string | null;
    chat_sessions: number;
    total_messages: number;
    messages_7d: number;
    active_7d: boolean;
    last_active_at: string | null;
  }>;
}

interface SupplierUsagePanelProps {
  supplierId?: string;
  apiPath?: string;
  showFarmerLinks?: boolean;
}

export function SupplierUsagePanel({
  supplierId,
  apiPath,
  showFarmerLinks = true,
}: SupplierUsagePanelProps) {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<SupplierUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const path =
    apiPath ?? (supplierId ? `/api/admin/suppliers/${supplierId}/usage` : '/api/supplier/analytics');

  useEffect(() => {
    setLoading(true);
    fetchWithAuth(path)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [fetchWithAuth, path]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading usage analytics…</p>;
  if (!data) return <p className="text-sm text-destructive">Could not load usage data</p>;

  const { summary, subscription, subscription_stats, farmers } = data;

  return (
    <div className="space-y-6">
      <UsageMetricGrid
        metrics={[
          {
            label: 'Farmers',
            value: summary.farmer_count,
            hint: subscription ? `${summary.seat_utilization_pct}% seat usage` : undefined,
            icon: Users,
          },
          {
            label: 'Active farmers (7d)',
            value: summary.active_farmers_7d,
            hint: 'Chatted in last 7 days',
            icon: Activity,
          },
          {
            label: 'Chat messages',
            value: summary.total_messages,
            hint: `${summary.messages_7d} this week · ${summary.messages_30d} this month`,
            icon: MessageSquare,
          },
          {
            label: 'Alerts enabled',
            value: summary.alerts_enabled,
            hint: `${summary.alerts_total} total schedules`,
            icon: Bell,
          },
        ]}
      />

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> License (purchased from Admin)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Plan: <strong className="capitalize">{subscription.plan}</strong>{' '}
              <Badge variant="outline" className="ml-1 capitalize">
                {subscription.status}
              </Badge>
            </p>
            <p>
              Seats: {summary.farmer_count} / {subscription.max_farmers} farmers (
              {summary.seat_utilization_pct}%)
            </p>
            <p>
              Valid until: {new Date(subscription.valid_until).toLocaleDateString()} (
              {subscription.days_until_expiry >= 0
                ? `${subscription.days_until_expiry} days left`
                : 'expired'}
              )
            </p>
            {subscription_stats && (
              <p className="pt-2 border-t text-muted-foreground">
                Farmer subscriptions sold: {subscription_stats.active} active ·{' '}
                {subscription_stats.trial} trial · est. ₹{subscription_stats.revenue_inr} revenue
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Farmer activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {farmers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No farmers registered yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Farmer</th>
                    <th className="px-3 py-2 text-left">Sessions</th>
                    <th className="px-3 py-2 text-left">Messages</th>
                    <th className="px-3 py-2 text-left">7d</th>
                    <th className="px-3 py-2 text-left">Last active</th>
                    {showFarmerLinks && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {farmers.map((f) => (
                    <tr key={f.farmer_id} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-muted-foreground">{f.phone ?? '—'}</div>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{f.chat_sessions}</td>
                      <td className="px-3 py-2 tabular-nums">{f.total_messages}</td>
                      <td className="px-3 py-2">
                        <Badge variant={f.active_7d ? 'default' : 'outline'}>
                          {f.messages_7d}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {f.last_active_at
                          ? new Date(f.last_active_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      {showFarmerLinks && (
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/supplier/farmers/${f.farmer_id}`}>Details</Link>
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
