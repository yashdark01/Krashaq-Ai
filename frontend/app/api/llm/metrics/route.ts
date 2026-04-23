import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const response = await api.get<unknown>('/api/llm/metrics');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching LLM metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LLM metrics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await api.post<unknown>('/api/llm/metrics/reset');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error resetting LLM metrics:', error);
    return NextResponse.json(
      { error: 'Failed to reset LLM metrics' },
      { status: 500 }
    );
  }
}
