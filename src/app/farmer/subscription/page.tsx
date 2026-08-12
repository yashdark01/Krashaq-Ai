'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeyRound, Building2, CheckCircle2 } from 'lucide-react';

interface SubscriptionData {
  subscription: {
    plan: string;
    status: string;
    valid_from: string;
    valid_until: string;
    price_inr: number;
    features: Record<string, boolean>;
  } | null;
  supplier: { id: string; name: string } | null;
}

export default function FarmerSubscriptionPage() {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/api/farmer/subscription')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [fetchWithAuth]);

  const sub = data?.subscription;

  return (
    <RoleGuard roles={['farmer']} message="Farmer access required">
      <MainLayout>
        <div className="krashaq-page-padding max-w-lg mx-auto py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-display">My subscription</h1>
            <p className="text-sm text-muted-foreground">
              Your Krashaq access is provided by your supplier
            </p>
          </div>

          {data?.supplier && (
            <Card>
              <CardContent className="pt-4 flex items-center gap-3 text-sm">
                <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">{data.supplier.name}</p>
                  <p className="text-muted-foreground text-xs">Your licensed supplier</p>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !sub ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No active subscription. Ask your supplier to assign a plan.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Current plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>
                    Plan: <strong className="capitalize">{sub.plan}</strong>{' '}
                    <Badge variant="outline" className="ml-1 capitalize">
                      {sub.status}
                    </Badge>
                  </p>
                  {sub.price_inr > 0 && (
                    <p>
                      Price: <strong>₹{sub.price_inr}</strong>
                    </p>
                  )}
                  <p>Valid until: {new Date(sub.valid_until).toLocaleDateString()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Included features</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {Object.entries(sub.features).map(([key, enabled]) => (
                    <p key={key} className="flex items-center gap-2 capitalize">
                      <CheckCircle2
                        className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground/40'}`}
                      />
                      {key.replace(/_/g, ' ')}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          <Button variant="ghost" asChild>
            <Link href="/">← Back to dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
