import { NextRequest } from 'next/server';
import { proxyToLegacyPython } from '@/lib/server/proxy/legacy-python';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  return proxyToLegacyPython(request, `/api/admin/users/${userId}/role`);
}
