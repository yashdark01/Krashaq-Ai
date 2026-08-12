import { NextRequest, NextResponse } from 'next/server';
import { listSuppliersWithLicenses } from '@/lib/server/services/supplier-service';
import { requireAdmin } from '@/lib/server/auth/rbac';

/** @deprecated Use GET /api/admin/suppliers */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const suppliers = await listSuppliersWithLicenses();
    return NextResponse.json({ items: suppliers });
  } catch (error) {
    console.error('Error listing suppliers:', error);
    return NextResponse.json({ detail: 'Failed to list suppliers' }, { status: 500 });
  }
}
