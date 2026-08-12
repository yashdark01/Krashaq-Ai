import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getAlertForSupplier } from '@/lib/server/services/farmer-alerts-service';
import { runDueAlerts } from '@/lib/server/services/alert-delivery-service';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(_request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const { id } = await params;
  const alert = await getAlertForSupplier(auth.user.id, id);
  if (!alert) {
    return NextResponse.json({ detail: 'Alert not found' }, { status: 404 });
  }

  const result = await runDueAlerts({ forceAlertId: id });
  return NextResponse.json(result);
}
