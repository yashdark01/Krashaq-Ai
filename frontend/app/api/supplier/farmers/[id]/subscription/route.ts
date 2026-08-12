import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { parseBody } from '@/lib/server/validation/parse-body';
import {
  farmerSubscriptionIssueSchema,
  farmerSubscriptionRenewSchema,
} from '@/lib/server/validation/farmer-subscription.schemas';
import { getFarmerRecordById } from '@/lib/server/services/farmers-service';
import {
  getSubscriptionByFarmerId,
  createFarmerSubscription,
  renewFarmerSubscription,
  suspendFarmerSubscription,
  reactivateFarmerSubscription,
} from '@/lib/server/services/farmer-subscription-service';
import { AuthError } from '@/lib/server/services/auth-service';

type RouteParams = { params: Promise<{ id: string }> };

async function assertFarmerOwnedBySupplier(farmerId: string, supplierId: string) {
  const farmer = await getFarmerRecordById(farmerId);
  if (!farmer || farmer.supplier_id !== supplierId) {
    return null;
  }
  return farmer;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(_request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'supplier' && auth.user.role !== 'admin') {
    return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (auth.user.role === 'supplier') {
    const farmer = await assertFarmerOwnedBySupplier(id, auth.user.id);
    if (!farmer) return NextResponse.json({ detail: 'Farmer not found' }, { status: 404 });
  }

  const subscription = await getSubscriptionByFarmerId(id);
  return NextResponse.json({ subscription });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const parsed = await parseBody(request, farmerSubscriptionIssueSchema);
  if (!parsed.success) return parsed.response;

  const { id } = await params;
  const farmer = await assertFarmerOwnedBySupplier(id, auth.user.id);
  if (!farmer) return NextResponse.json({ detail: 'Farmer not found' }, { status: 404 });

  try {
    const existing = await getSubscriptionByFarmerId(id);
    if (existing && ['active', 'trial'].includes(existing.status)) {
      return NextResponse.json({ detail: 'Farmer already has an active subscription' }, { status: 409 });
    }
    const subscription = await createFarmerSubscription(id, auth.user.id, auth.user.id, parsed.data);
    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const parsed = await parseBody(request, farmerSubscriptionRenewSchema);
  if (!parsed.success) return parsed.response;

  const { id } = await params;
  const farmer = await assertFarmerOwnedBySupplier(id, auth.user.id);
  if (!farmer) return NextResponse.json({ detail: 'Farmer not found' }, { status: 404 });

  const subscription = await renewFarmerSubscription(id, auth.user.id, auth.user.id, {
    plan: parsed.data.plan,
    valid_until: new Date(parsed.data.valid_until),
  });
  return NextResponse.json(subscription);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'supplier') {
    return NextResponse.json({ detail: 'Supplier access required' }, { status: 403 });
  }

  const { id } = await params;
  const farmer = await assertFarmerOwnedBySupplier(id, auth.user.id);
  if (!farmer) return NextResponse.json({ detail: 'Farmer not found' }, { status: 404 });

  const reactivate = request.nextUrl.searchParams.get('reactivate') === '1';

  try {
    const subscription = reactivate
      ? await reactivateFarmerSubscription(id, auth.user.id, auth.user.id)
      : await suspendFarmerSubscription(id, auth.user.id, auth.user.id);
    return NextResponse.json(subscription);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
