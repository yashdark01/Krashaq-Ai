import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const response = await api.get<unknown>('/api/admin/users/stats');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}
