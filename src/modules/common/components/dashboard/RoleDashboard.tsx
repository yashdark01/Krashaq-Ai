'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, Shield, Sprout, Building2 } from 'lucide-react';

export function RoleDashboard() {
  const { user, isAdmin, isSupplier, isFarmer, fetchWithAuth } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    if (isAdmin()) {
      fetchWithAuth('/api/admin/dashboard')
        .then((r) => r.json())
        .then((d) => {
          setStats({
            users: d.users?.total ?? 0,
            farmers: d.users?.farmers ?? 0,
            suppliers: d.users?.suppliers ?? 0,
            licenses: d.licenses?.active ?? 0,
            sessions: d.sessions?.active ?? 0,
          });
        })
        .catch(() => {});
    } else if (isSupplier()) {
      fetchWithAuth('/api/supplier/dashboard')
        .then((r) => r.json())
        .then((d) =>
          setStats({
            farmers: d.farmer_count ?? 0,
            seats_remaining: d.license?.seats_remaining ?? 0,
          })
        )
        .catch(() => {});
    }
  }, [user, isAdmin, isSupplier, fetchWithAuth]);

  if (isAdmin()) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Suppliers', value: stats.suppliers, icon: Building2, href: '/admin/suppliers' },
          {
            label: 'Active licenses',
            value: stats.licenses,
            icon: Shield,
            href: '/admin/suppliers',
          },
          { label: 'Farmers', value: stats.farmers, icon: Sprout, href: '/admin/suppliers' },
          {
            label: 'Sessions',
            value: stats.sessions,
            icon: MessageSquare,
            href: '/admin/analytics',
          },
        ].map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold">{value ?? '—'}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  if (isSupplier()) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Link href="/supplier">
          <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Supplier hub
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm text-primary font-medium">Open dashboard →</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/farmers">
          <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-3.5 w-3.5" /> My farmers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{stats.farmers ?? '—'}</p>
              {stats.seats_remaining !== undefined && (
                <p className="text-xs text-muted-foreground">{stats.seats_remaining} seats left</p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    );
  }

  if (isFarmer()) {
    return (
      <Card>
        <CardContent className="pt-4 pb-4 px-4 text-sm text-muted-foreground">
          Welcome back, {user?.name}. Check weather below or ask Krashaq about crops, irrigation,
          and schemes.
        </CardContent>
      </Card>
    );
  }

  return null;
}
