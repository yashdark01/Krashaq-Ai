'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export default function FarmerNotificationsPage() {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = () =>
    fetchWithAuth('/api/farmer/notifications?limit=100')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));

  useEffect(() => {
    void load();
  }, [fetchWithAuth]);

  const markAll = async () => {
    await fetchWithAuth('/api/farmer/notifications', { method: 'PATCH' });
    void load();
  };

  return (
    <RoleGuard roles={['farmer', 'supplier', 'admin']}>
      <MainLayout>
        <div className="krashaq-page-padding max-w-lg mx-auto py-6 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Notifications</h1>
            <Button variant="outline" size="sm" onClick={() => void markAll()}>
              Mark all read
            </Button>
          </div>

          {items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No notifications yet. Supplier alerts will appear here.
              </CardContent>
            </Card>
          ) : (
            items.map((n) => (
              <Card key={n.id} className={n.read ? 'opacity-80' : 'border-primary/30'}>
                <CardContent className="pt-4 space-y-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium text-sm">{n.title}</p>
                    {!n.read && <Badge variant="default">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}

          <Button variant="ghost" asChild>
            <Link href="/">← Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
