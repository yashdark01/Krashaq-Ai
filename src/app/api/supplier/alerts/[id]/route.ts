import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { parseBody } from '@/lib/server/validation/parse-body';
import { farmerAlertUpdateSchema } from '@/lib/server/validation/alert.schemas';
import {
  getAlertForSupplier,
  updateAlertForSupplier,
  deleteAlertForSupplier,
} from '@/lib/server/services/farmer-alerts-service';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(_request);
  if (!auth.success) return auth.response;
  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const { id } = await params;
  const alert = await getAlertForSupplier(auth.user.id, id);
  if (!alert) return NextResponse.json({ detail: 'Alert not found' }, { status: 404 });
  return NextResponse.json(alert);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;
  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const parsed = await parseBody(request, farmerAlertUpdateSchema);
  if (!parsed.success) return parsed.response;

  const { id } = await params;
  const alert = await updateAlertForSupplier(auth.user.id, id, parsed.data);
  if (!alert) return NextResponse.json({ detail: 'Alert not found' }, { status: 404 });
  return NextResponse.json(alert);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(_request);
  if (!auth.success) return auth.response;
  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const { id } = await params;
  const ok = await deleteAlertForSupplier(auth.user.id, id);
  if (!ok) return NextResponse.json({ detail: 'Alert not found' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
