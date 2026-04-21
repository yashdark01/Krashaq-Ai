'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Settings, FileText, Shield, Clock } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Total Users',
      value: '0',
      description: 'Registered users',
      icon: Users,
      href: '/admin/users',
    },
    {
      title: 'System Config',
      value: 'Active',
      description: 'Configuration status',
      icon: Settings,
      href: '/admin/config',
    },
    {
      title: 'Scheduler',
      value: 'Configure',
      description: 'Message scheduling',
      icon: Clock,
      href: '/admin/scheduler',
    },
    {
      title: 'Audit Logs',
      value: 'View',
      description: 'Admin activity logs',
      icon: FileText,
      href: '/admin/audit',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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
            Admin Privileges
          </CardTitle>
          <CardDescription>
            You have full administrative access to user management, configuration, and audit logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Manage user accounts and roles</p>
            <p>• View and modify system configuration</p>
            <p>• Access audit logs for security monitoring</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
