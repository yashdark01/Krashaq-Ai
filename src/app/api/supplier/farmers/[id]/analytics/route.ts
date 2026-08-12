import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import {
  getFarmerUsageAnalytics,
  getChatUsageByUserIds,
} from '@/lib/server/services/usage-analytics-service';
import { getFarmerRecordById } from '@/lib/server/services/farmers-service';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(_request);
  if (!auth.success) return auth.response;

  const { id } = await params;

  if (auth.user.role === 'farmer' && auth.user.id !== id) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
  }

  if (auth.user.role === 'supplier') {
    const farmer = await getFarmerRecordById(id);
    if (!farmer || farmer.supplier_id !== auth.user.id) {
      return NextResponse.json({ detail: 'Farmer not found' }, { status: 404 });
    }
  } else if (auth.user.role !== 'admin' && auth.user.role !== 'farmer') {
    return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
  }

  const analytics = await getFarmerUsageAnalytics(id);
  if (!analytics) {
    return NextResponse.json({ detail: 'Farmer not found' }, { status: 404 });
  }

  return NextResponse.json(analytics);
}
