import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const response = await api.delete<unknown>(
      `/api/llm/sessions/${params.sessionId}`
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error deleting LLM session:', error);
    return NextResponse.json(
      { error: 'Failed to delete LLM session' },
      { status: 500 }
    );
  }
}
