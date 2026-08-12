'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play } from 'lucide-react';

interface RunnerStatus {
  job: {
    id: string;
    job_name: string;
    enabled: boolean;
    last_run_at: string | null;
    last_result: {
      alerts_processed: number;
      notifications_sent: number;
      skipped_no_subscription: number;
      errors: string[];
    } | null;
  };
  recent_deliveries: Array<{
    id: string;
    channel: string;
    status: string;
    created_at: string;
  }>;
}

export default function SchedulerConfigPanel() {
  const { fetchWithAuth } = useAuth();
  const [status, setStatus] = useState<RunnerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = () =>
    fetchWithAuth('/api/admin/alerts/run')
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, [fetchWithAuth]);

  const trigger = async () => {
    setRunning(true);
    try {
      const res = await fetchWithAuth('/api/admin/alerts/run', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        alert(
          `Delivered ${result.notifications_sent} notification(s) from ${result.alerts_processed} alert(s)`
        );
        void load();
      }
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground py-8">Loading alert runner…</p>;
  }

  const job = status?.job;
  const last = job?.last_result;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Alert delivery scheduler</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Runs supplier farmer alerts and delivers in-app notifications. On Vercel,{' '}
        <code className="text-xs bg-muted px-1 rounded">/api/cron/alerts</code> is called hourly.
        Locally run: <code className="text-xs bg-muted px-1 rounded">npm run alerts:run</code>
      </p>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {job?.job_name ?? 'Farmer alert delivery'}
              <Badge variant="default">Active</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Checks due alerts every hour (cron)</p>
          </div>
          <Button size="sm" onClick={trigger} disabled={running}>
            <Play className="h-4 w-4 mr-1" />
            {running ? 'Running…' : 'Run now'}
          </Button>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            Last run:{' '}
            {job?.last_run_at ? new Date(job.last_run_at).toLocaleString() : 'Never'}
          </p>
          {last && (
            <>
              <p>Alerts processed: {last.alerts_processed}</p>
              <p>Notifications sent: {last.notifications_sent}</p>
              <p>Skipped (no subscription): {last.skipped_no_subscription}</p>
              {last.errors.length > 0 && (
                <p className="text-destructive">Errors: {last.errors.join('; ')}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {status?.recent_deliveries && status.recent_deliveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {status.recent_deliveries.slice(0, 10).map((d) => (
                <li key={d.id} className="flex justify-between border-b pb-2 last:border-0">
                  <span className="capitalize">{d.channel}</span>
                  <span>
                    <Badge variant="outline" className="mr-2 capitalize">
                      {d.status}
                    </Badge>
                    {new Date(d.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
