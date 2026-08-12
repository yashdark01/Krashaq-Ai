import { NextRequest, NextResponse } from 'next/server';
import { getDistrictsByState } from '@/lib/server/services/locations-service';

export async function GET(request: NextRequest) {
  try {
    const state = request.nextUrl.searchParams.get('state');
    if (!state) {
      return NextResponse.json({ error: 'state query parameter required' }, { status: 400 });
    }
    return NextResponse.json(getDistrictsByState(state));
  } catch (error) {
    console.error('Error fetching districts:', error);
    return NextResponse.json({ error: 'Failed to fetch districts' }, { status: 500 });
  }
}
