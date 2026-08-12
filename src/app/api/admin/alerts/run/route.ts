import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { runDueAlerts, getAlertRunnerStatus } from '@/lib/server/services/alert-delivery-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const status = await getAlertRunnerStatus();
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  let forceAlertId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    forceAlertId = body.alert_id;
  } catch {
    /* empty body ok */
  }

  const result = await runDueAlerts({ forceAlertId });
  return NextResponse.json(result);
}
