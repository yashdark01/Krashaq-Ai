import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { getKbIndexStatus, reindexKbFromMongo } from '@/lib/server/services/kb-admin-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const status = await getKbIndexStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('KB index status error:', error);
    return NextResponse.json({ detail: 'Failed to load index status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const status = await reindexKbFromMongo({
      id: auth.user.id,
      name: auth.user.name,
    });
    return NextResponse.json(status);
  } catch (error) {
    console.error('KB reindex error:', error);
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Failed to rebuild index' },
      { status: 500 }
    );
  }
}
