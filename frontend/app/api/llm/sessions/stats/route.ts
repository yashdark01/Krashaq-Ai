import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const response = await api.get<unknown>('/api/llm/sessions/stats');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching LLM session stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LLM session stats' },
      { status: 500 }
    );
  }
}
