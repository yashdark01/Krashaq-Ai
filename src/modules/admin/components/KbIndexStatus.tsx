'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, RefreshCw } from 'lucide-react';

interface IndexStatus {
  available: boolean;
  provider?: string;
  model?: string;
  dimension?: number;
  chunk_count?: number;
  built_at?: string;
  document_count?: number;
  embedding_configured: boolean;
}

export function KbIndexStatus() {
  const { fetchWithAuth } = useAuth();
  const { addToast } = useToast();
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/kb/index');
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (error) {
      console.error('Failed to load KB index status:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const reindex = async () => {
    setReindexing(true);
    try {
      const res = await fetchWithAuth('/api/admin/kb/index', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Reindex failed');
      setStatus(data);
      addToast('success', 'FAISS index rebuilt successfully');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Reindex failed');
    } finally {
      setReindexing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Vector index
          </CardTitle>
          <CardDescription>Embeddings power semantic KB search in chat</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={reindex} disabled={reindexing || loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${reindexing ? 'animate-spin' : ''}`} />
          Rebuild index
        </Button>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {loading ? (
          <p className="text-muted-foreground">Loading index status…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant={status?.available ? 'default' : 'secondary'}>
                {status?.available ? 'Index ready' : 'No index'}
              </Badge>
              <Badge variant={status?.embedding_configured ? 'default' : 'destructive'}>
                {status?.embedding_configured ? 'Embeddings OK' : 'Embeddings missing'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {status?.document_count ?? 0} published docs · {status?.chunk_count ?? 0} vectors
              {status?.model ? ` · ${status.provider ?? 'provider'} / ${status.model}` : ''}
            </p>
            {status?.built_at && (
              <p className="text-muted-foreground text-xs">
                Last built: {new Date(status.built_at).toLocaleString()}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
