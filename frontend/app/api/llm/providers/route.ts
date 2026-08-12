import { NextResponse } from 'next/server';
import { listProvidersForApi } from '@/lib/server/llm/factory';

export async function GET() {
  return NextResponse.json(listProvidersForApi());
}
