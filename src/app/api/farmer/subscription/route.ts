import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getActiveSubscriptionForFarmer } from '@/lib/server/services/farmer-subscription-service';
import { getCollection } from '@/lib/server/db/mongodb';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'farmer') {
    return NextResponse.json({ detail: 'Farmer access required' }, { status: 403 });
  }

  const subscription = await getActiveSubscriptionForFarmer(auth.user.id);
  let supplierName: string | null = null;

  if (auth.user.supplier_id) {
    const users = await getCollection('users');
    const supplier = await users.findOne({ _id: auth.user.supplier_id } as never);
    if (supplier) {
      supplierName =
        (supplier.company_name as string | undefined) ?? (supplier.name as string) ?? null;
    }
  }

  return NextResponse.json({
    subscription,
    supplier: supplierName ? { id: auth.user.supplier_id, name: supplierName } : null,
  });
}
