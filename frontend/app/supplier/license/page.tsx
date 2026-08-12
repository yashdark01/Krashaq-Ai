'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SupplierLicensePage() {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<{
    license: { plan: string; max_farmers: number; status: string; valid_until: string; features: Record<string, boolean> } | null;
    seats_used: number;
    seats_remaining: number;
  } | null>(null);

  useEffect(() => {
    fetchWithAuth('/api/supplier/license')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [fetchWithAuth]);

  return (
    <RoleGuard roles={['supplier']} message="Supplier access required">
      <MainLayout>
        <div className="krashaq-page-padding max-w-lg mx-auto py-6 space-y-4">
          <h1 className="text-2xl font-bold">Your Krashaq license</h1>
          <p className="text-sm text-muted-foreground">
            Purchased from Krashaq Admin — lets you onboard farmers and resell subscriptions to them
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Krashaq supplier plan</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              {data?.license ? (
                <>
                  <p>
                    Plan:{' '}
                    <Badge variant="outline" className="capitalize ml-1">
                      {data.license.plan}
                    </Badge>
                  </p>
                  <p>Status: <strong className="capitalize">{data.license.status}</strong></p>
                  <p>
                    Farmer seats: {data.seats_used} / {data.license.max_farmers} used (
                    {data.seats_remaining} remaining)
                  </p>
                  <p>Valid until: {new Date(data.license.valid_until).toLocaleDateString()}</p>
                  <div className="pt-2 text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Features</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Farmer alerts: {data.license.features.alerts ? 'Yes' : 'No'}</li>
                      <li>WhatsApp: {data.license.features.whatsapp ? 'Yes' : 'No'}</li>
                      <li>Advanced analytics: {data.license.features.advanced_analytics ? 'Yes' : 'No'}</li>
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No active license. Contact Krashaq support.</p>
              )}
            </CardContent>
          </Card>
          <Button variant="outline" asChild>
            <Link href="/supplier/subscriptions">Sell subscriptions to farmers →</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/supplier">← Back to hub</Link>
          </Button>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
