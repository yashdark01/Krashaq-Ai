import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '100';
    const action = searchParams.get('action');
    const target_type = searchParams.get('target_type');

    const params: Record<string, string> = {
      skip,
      limit,
    };

    if (action) params.action = action;
    if (target_type) params.target_type = target_type;

    const response = await api.get<unknown>('/api/admin/audit-logs', { params });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
