import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const response = await api.get<unknown>('/api/admin/config');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching admin config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await api.put<unknown>('/api/admin/config', body);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error updating admin config:', error);
    return NextResponse.json(
      { error: 'Failed to update admin config' },
      { status: 500 }
    );
  }
}
