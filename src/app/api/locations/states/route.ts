import { NextRequest, NextResponse } from 'next/server';
import { getStates } from '@/lib/server/services/locations-service';

export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json(getStates());
  } catch (error) {
    console.error('Error fetching states:', error);
    return NextResponse.json({ error: 'Failed to fetch states' }, { status: 500 });
  }
}
