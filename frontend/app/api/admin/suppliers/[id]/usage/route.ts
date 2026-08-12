import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { getSupplierUsageAnalytics } from '@/lib/server/services/usage-analytics-service';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(_request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  const usage = await getSupplierUsageAnalytics(id);
  if (!usage) {
    return NextResponse.json({ detail: 'Supplier not found' }, { status: 404 });
  }

  return NextResponse.json(usage);
}
