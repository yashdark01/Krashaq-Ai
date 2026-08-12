'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Settings, FileText, Shield, Building2, KeyRound, Sprout } from 'lucide-react';

interface DashboardStats {
  users?: {
    total?: number;
    farmers?: number;
    suppliers?: number;
    admins?: number;
    suspended_suppliers?: number;
  };
  licenses?: { active?: number };
  sessions?: { active?: number; chat_sessions?: number };
}

export default function AdminDashboard() {
  const { user, fetchWithAuth } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/api/admin/dashboard')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchWithAuth]);

  const cards = [
    {
      title: 'Suppliers',
      value: loading ? '—' : String(stats?.users?.suppliers ?? 0),
      description: `${stats?.licenses?.active ?? 0} active licenses`,
      icon: Building2,
      href: '/admin/suppliers',
    },
    {
      title: 'Farmers',
      value: loading ? '—' : String(stats?.users?.farmers ?? 0),
      description: 'Across all suppliers',
      icon: Sprout,
      href: '/admin/suppliers',
    },
    {
      title: 'Users & admins',
      value: loading ? '—' : String(stats?.users?.total ?? 0),
      description: 'Non-supplier accounts',
      icon: Users,
      href: '/admin/users',
    },
    {
      title: 'Analytics',
      value: 'View',
      description: 'LLM usage & platform stats',
      icon: FileText,
      href: '/admin/analytics',
    },
    {
      title: 'System config',
      value: 'Manage',
      description: 'LLM, email, weather keys',
      icon: Settings,
      href: '/admin/config',
    },
    {
      title: 'Suspended',
      value: loading ? '—' : String(stats?.users?.suspended_suppliers ?? 0),
      description: 'Suppliers blocked',
      icon: KeyRound,
      href: '/admin/suppliers',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform owner view — welcome, {user?.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Platform responsibilities
          </CardTitle>
          <CardDescription>
            You license suppliers; suppliers manage their own farmers and alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Onboard suppliers and issue licenses from Suppliers</p>
          <p>• Suspend clients who violate terms or miss renewal</p>
          <p>• Monitor AI usage, health, and audit logs</p>
        </CardContent>
      </Card>
    </div>
  );
}
