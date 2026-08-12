import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { parseBody } from '@/lib/server/validation/parse-body';
import { supplierUpdateSchema } from '@/lib/server/validation/supplier.schemas';
import {
  getSupplierDetail,
  updateSupplier,
  listFarmersForSupplierAdmin,
} from '@/lib/server/services/supplier-service';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(_request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  const supplier = await getSupplierDetail(id);
  if (!supplier) {
    return NextResponse.json({ detail: 'Supplier not found' }, { status: 404 });
  }

  const farmers = await listFarmersForSupplierAdmin(id);
  return NextResponse.json({ ...supplier, farmers });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, supplierUpdateSchema);
  if (!parsed.success) return parsed.response;

  const { id } = await params;
  const supplier = await updateSupplier(id, parsed.data);
  if (!supplier) {
    return NextResponse.json({ detail: 'Supplier not found' }, { status: 404 });
  }
  return NextResponse.json(supplier);
}
