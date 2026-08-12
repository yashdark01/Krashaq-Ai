import { NextRequest, NextResponse } from 'next/server';
import { assignFarmerToSupplier } from '@/lib/server/services/farmers-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { farmerAssignSchema } from '@/lib/server/validation/farmer.schemas';
import { requireAdmin } from '@/lib/server/auth/rbac';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, farmerAssignSchema);
  if (!parsed.success) return parsed.response;

  const { farmerId } = await params;
  try {
    const farmer = await assignFarmerToSupplier(farmerId, parsed.data.supplier_id);
    if (!farmer) {
      return NextResponse.json({ detail: 'Farmer not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(farmer);
  } catch (error) {
    console.error('Error assigning farmer:', error);
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : 'Failed to assign farmer',
        code: 'FARMER_ASSIGN_FAILED',
      },
      { status: 400 }
    );
  }
}
