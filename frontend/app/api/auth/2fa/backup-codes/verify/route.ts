import { NextRequest } from 'next/server';
import { proxyToLegacyPython } from '@/lib/server/proxy/legacy-python';

export async function GET(request: NextRequest) {
  return proxyToLegacyPython(request, '/api/auth/2fa/backup-codes/verify');
}
