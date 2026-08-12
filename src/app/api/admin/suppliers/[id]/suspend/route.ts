import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { parseBody } from '@/lib/server/validation/parse-body';
import { supplierSuspendSchema } from '@/lib/server/validation/supplier.schemas';
import { suspendSupplier, reactivateSupplier } from '@/lib/server/services/supplier-service';
import { AuthError } from '@/lib/server/services/auth-service';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, supplierSuspendSchema);
  if (!parsed.success) return parsed.response;

  const { id } = await params;
  try {
    const supplier = await suspendSupplier(id, auth.user.id, auth.user.name, parsed.data.reason);
    return NextResponse.json(supplier);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { detail: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json({ detail: 'Failed to suspend supplier' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(_request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  try {
    const supplier = await reactivateSupplier(id, auth.user.id, auth.user.name);
    return NextResponse.json(supplier);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { detail: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json({ detail: 'Failed to reactivate supplier' }, { status: 500 });
  }
}
