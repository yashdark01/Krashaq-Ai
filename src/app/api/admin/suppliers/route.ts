import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { parseBody } from '@/lib/server/validation/parse-body';
import { supplierOnboardSchema } from '@/lib/server/validation/supplier.schemas';
import { listSuppliersWithLicenses, onboardSupplier } from '@/lib/server/services/supplier-service';
import { AuthError } from '@/lib/server/services/auth-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const items = await listSuppliersWithLicenses();
    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    console.error('List suppliers error:', error);
    return NextResponse.json({ detail: 'Failed to list suppliers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, supplierOnboardSchema);
  if (!parsed.success) return parsed.response;

  try {
    const supplier = await onboardSupplier(auth.user.id, auth.user.name, parsed.data);
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { detail: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('Onboard supplier error:', error);
    return NextResponse.json({ detail: 'Failed to onboard supplier' }, { status: 500 });
  }
}
