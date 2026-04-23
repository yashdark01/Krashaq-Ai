import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: { configId: string } }
) {
  try {
    const body = await request.json();
    const response = await api.put<unknown>(
      `/api/admin/scheduler/configs/${params.configId}`,
      body
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error updating scheduler config:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduler config' },
      { status: 500 }
    );
  }
}
