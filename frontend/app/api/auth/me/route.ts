import { NextRequest, NextResponse } from 'next/server';
import { getUserFromAuthHeader } from '@/lib/server/services/auth-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
}
