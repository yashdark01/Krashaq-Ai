import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getSupplierDashboardForUser } from '@/lib/server/services/supplier-service';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const dashboard = await getSupplierDashboardForUser(auth.user.id);
  return NextResponse.json(dashboard);
}
