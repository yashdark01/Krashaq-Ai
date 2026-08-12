import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getActiveLicenseForSupplier, countFarmersForSupplier } from '@/lib/server/services/supplier-license-service';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const license = await getActiveLicenseForSupplier(auth.user.id);
  const farmerCount = await countFarmersForSupplier(auth.user.id);

  return NextResponse.json({
    license: license
      ? {
          plan: license.plan,
          max_farmers: license.max_farmers,
          status: license.status,
          valid_until: license.valid_until,
          features: license.features,
        }
      : null,
    seats_used: farmerCount,
    seats_remaining: license ? Math.max(0, license.max_farmers - farmerCount) : 0,
  });
}
