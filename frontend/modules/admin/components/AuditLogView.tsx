'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Search } from 'lucide-react';

interface AuditLog {
  id: number;
  admin_user_id: number;
  admin_user_name: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${apiUrl}/api/admin/audit-logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_user_name.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase()))
  );

  const getActionBadgeColor = (action: string) => {
    if (action.includes('delete')) return 'bg-red-500';
    if (action.includes('role_changed')) return 'bg-yellow-500';
    if (action.includes('config')) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Audit Logs</h2>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredLogs.map((log) => (
          <Card key={log.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getActionBadgeColor(log.action)}>{log.action}</Badge>
                    <Badge variant="outline">{log.target_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Admin: {log.admin_user_name}</p>
                  {log.details && <p className="text-sm">{log.details}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                    {log.ip_address && ` • IP: ${log.ip_address}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
