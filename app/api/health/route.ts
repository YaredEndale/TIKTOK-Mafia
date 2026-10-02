import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const supabase = createAdminClient();
    const dbStart = Date.now();
    const { error } = await supabase.from('games').select('id').limit(1);
    dbLatencyMs = Date.now() - dbStart;

    if (error) {
      dbStatus = 'degraded';
      dbError = error.message;
    }
  } catch (err) {
    dbStatus = 'unreachable';
    dbError = err instanceof Error ? err.message : 'Unknown database error';
  }

  const isHealthy = dbStatus !== 'unreachable';
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      app: 'tiktok-live-mafia',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError && { error: dbError }),
      },
      environment: process.env.NEXT_PUBLIC_APP_ENV || 'production',
      responseTimeMs: Date.now() - startedAt,
    },
    { status: statusCode }
  );
}
