import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getCollection } from '@/lib/server/db/mongodb';
import { serializeUser } from '@/lib/server/services/auth-service';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const users = await getCollection('users');
  const user = await users.findOne({ _id: auth.user.id } as never);
  if (!user) {
    return NextResponse.json({ detail: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    user: serializeUser(user as Record<string, unknown>),
    deletion_scheduled: Boolean(user.deletion_scheduled_at),
    deletion_scheduled_at: user.deletion_scheduled_at ?? null,
  });
}
