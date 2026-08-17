'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';

interface KbDocumentFormProps {
  documentId?: string;
}

const EMPTY_FORM = {
  title: '',
  category: 'general',
  tags: '',
  search_aliases: '',
  content: '',
  status: 'published' as 'draft' | 'published',
};

export default function KbDocumentForm({ documentId }: KbDocumentFormProps) {
  const router = useRouter();
  const { fetchWithAuth } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!documentId) return;

    fetchWithAuth(`/api/admin/kb/documents/${encodeURIComponent(documentId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Document not found');
        const doc = await res.json();
        setForm({
          title: doc.title ?? '',
          category: doc.category ?? 'general',
          tags: Array.isArray(doc.tags) ? doc.tags.join(', ') : '',
          search_aliases: doc.search_aliases ?? '',
          content: doc.content ?? '',
          status: doc.status ?? 'published',
        });
      })
      .catch(() => addToast('error', 'Failed to load document'))
      .finally(() => setLoading(false));
  }, [documentId, fetchWithAuth, addToast]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title,
      category: form.category,
      tags: form.tags,
      search_aliases: form.search_aliases,
      content: form.content,
      status: form.status,
    };

    try {
      const url = documentId
        ? `/api/admin/kb/documents/${encodeURIComponent(documentId)}`
        : '/api/admin/kb/documents';
      const res = await fetchWithAuth(url, {
        method: documentId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Save failed');

      addToast('success', documentId ? 'Document updated & re-indexed' : 'Document created & indexed');
      router.push('/admin/kb');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground py-8">Loading document…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/kb">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{documentId ? 'Edit document' : 'New document'}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4 max-w-3xl">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="PM-KISAN Scheme Overview"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="scheme">Scheme</option>
                  <option value="crop">Crop</option>
                  <option value="pest">Pest</option>
                  <option value="irrigation">Irrigation</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as 'draft' | 'published' })
                  }
                >
                  <option value="published">Published (indexed in search)</option>
                  <option value="draft">Draft (not searchable)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="pm-kisan, scheme, kisan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="search_aliases">Search aliases (Hindi/Hinglish terms)</Label>
              <Textarea
                id="search_aliases"
                value={form.search_aliases}
                onChange={(e) => setForm({ ...form, search_aliases: e.target.value })}
                placeholder="PM KISAN yojana, kisan samman nidhi, 6000 rupaye saal"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Improves retrieval for Hindi/Hinglish farmer queries. Embedded but not shown in chat.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content (Markdown)</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write farming guidance in Markdown…"
                rows={16}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving & indexing…' : documentId ? 'Save & re-index' : 'Create & index'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/kb">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
