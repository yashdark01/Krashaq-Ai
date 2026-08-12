import { NextRequest, NextResponse } from 'next/server';
import { parseBody } from '@/lib/server/validation/parse-body';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(8).max(16),
});

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, schema);
  if (!parsed.success) return parsed.response;

  const normalized = parsed.data.code.replace(/\s/g, '').toUpperCase();
  const validFormat = /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(normalized);

  return NextResponse.json({ valid_format: validFormat });
}

export async function GET() {
  return NextResponse.json({
    detail: 'Use POST with { code } to validate backup code format',
  });
}
