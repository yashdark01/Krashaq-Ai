'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { KbIndexStatus } from '@/components/admin/KbIndexStatus';
import { Plus, Search, Pencil, Trash2, BookOpen } from 'lucide-react';

interface KbDocument {
  id: string;
  title: string;
  category: string;
  status: 'draft' | 'published';
  chunk_count: number;
  tags: string[];
  updated_at: string;
  source: string;
}

export default function KbDocumentList() {
  const { fetchWithAuth } = useAuth();
  const { addToast } = useToast();
  const [items, setItems] = useState<KbDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('q', search.trim());
      if (category !== 'all') params.set('category', category);

      const res = await fetchWithAuth(`/api/admin/kb/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (error) {
      console.error('Failed to load KB documents:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, search, category]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const deleteDocument = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This removes chunks and rebuilds the index.`)) return;

    try {
      const res = await fetchWithAuth(`/api/admin/kb/documents/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Delete failed');
      }
      addToast('success', 'Document deleted');
      loadDocuments();
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Knowledge base
          </h1>
          <p className="text-muted-foreground">
            Manage RAG documents — create, edit, and rebuild embeddings
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/kb/new">
            <Plus className="h-4 w-4 mr-2" />
            New document
          </Link>
        </Button>
      </div>

      <KbIndexStatus />

      <Card>
        <CardHeader>
          <CardTitle>Documents ({total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search title, content, tags…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadDocuments()}
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              <option value="scheme">Scheme</option>
              <option value="crop">Crop</option>
              <option value="pest">Pest</option>
              <option value="irrigation">Irrigation</option>
              <option value="general">General</option>
            </select>
            <Button variant="secondary" onClick={loadDocuments}>
              Search
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading documents…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No documents yet. Create one to add farming knowledge to chat.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Title</th>
                    <th className="py-2 pr-4 font-medium">Category</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Chunks</th>
                    <th className="py-2 pr-4 font-medium">Updated</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((doc) => (
                    <tr key={doc.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">{doc.id}</div>
                      </td>
                      <td className="py-3 pr-4 capitalize">{doc.category}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={doc.status === 'published' ? 'default' : 'secondary'}>
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{doc.chunk_count}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/kb/${encodeURIComponent(doc.id)}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDocument(doc.id, doc.title)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
