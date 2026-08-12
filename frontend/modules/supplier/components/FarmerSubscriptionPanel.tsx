'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Subscription {
  plan: string;
  status: string;
  valid_until: string;
  price_inr: number;
}

const PLANS = [
  { id: 'trial', label: 'Trial (14 days, free)', days: 14 },
  { id: 'basic', label: 'Basic — ₹99 / 30 days', days: 30 },
  { id: 'standard', label: 'Standard — ₹249 / 90 days', days: 90 },
  { id: 'premium', label: 'Premium — ₹799 / 365 days', days: 365 },
];

export function FarmerSubscriptionPanel({ farmerId }: { farmerId: string }) {
  const { fetchWithAuth } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState('basic');
  const [renewDate, setRenewDate] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetchWithAuth(`/api/supplier/farmers/${farmerId}/subscription`)
      .then((r) => r.json())
      .then((d) => setSubscription(d.subscription));

  useEffect(() => {
    void load();
  }, [farmerId, fetchWithAuth]);

  const issueOrRenew = async () => {
    setError(null);
    setMessage(null);
    const validUntil = renewDate
      ? new Date(renewDate).toISOString()
      : new Date(Date.now() + (PLANS.find((p) => p.id === plan)?.days ?? 30) * 86400000).toISOString();

    const method = subscription ? 'PATCH' : 'POST';
    const res = await fetchWithAuth(`/api/supplier/farmers/${farmerId}/subscription`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, valid_until: validUntil }),
    });
    if (res.ok) {
      setMessage(subscription ? 'Subscription renewed' : 'Subscription issued');
      void load();
    } else {
      const d = await res.json();
      setError(d.detail || 'Failed');
    }
  };

  const suspend = async (reactivate = false) => {
    setError(null);
    const res = await fetchWithAuth(
      `/api/supplier/farmers/${farmerId}/subscription${reactivate ? '?reactivate=1' : ''}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      setMessage(reactivate ? 'Subscription reactivated' : 'Subscription suspended');
      void load();
    } else {
      const d = await res.json();
      setError(d.detail || 'Failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Farmer subscription</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {message && <p className="text-primary">{message}</p>}
        {error && <p className="text-destructive">{error}</p>}

        {subscription ? (
          <div className="space-y-1">
            <p>
              Plan: <strong className="capitalize">{subscription.plan}</strong>{' '}
              <Badge variant="outline" className="capitalize ml-1">
                {subscription.status}
              </Badge>
            </p>
            <p>Price: ₹{subscription.price_inr}</p>
            <p>Valid until: {new Date(subscription.valid_until).toLocaleDateString()}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">No subscription — farmer cannot log in until you issue one.</p>
        )}

        <div className="space-y-2 border-t pt-4">
          <Label>Plan to sell</Label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            {PLANS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <Label htmlFor="sub-until">Valid until (optional)</Label>
          <Input id="sub-until" type="date" value={renewDate} onChange={(e) => setRenewDate(e.target.value)} />
          <Button size="sm" onClick={issueOrRenew}>
            {subscription ? 'Renew subscription' : 'Issue subscription'}
          </Button>
        </div>

        {subscription && (
          <div className="flex gap-2">
            {subscription.status === 'suspended' ? (
              <Button size="sm" variant="outline" onClick={() => suspend(true)}>
                Reactivate
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => suspend(false)}>
                Suspend subscription
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
