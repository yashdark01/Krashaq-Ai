'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, MessageSquare, Cloud, Activity } from 'lucide-react';

interface DashboardStats {
  users: {
    total_users: number;
    active_users: number;
    new_users_today: number;
    new_users_week: number;
    new_users_month: number;
    by_role: Record<string, number>;
    by_language: Record<string, number>;
  };
  chat: {
    total_messages: number;
    messages_today: number;
    avg_response_time: number;
    active_sessions: number;
  };
  weather: {
    total_requests: number;
    requests_today: number;
  };
  system: {
    uptime: number;
    memory_usage: number;
    cpu_usage: number;
  };
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading analytics...</div>;
  }

  if (!stats) {
    return <div className="flex justify-center py-8">Failed to load analytics</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <p className="text-muted-foreground">Overview of system performance and usage</p>
      </div>

      {/* User Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.users.total_users}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.users.active_users}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.users.new_users_today}</div>
              <div className="text-sm text-muted-foreground">New Today</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.users.new_users_week}</div>
              <div className="text-sm text-muted-foreground">New This Week</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.users.new_users_month}</div>
              <div className="text-sm text-muted-foreground">New This Month</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Users by Role</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.users.by_role).map(([role, count]) => (
                <div key={role} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                  {role}: {count}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.chat.total_messages}</div>
              <div className="text-sm text-muted-foreground">Total Messages</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.chat.messages_today}</div>
              <div className="text-sm text-muted-foreground">Messages Today</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.chat.avg_response_time.toFixed(2)}s</div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.chat.active_sessions}</div>
              <div className="text-sm text-muted-foreground">Active Sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weather Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.weather.total_requests}</div>
              <div className="text-sm text-muted-foreground">Total Weather Requests</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.weather.requests_today}</div>
              <div className="text-sm text-muted-foreground">Requests Today</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.system.uptime.toFixed(2)}h</div>
              <div className="text-sm text-muted-foreground">System Uptime</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.system.memory_usage.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Memory Usage</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.system.cpu_usage.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">CPU Usage</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
