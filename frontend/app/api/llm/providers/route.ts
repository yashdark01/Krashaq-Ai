import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const response = await api.get<unknown>('/api/llm/providers');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching LLM providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LLM providers' },
      { status: 500 }
    );
  }
}
