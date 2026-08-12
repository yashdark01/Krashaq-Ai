import { NextRequest, NextResponse } from 'next/server';
import {
  deleteFarmer,
  getFarmerById,
  updateFarmer,
} from '@/lib/server/services/farmers-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  const { farmerId } = await params;
  try {
    const { farmerId } = await params;
    const farmer = await getFarmerById(farmerId);
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }
    return NextResponse.json(farmer);
  } catch (error) {
    console.error('Error fetching farmer:', error);
    return NextResponse.json({ error: 'Failed to fetch farmer' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  const { farmerId } = await params;
  try {
    const { farmerId } = await params;
    const body = await request.json();
    const farmer = await updateFarmer(farmerId, body);
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }
    return NextResponse.json(farmer);
  } catch (error) {
    console.error('Error updating farmer:', error);
    return NextResponse.json({ error: 'Failed to update farmer' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  const { farmerId } = await params;
  try {
    const { farmerId } = await params;
    const deleted = await deleteFarmer(farmerId);
    if (!deleted) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Farmer deleted successfully' });
  } catch (error) {
    console.error('Error deleting farmer:', error);
    return NextResponse.json({ error: 'Failed to delete farmer' }, { status: 500 });
  }
}
