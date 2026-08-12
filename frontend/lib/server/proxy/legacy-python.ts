import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/server/config';

/**
 * Temporary bridge for admin/LLM routes not yet ported from Python.
 * Set LEGACY_PYTHON_URL=http://127.0.0.1:8000 during migration.
 */
export async function proxyToLegacyPython(
  request: NextRequest,
  path: string
): Promise<NextResponse> {
  const { legacyPythonUrl } = getConfig();

  if (!legacyPythonUrl) {
    return NextResponse.json(
      {
        error: 'Endpoint not yet migrated to Next.js monolith',
        path,
        hint: 'Set LEGACY_PYTHON_URL to use the old FastAPI backend temporarily',
      },
      { status: 501 }
    );
  }

  const url = new URL(path, legacyPythonUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const response = await fetch(url.toString(), init);
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
