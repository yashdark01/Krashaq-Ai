import { NextRequest, NextResponse } from 'next/server';
import {
  deleteFarmerForUser,
  getFarmerByIdForUser,
  updateFarmerForUser,
} from '@/lib/server/services/farmers-service';
import { requireSupplierOrAdmin } from '@/lib/server/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  const auth = await requireSupplierOrAdmin(request);
  if (!auth.success) return auth.response;

  const { farmerId } = await params;
  try {
    const farmer = await getFarmerByIdForUser(auth.user, farmerId);
    if (!farmer) {
      return NextResponse.json({ detail: 'Farmer not found', code: 'NOT_FOUND' }, { status: 404 });
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
  const auth = await requireSupplierOrAdmin(request);
  if (!auth.success) return auth.response;

  const { farmerId } = await params;
  try {
    const body = await request.json();
    const farmer = await updateFarmerForUser(auth.user, farmerId, body);
    if (!farmer) {
      return NextResponse.json({ detail: 'Farmer not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(farmer);
  } catch (error) {
    console.error('Error updating farmer:', error);
    return NextResponse.json({ error: 'Failed to update farmer' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  const auth = await requireSupplierOrAdmin(request);
  if (!auth.success) return auth.response;

  const { farmerId } = await params;
  try {
    const deleted = await deleteFarmerForUser(auth.user, farmerId);
    if (!deleted) {
      return NextResponse.json({ detail: 'Farmer not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Farmer deleted successfully' });
  } catch (error) {
    console.error('Error deleting farmer:', error);
    return NextResponse.json({ error: 'Failed to delete farmer' }, { status: 500 });
  }
}
