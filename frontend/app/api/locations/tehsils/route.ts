import { NextRequest, NextResponse } from 'next/server';
import { getTehsilsByDistrict } from '@/lib/server/services/locations-service';

export async function GET(request: NextRequest) {
  try {
    const state = request.nextUrl.searchParams.get('state');
    const district = request.nextUrl.searchParams.get('district');
    if (!state || !district) {
      return NextResponse.json(
        { error: 'state and district query parameters required' },
        { status: 400 }
      );
    }
    return NextResponse.json(getTehsilsByDistrict(state, district));
  } catch (error) {
    console.error('Error fetching tehsils:', error);
    return NextResponse.json({ error: 'Failed to fetch tehsils' }, { status: 500 });
  }
}
