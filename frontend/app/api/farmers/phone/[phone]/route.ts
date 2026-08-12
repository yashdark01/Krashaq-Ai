import { NextRequest, NextResponse } from 'next/server';
import { getFarmerByPhone } from '@/lib/server/services/farmers-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone } = await params;
  try {
    const { phone } = await params;
    const farmer = await getFarmerByPhone(decodeURIComponent(phone));
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }
    return NextResponse.json(farmer);
  } catch (error) {
    console.error('Error fetching farmer by phone:', error);
    return NextResponse.json({ error: 'Failed to fetch farmer' }, { status: 500 });
  }
}
