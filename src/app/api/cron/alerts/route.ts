import { NextRequest, NextResponse } from 'next/server';
import { runDueAlerts } from '@/lib/server/services/alert-delivery-service';

/** Vercel Cron / external scheduler — secured via CRON_SECRET */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const headerSecret = request.headers.get('x-cron-secret');

  if (secret && bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDueAlerts();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Alert cron error:', error);
    return NextResponse.json({ detail: 'Alert run failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
