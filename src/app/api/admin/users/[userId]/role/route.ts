import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { setUserRole, getAdminUserById } from '@/lib/server/services/admin-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const { userId } = await params;
  const body = await request.json();
  const role = body.role as string;
  if (!role) return NextResponse.json({ detail: 'role is required' }, { status: 400 });

  const ok = await setUserRole(userId, role);
  if (!ok) return NextResponse.json({ detail: 'User not found' }, { status: 404 });
  const user = await getAdminUserById(userId);
  return NextResponse.json(user);
}
