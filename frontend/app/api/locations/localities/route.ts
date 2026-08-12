import { NextRequest, NextResponse } from 'next/server';
import { getLocalitiesByTehsil } from '@/lib/server/services/locations-service';

export async function GET(request: NextRequest) {
  try {
    const state = request.nextUrl.searchParams.get('state');
    const district = request.nextUrl.searchParams.get('district');
    const tehsil = request.nextUrl.searchParams.get('tehsil');
    if (!state || !district || !tehsil) {
      return NextResponse.json(
        { error: 'state, district, and tehsil query parameters required' },
        { status: 400 }
      );
    }
    return NextResponse.json(getLocalitiesByTehsil(state, district, tehsil));
  } catch (error) {
    console.error('Error fetching localities:', error);
    return NextResponse.json({ error: 'Failed to fetch localities' }, { status: 500 });
  }
}
