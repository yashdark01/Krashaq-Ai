'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import FarmerEditForm from '@/modules/farmers/components/FarmerEditForm';
import { FarmerSubscriptionPanel } from '@/modules/supplier/components/FarmerSubscriptionPanel';
import { UsageMetricGrid } from '@/modules/common/components/analytics/UsageMetricGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Activity, Calendar, MapPin } from 'lucide-react';

interface FarmerDetail {
  id: string;
  name: string;
  phone: string;
  location: string | null;
}

interface FarmerAnalytics {
  farmer_id: string;
  name: string;
  phone: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string | null;
  chat_sessions: number;
  total_messages: number;
  messages_7d: number;
  messages_30d: number;
  last_active_at: string | null;
  active_7d: boolean;
}

export default function SupplierFarmerDetailPage() {
  const params = useParams();
  const farmerId = params.id as string;
  const { fetchWithAuth } = useAuth();
  const [farmer, setFarmer] = useState<FarmerDetail | null>(null);
  const [analytics, setAnalytics] = useState<FarmerAnalytics | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [farmerRes, analyticsRes] = await Promise.all([
        fetchWithAuth(`/api/farmers/${farmerId}`),
        fetchWithAuth(`/api/supplier/farmers/${farmerId}/analytics`),
      ]);
      if (farmerRes.ok) setFarmer(await farmerRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [farmerId, fetchWithAuth]);

  if (loading) {
    return (
      <RoleGuard roles={['supplier']}>
        <MainLayout>
          <p className="p-6 text-muted-foreground">Loading farmer…</p>
        </MainLayout>
      </RoleGuard>
    );
  }

  if (!farmer || !analytics) {
    return (
      <RoleGuard roles={['supplier']}>
        <MainLayout>
          <p className="p-6 text-destructive">Farmer not found</p>
        </MainLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard roles={['supplier']} message="Supplier access required">
      <MainLayout>
        <div className="krashaq-page-padding max-w-3xl mx-auto py-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{farmer.name}</h1>
              <p className="text-sm text-muted-foreground">{farmer.phone}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant={analytics.is_active ? 'default' : 'destructive'}>
                {analytics.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                {editing ? 'Cancel edit' : 'Edit'}
              </Button>
            </div>
          </div>

          {editing ? (
            <FarmerEditForm
              farmer={farmer}
              onSaved={(updated) => {
                setFarmer(updated);
                setEditing(false);
                void load();
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <Card>
              <CardContent className="pt-4 text-sm space-y-1">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {farmer.location || 'No location set'}
                </p>
                {analytics.created_at && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {new Date(analytics.created_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <FarmerSubscriptionPanel farmerId={farmerId} />

          <UsageMetricGrid
            metrics={[
              {
                label: 'Chat sessions',
                value: analytics.chat_sessions,
                icon: MessageSquare,
              },
              {
                label: 'Total messages',
                value: analytics.total_messages,
                hint: `${analytics.messages_7d} this week`,
                icon: MessageSquare,
              },
              {
                label: 'Messages (30d)',
                value: analytics.messages_30d,
                icon: Activity,
              },
              {
                label: 'Last active',
                value: analytics.last_active_at
                  ? new Date(analytics.last_active_at).toLocaleDateString()
                  : 'Never',
                hint: analytics.active_7d ? 'Active this week' : 'Inactive this week',
                icon: Activity,
              },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Engagement summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                This farmer has sent {analytics.total_messages} messages across{' '}
                {analytics.chat_sessions} chat session{analytics.chat_sessions !== 1 ? 's' : ''}.
              </p>
              <p>
                {analytics.active_7d
                  ? 'They were active in the last 7 days — good engagement.'
                  : 'No chat activity in the last 7 days — consider sending a reminder alert.'}
              </p>
              <Button size="sm" asChild>
                <Link href="/chat">Open Krashaq chat (as supplier)</Link>
              </Button>
            </CardContent>
          </Card>

          <Button variant="ghost" asChild>
            <Link href="/farmers">← Back to farmers</Link>
          </Button>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
