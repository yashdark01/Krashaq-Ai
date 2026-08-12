import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getSupplierUsageAnalytics } from '@/lib/server/services/usage-analytics-service';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const usage = await getSupplierUsageAnalytics(auth.user.id);
  if (!usage) {
    return NextResponse.json({ detail: 'Supplier not found' }, { status: 404 });
  }

  return NextResponse.json(usage);
}
