import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import {
  kbDocumentUpdateSchema,
  parseTagsInput,
} from '@/lib/server/rag/kb-document-schema';
import {
  deleteKbDocument,
  getKbDocument,
  updateKbDocument,
} from '@/lib/server/services/kb-admin-service';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(_request);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const doc = await getKbDocument(id);
    if (!doc) {
      return NextResponse.json({ detail: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (error) {
    console.error('Get KB document error:', error);
    return NextResponse.json({ detail: 'Failed to load document' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const raw = await request.json();
    const parsed = kbDocumentUpdateSchema.safeParse({
      ...raw,
      tags: raw?.tags !== undefined ? parseTagsInput(raw.tags) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { detail: 'Invalid document payload', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const doc = await updateKbDocument(id, parsed.data, {
      id: auth.user.id,
      name: auth.user.name,
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error('Update KB document error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update document';
    const status = message === 'Document not found' ? 404 : 500;
    return NextResponse.json({ detail: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(_request);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    await deleteKbDocument(id, { id: auth.user.id, name: auth.user.name });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete KB document error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete document';
    const status = message === 'Document not found' ? 404 : 500;
    return NextResponse.json({ detail: message }, { status });
  }
}
