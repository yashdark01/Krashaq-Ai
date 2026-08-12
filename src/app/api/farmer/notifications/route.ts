import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import {
  listNotificationsForUser,
  markAllNotificationsRead,
} from '@/lib/server/services/notification-inbox-service';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
  const items = await listNotificationsForUser(auth.user.id, limit);
  return NextResponse.json({ items });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  await markAllNotificationsRead(auth.user.id);
  return NextResponse.json({ ok: true });
}
