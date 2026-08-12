import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { getAdminUserById, updateAdminUser } from '@/lib/server/services/admin-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const { userId } = await params;
  const user = await getAdminUserById(userId);
  if (!user) return NextResponse.json({ detail: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const { userId } = await params;
  const body = await request.json();
  const ok = await updateAdminUser(userId, body);
  if (!ok) return NextResponse.json({ detail: 'User not found' }, { status: 404 });
  const user = await getAdminUserById(userId);
  return NextResponse.json(user);
}
