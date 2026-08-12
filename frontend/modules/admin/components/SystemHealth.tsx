'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SystemHealthStatus {
  mongodb: {
    status: 'healthy' | 'unhealthy';
    latency: number;
  };
  redis: {
    status: 'healthy' | 'unhealthy';
    latency: number;
  };
  llm_provider: {
    status: 'healthy' | 'unhealthy';
    latency: number;
    provider: string;
  };
  twilio: {
    status: 'healthy' | 'unhealthy';
    latency: number;
  };
}

export default function SystemHealth() {
  const { fetchWithAuth } = useAuth();
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetchWithAuth('/api/admin/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'unhealthy':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading system health...</div>;
  }

  if (!health) {
    return <div className="flex justify-center py-8">Failed to load system health</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Health</h2>
        <p className="text-muted-foreground">Real-time status of system components</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* MongoDB */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {getStatusIcon(health.mongodb.status)}
              MongoDB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`px-3 py-1 rounded-full text-sm inline-block ${getStatusColor(health.mongodb.status)}`}>
                {health.mongodb.status}
              </div>
              <div className="text-sm text-muted-foreground">
                Latency: {health.mongodb.latency}ms
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {getStatusIcon(health.redis.status)}
              Redis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`px-3 py-1 rounded-full text-sm inline-block ${getStatusColor(health.redis.status)}`}>
                {health.redis.status}
              </div>
              <div className="text-sm text-muted-foreground">
                Latency: {health.redis.latency}ms
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LLM Provider */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {getStatusIcon(health.llm_provider.status)}
              LLM Provider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`px-3 py-1 rounded-full text-sm inline-block ${getStatusColor(health.llm_provider.status)}`}>
                {health.llm_provider.status}
              </div>
              <div className="text-sm text-muted-foreground">
                {health.llm_provider.provider}
              </div>
              <div className="text-sm text-muted-foreground">
                Latency: {health.llm_provider.latency}ms
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Twilio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {getStatusIcon(health.twilio.status)}
              Twilio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`px-3 py-1 rounded-full text-sm inline-block ${getStatusColor(health.twilio.status)}`}>
                {health.twilio.status}
              </div>
              <div className="text-sm text-muted-foreground">
                Latency: {health.twilio.latency}ms
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle>Overall System Status</CardTitle>
          <CardDescription>
            All components are operating normally if all statuses show as healthy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {Object.values(health).every((component) => component.status === 'healthy') ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span className="text-lg font-semibold text-green-600">All Systems Operational</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-yellow-500" />
                <span className="text-lg font-semibold text-yellow-600">Some Systems Degraded</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
