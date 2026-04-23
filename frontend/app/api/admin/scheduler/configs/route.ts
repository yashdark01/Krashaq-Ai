import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const response = await api.get<unknown>('/api/admin/scheduler/configs');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching scheduler configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduler configs' },
      { status: 500 }
    );
  }
}
