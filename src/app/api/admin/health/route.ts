import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { getAdminDashboardStats } from '@/lib/server/services/admin-service';
import { getConfig } from '@/lib/server/config';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const stats = await getAdminDashboardStats();
    const cfg = getConfig();
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mongodb: stats.services.mongodb,
      redis: Boolean(cfg.redisUrl),
      smtp: stats.services.smtp,
      weather_api: stats.services.weather,
      llm: stats.services.llm,
      tavily: stats.services.tavily,
      langsmith: stats.services.langsmith
        ? { connected: true, project: cfg.langsmithProject }
        : { connected: false, message: 'LangSmith not configured' },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({ status: 'degraded', error: 'Health check failed' }, { status: 503 });
  }
}
