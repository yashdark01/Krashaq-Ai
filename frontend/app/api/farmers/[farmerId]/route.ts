import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { farmerId: string } }
) {
  try {
    const response = await api.get<unknown>(`/api/farmers/${params.farmerId}`);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching farmer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farmer' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { farmerId: string } }
) {
  try {
    const body = await request.json();
    const response = await api.put<unknown>(`/api/farmers/${params.farmerId}`, body);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error updating farmer:', error);
    return NextResponse.json(
      { error: 'Failed to update farmer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { farmerId: string } }
) {
  try {
    const response = await api.delete<unknown>(`/api/farmers/${params.farmerId}`);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error deleting farmer:', error);
    return NextResponse.json(
      { error: 'Failed to delete farmer' },
      { status: 500 }
    );
  }
}
