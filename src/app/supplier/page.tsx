'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Bell, KeyRound, MessageSquare, BarChart3 } from 'lucide-react';

interface SupplierDashboard {
  farmer_count: number;
  license: {
    plan: string;
    max_farmers: number;
    status: string;
    valid_until: string;
    seats_used: number;
    seats_remaining: number;
  } | null;
}

export default function SupplierHubPage() {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<SupplierDashboard | null>(null);

  useEffect(() => {
    fetchWithAuth('/api/supplier/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [fetchWithAuth]);

  return (
    <RoleGuard roles={['supplier']} message="Supplier access required">
      <MainLayout>
        <div className="krashaq-page-padding max-w-4xl mx-auto py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-display">Supplier dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage your farmers, alerts, and license usage
            </p>
          </div>

          {data?.license && data.license.seats_remaining <= 3 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              You are near your farmer seat limit ({data.license.seats_used} /{' '}
              {data.license.max_farmers}). Contact Krashaq to upgrade.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/farmers">
              <Card className="hover:bg-accent/50 transition-colors h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" /> My farmers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data?.farmer_count ?? '—'}</p>
                  {data?.license && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.license.seats_remaining} seats remaining
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Link href="/supplier/subscriptions">
              <Card className="hover:bg-accent/50 transition-colors h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> Farmer subscriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">Sell plans to farmers →</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/supplier/analytics">
              <Card className="hover:bg-accent/50 transition-colors h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Farmer analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">Usage & engagement →</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/supplier/alerts">
              <Card className="hover:bg-accent/50 transition-colors h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4" /> Farmer alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">Schedule weather & reminders →</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/chat">
              <Card className="hover:bg-accent/50 transition-colors h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Krashaq AI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Open chat assistant</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/supplier/license">
              <Card className="hover:bg-accent/50 transition-colors h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> License
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.license ? (
                    <Badge variant="outline" className="capitalize">
                      {data.license.plan} · {data.license.status}
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">No license</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
