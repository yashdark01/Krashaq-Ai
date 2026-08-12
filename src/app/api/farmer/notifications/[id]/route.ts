import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { markNotificationRead } from '@/lib/server/services/notification-inbox-service';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(_request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  const ok = await markNotificationRead(auth.user.id, id);
  if (!ok) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
