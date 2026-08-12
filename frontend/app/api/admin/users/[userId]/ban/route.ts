import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { setUserActive, getAdminUserById } from '@/lib/server/services/admin-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const { userId } = await params;
  const ok = await setUserActive(userId, false);
  if (!ok) return NextResponse.json({ detail: 'User not found' }, { status: 404 });
  const user = await getAdminUserById(userId);
  return NextResponse.json(user);
}
