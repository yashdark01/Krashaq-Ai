import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');
    const district = searchParams.get('district');

    const params: Record<string, string> = {};
    if (state) params.state = state;
    if (district) params.district = district;

    const response = await api.get<unknown>('/api/locations/tehsils', { params });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching tehsils:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tehsils' },
      { status: 500 }
    );
  }
}
