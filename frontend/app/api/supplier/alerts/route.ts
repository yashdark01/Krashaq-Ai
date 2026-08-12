import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { parseBody } from '@/lib/server/validation/parse-body';
import { farmerAlertCreateSchema } from '@/lib/server/validation/alert.schemas';
import {
  listAlertsForSupplier,
  createAlertForSupplier,
} from '@/lib/server/services/farmer-alerts-service';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;
  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const items = await listAlertsForSupplier(auth.user.id);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;
  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const parsed = await parseBody(request, farmerAlertCreateSchema);
  if (!parsed.success) return parsed.response;

  const alert = await createAlertForSupplier(auth.user.id, parsed.data);
  return NextResponse.json(alert, { status: 201 });
}
