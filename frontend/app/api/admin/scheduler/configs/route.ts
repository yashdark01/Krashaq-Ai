import { NextRequest } from 'next/server';
import { proxyToLegacyPython } from '@/lib/server/proxy/legacy-python';

export async function GET(request: NextRequest) {
  return proxyToLegacyPython(request, '/api/admin/scheduler/configs');
}
