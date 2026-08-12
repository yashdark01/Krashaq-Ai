import { NextRequest, NextResponse } from 'next/server';
import { getFarmerByPhoneForUser } from '@/lib/server/services/farmers-service';
import { requireSupplierOrAdmin } from '@/lib/server/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const auth = await requireSupplierOrAdmin(request);
  if (!auth.success) return auth.response;

  const { phone } = await params;
  try {
    const farmer = await getFarmerByPhoneForUser(auth.user, decodeURIComponent(phone));
    if (!farmer) {
      return NextResponse.json({ detail: 'Farmer not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(farmer);
  } catch (error) {
    console.error('Error fetching farmer by phone:', error);
    return NextResponse.json({ error: 'Failed to fetch farmer' }, { status: 500 });
  }
}
