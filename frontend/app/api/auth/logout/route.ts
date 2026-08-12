import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/lib/server/services/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await logoutUser(body.refresh_token);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ message: 'Logged out' });
  }
}
