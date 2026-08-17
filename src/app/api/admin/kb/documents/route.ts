import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import {
  kbDocumentBodySchema,
  parseTagsInput,
} from '@/lib/server/rag/kb-document-schema';
import { createKbDocument, listKbDocuments } from '@/lib/server/services/kb-admin-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const params = request.nextUrl.searchParams;
    const result = await listKbDocuments({
      q: params.get('q') ?? undefined,
      category: params.get('category') ?? undefined,
      status: params.get('status') ?? undefined,
      skip: Number(params.get('skip') ?? 0),
      limit: Number(params.get('limit') ?? 50),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('List KB documents error:', error);
    return NextResponse.json({ detail: 'Failed to list KB documents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const raw = await request.json();
    const parsed = kbDocumentBodySchema.safeParse({
      ...raw,
      tags: parseTagsInput(raw?.tags),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { detail: 'Invalid document payload', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const doc = await createKbDocument(parsed.data, {
      id: auth.user.id,
      name: auth.user.name,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error('Create KB document error:', error);
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Failed to create document' },
      { status: 500 }
    );
  }
}
