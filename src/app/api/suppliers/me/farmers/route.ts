import { NextRequest, NextResponse } from 'next/server';
import { listFarmersForUser } from '@/lib/server/services/farmers-service';
import { requireSupplierOrAdmin } from '@/lib/server/auth/rbac';

export async function GET(request: NextRequest) {
  const auth = await requireSupplierOrAdmin(request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'supplier') {
    return NextResponse.json(
      { detail: 'Supplier access required', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  try {
    const skip = Number(request.nextUrl.searchParams.get('skip') ?? 0);
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
    const farmers = await listFarmersForUser(auth.user, skip, limit);
    return NextResponse.json({ items: farmers });
  } catch (error) {
    console.error('Error listing supplier farmers:', error);
    return NextResponse.json({ detail: 'Failed to list farmers' }, { status: 500 });
  }
}
