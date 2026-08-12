import { NextRequest } from 'next/server';
import { proxyToLegacyPython } from '@/lib/server/proxy/legacy-python';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> }
) {
  const { configId } = await params;
  return proxyToLegacyPython(request, `/api/admin/scheduler/configs/${configId}/trigger`);
}
