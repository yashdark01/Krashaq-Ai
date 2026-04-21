'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, RefreshCw } from 'lucide-react';

interface SchedulerConfig {
  id: number;
  job_name: string;
  schedule_type: string;
  interval_hours: number | null;
  hour: number | null;
  minute: number | null;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
  updated_at: string;
}

export default function SchedulerConfigPanel() {
  const [configs, setConfigs] = useState<SchedulerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    schedule_type: 'daily',
    interval_hours: 4,
    hour: 5,
    minute: 0,
    enabled: true,
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${apiUrl}/api/admin/scheduler/configs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('Failed to fetch scheduler configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (configId: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${apiUrl}/api/admin/scheduler/configs/${configId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Scheduler configuration updated successfully');
        setEditing(null);
        fetchConfigs();
      } else {
        alert('Failed to update scheduler configuration');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      alert('Failed to update scheduler configuration');
    }
  };

  const triggerJob = async (configId: number, jobName: string) => {
    if (!confirm(`Are you sure you want to manually trigger the job "${jobName}"?`)) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${apiUrl}/api/admin/scheduler/configs/${configId}/trigger`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert(`Job "${jobName}" triggered successfully`);
        fetchConfigs();
      } else {
        alert('Failed to trigger job');
      }
    } catch (error) {
      console.error('Failed to trigger job:', error);
      alert('Failed to trigger job');
    }
  };

  const startEditing = (config: SchedulerConfig) => {
    setEditing(config.id);
    setFormData({
      schedule_type: config.schedule_type,
      interval_hours: config.interval_hours || 4,
      hour: config.hour || 5,
      minute: config.minute || 0,
      enabled: config.enabled,
    });
  };

  const getScheduleDescription = (config: SchedulerConfig) => {
    if (config.schedule_type === 'daily') {
      return `Daily at ${config.hour?.toString().padStart(2, '0')}:${config.minute?.toString().padStart(2, '0')}`;
    } else if (config.schedule_type === 'interval') {
      return `Every ${config.interval_hours} hours`;
    } else if (config.schedule_type === 'hourly') {
      return 'Every hour';
    }
    return config.schedule_type;
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading scheduler configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Scheduler Configuration</h2>
      </div>

      <div className="grid gap-4">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {config.job_name}
                    <Badge variant={config.enabled ? 'default' : 'secondary'}>
                      {config.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getScheduleDescription(config)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerJob(config.id, config.job_name)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Trigger Now
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => startEditing(config)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editing === config.id ? (
                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="schedule_type">Schedule Type</Label>
                      <select
                        id="schedule_type"
                        value={formData.schedule_type}
                        onChange={(e) =>
                          setFormData({ ...formData, schedule_type: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="daily">Daily</option>
                        <option value="hourly">Hourly</option>
                        <option value="interval">Interval</option>
                      </select>
                    </div>

                    {formData.schedule_type === 'daily' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="hour">Hour (0-23)</Label>
                          <Input
                            id="hour"
                            type="number"
                            min="0"
                            max="23"
                            value={formData.hour}
                            onChange={(e) =>
                              setFormData({ ...formData, hour: parseInt(e.target.value) })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="minute">Minute (0-59)</Label>
                          <Input
                            id="minute"
                            type="number"
                            min="0"
                            max="59"
                            value={formData.minute}
                            onChange={(e) =>
                              setFormData({ ...formData, minute: parseInt(e.target.value) })
                            }
                          />
                        </div>
                      </>
                    )}

                    {formData.schedule_type === 'interval' && (
                      <div className="space-y-2">
                        <Label htmlFor="interval_hours">Interval Hours</Label>
                        <Input
                          id="interval_hours"
                          type="number"
                          min="1"
                          value={formData.interval_hours}
                          onChange={(e) =>
                            setFormData({ ...formData, interval_hours: parseInt(e.target.value) })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Message will be sent every X hours
                        </p>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enabled"
                        checked={formData.enabled}
                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="enabled">Enabled</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => updateConfig(config.id)}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Last run:{' '}
                      {config.last_run ? new Date(config.last_run).toLocaleString() : 'Never'}
                    </p>
                    <p>
                      Next run:{' '}
                      {config.next_run
                        ? new Date(config.next_run).toLocaleString()
                        : 'Not scheduled'}
                    </p>
                    <p>Last updated: {new Date(config.updated_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
