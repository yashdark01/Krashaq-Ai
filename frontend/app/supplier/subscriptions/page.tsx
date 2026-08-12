'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UsageMetricGrid } from '@/modules/common/components/analytics/UsageMetricGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, IndianRupee, KeyRound, AlertCircle } from 'lucide-react';

interface Stats {
  active: number;
  trial: number;
  expired: number;
  suspended: number;
  total: number;
  revenue_inr: number;
}

export default function SupplierSubscriptionsPage() {
  const { fetchWithAuth } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchWithAuth('/api/supplier/subscriptions/stats')
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, [fetchWithAuth]);

  return (
    <RoleGuard roles={['supplier']} message="Supplier access required">
      <MainLayout>
        <div className="krashaq-page-padding max-w-4xl mx-auto py-6 space-y-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display">Farmer subscriptions</h1>
              <p className="text-sm text-muted-foreground">
                You purchase a license from Krashaq — then sell subscriptions to your farmers
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/supplier/license">Your Krashaq license →</Link>
            </Button>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 text-sm flex gap-3">
              <KeyRound className="h-5 w-5 shrink-0 text-primary" />
              <p>
                <strong>B2B2C model:</strong> Admin licenses you → you subscription-seat farmers. Each
                farmer needs an active plan to use chat, weather, and alerts.
              </p>
            </CardContent>
          </Card>

          {stats && (
            <UsageMetricGrid
              metrics={[
                { label: 'Active subs', value: stats.active, icon: Users },
                { label: 'Trial', value: stats.trial, icon: Users },
                { label: 'Expired', value: stats.expired, icon: AlertCircle },
                { label: 'Est. revenue', value: `₹${stats.revenue_inr}`, icon: IndianRupee },
              ]}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plans you can sell</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• <strong>Trial</strong> — 14 days free (chat + weather)</p>
              <p>• <strong>Basic</strong> — ₹99 / 30 days</p>
              <p>• <strong>Standard</strong> — ₹249 / 90 days (+ alerts)</p>
              <p>• <strong>Premium</strong> — ₹799 / 365 days (full advisory)</p>
              <Button size="sm" className="mt-2" asChild>
                <Link href="/farmers">Manage farmer subscriptions →</Link>
              </Button>
            </CardContent>
          </Card>

          <Button variant="ghost" asChild>
            <Link href="/supplier">← Supplier hub</Link>
          </Button>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
