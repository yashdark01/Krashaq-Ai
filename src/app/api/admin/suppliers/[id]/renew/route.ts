import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { parseBody } from '@/lib/server/validation/parse-body';
import { supplierRenewSchema } from '@/lib/server/validation/supplier.schemas';
import { renewSupplier } from '@/lib/server/services/supplier-service';
import { AuthError } from '@/lib/server/services/auth-service';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, supplierRenewSchema);
  if (!parsed.success) return parsed.response;

  const { id } = await params;
  try {
    const supplier = await renewSupplier(id, auth.user.id, auth.user.name, {
      plan: parsed.data.plan,
      valid_until: new Date(parsed.data.valid_until),
      max_farmers: parsed.data.max_farmers,
    });
    return NextResponse.json(supplier);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { detail: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json({ detail: 'Failed to renew license' }, { status: 500 });
  }
}
