import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { listAdminUsers } from '@/lib/server/services/admin-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const skip = Number(request.nextUrl.searchParams.get('skip') ?? 0);
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
    const q = request.nextUrl.searchParams.get('q') ?? undefined;
    const items = await listAdminUsers(skip, limit, q);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ detail: 'Failed to list users' }, { status: 500 });
  }
}
