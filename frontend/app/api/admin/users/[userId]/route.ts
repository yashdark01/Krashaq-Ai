import { NextRequest } from 'next/server';
import { proxyToLegacyPython } from '@/lib/server/proxy/legacy-python';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  return proxyToLegacyPython(request, `/api/admin/users/${userId}`);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  return proxyToLegacyPython(request, `/api/admin/users/${userId}`);
}
