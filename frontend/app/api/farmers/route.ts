import { NextRequest, NextResponse } from 'next/server';
import { createFarmerForUser, listFarmersForUser } from '@/lib/server/services/farmers-service';
import { AuthError } from '@/lib/server/services/auth-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { farmerCreateSchema } from '@/lib/server/validation/farmer.schemas';
import { requireSupplierOrAdmin } from '@/lib/server/auth/rbac';

export async function GET(request: NextRequest) {
  const auth = await requireSupplierOrAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const skip = Number(request.nextUrl.searchParams.get('skip') ?? 0);
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
    const supplierId = request.nextUrl.searchParams.get('supplier_id');
    const farmers = await listFarmersForUser(
      auth.user,
      skip,
      limit,
      auth.user.role === 'admin' ? supplierId : null
    );
    return NextResponse.json(farmers);
  } catch (error) {
    console.error('Error fetching farmers:', error);
    return NextResponse.json({ error: 'Failed to fetch farmers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSupplierOrAdmin(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, farmerCreateSchema);
  if (!parsed.success) return parsed.response;

  try {
    const farmer = await createFarmerForUser(auth.user, parsed.data);
    return NextResponse.json(farmer, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    console.error('Error creating farmer:', error);
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : 'Failed to create farmer',
        code: 'FARMER_CREATE_FAILED',
      },
      { status: 400 }
    );
  }
}
