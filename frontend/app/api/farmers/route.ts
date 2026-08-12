import { NextRequest, NextResponse } from 'next/server';
import {
  createFarmer,
  listFarmers,
} from '@/lib/server/services/farmers-service';

export async function GET(request: NextRequest) {
  try {
    const skip = Number(request.nextUrl.searchParams.get('skip') ?? 0);
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
    const farmers = await listFarmers(skip, limit);
    return NextResponse.json(farmers);
  } catch (error) {
    console.error('Error fetching farmers:', error);
    return NextResponse.json({ error: 'Failed to fetch farmers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const farmer = await createFarmer(body);
    return NextResponse.json(farmer);
  } catch (error) {
    console.error('Error creating farmer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create farmer' },
      { status: 400 }
    );
  }
}
