import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { configId: string } }
) {
  try {
    const response = await api.post<unknown>(
      `/api/admin/scheduler/configs/${params.configId}/trigger`
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error triggering scheduler job:', error);
    return NextResponse.json(
      { error: 'Failed to trigger scheduler job' },
      { status: 500 }
    );
  }
}
