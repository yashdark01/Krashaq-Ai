import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const tehsil = searchParams.get('tehsil');

    const params: Record<string, string> = {};
    if (state) params.state = state;
    if (district) params.district = district;
    if (tehsil) params.tehsil = tehsil;

    const response = await api.get<unknown>('/api/locations/localities', { params });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching localities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch localities' },
      { status: 500 }
    );
  }
}
