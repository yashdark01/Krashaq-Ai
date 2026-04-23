import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { phone: string } }
) {
  try {
    const response = await api.get<unknown>(`/api/farmers/phone/${params.phone}`);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching farmer by phone:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farmer by phone' },
      { status: 500 }
    );
  }
}
