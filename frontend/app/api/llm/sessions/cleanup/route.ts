import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function POST(request: NextRequest) {
  try {
    const response = await api.post<unknown>('/api/llm/sessions/cleanup');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error cleaning up LLM sessions:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup LLM sessions' },
      { status: 500 }
    );
  }
}
