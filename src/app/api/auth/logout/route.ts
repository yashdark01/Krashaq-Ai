import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/lib/server/services/auth-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { logoutSchema } from '@/lib/server/validation/auth.schemas';

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, logoutSchema);
    if (!parsed.success) return parsed.response;
    const result = await logoutUser(parsed.data.refresh_token);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ message: 'Logged out' });
  }
}
