import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getSubscriptionStatsForSupplier } from '@/lib/server/services/farmer-subscription-service';
import { SUBSCRIPTION_PLAN_DEFAULTS } from '@/lib/server/constants/subscription-plans';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const stats = await getSubscriptionStatsForSupplier(auth.user.id);
  return NextResponse.json({
    stats,
    plans: SUBSCRIPTION_PLAN_DEFAULTS,
  });
}
