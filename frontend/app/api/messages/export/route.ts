import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const session_id = searchParams.get('session_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    const params: Record<string, string> = {
      format,
    };

    if (session_id) params.session_id = session_id;
    if (date_from) params.date_from = date_from;
    if (date_to) params.date_to = date_to;

    const response = await api.get<unknown>('/api/messages/export', { params });

    // Handle different export formats
    if (format === 'csv') {
      return new NextResponse(response.data as string, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=messages.csv',
        },
      });
    } else if (format === 'txt') {
      return new NextResponse(response.data as string, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename=messages.txt',
        },
      });
    } else {
      return NextResponse.json(response.data, {
        headers: {
          'Content-Disposition': 'attachment; filename=messages.json',
        },
      });
    }
  } catch (error) {
    console.error('Error exporting messages:', error);
    return NextResponse.json(
      { error: 'Failed to export messages' },
      { status: 500 }
    );
  }
}
