import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Vercel agenda uma verificação por hora; o recurso é opt-in e inicia DESLIGADO.
// CRON_SECRET deve existir; sem ele, nenhum pedido é autorizado.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (process.env.FUNCIONARIA_ML_SYNC_CRON_ENABLED !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'feature_disabled' });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    return NextResponse.json({ error: 'configuration_missing' }, { status: 503 });
  }
  try {
    const response = await fetch(new URL('/functions/v1/funcionaria-ml-sync', supabaseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRole}`,
        apikey: serviceRole,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'due' }),
      signal: AbortSignal.timeout(45000),
      cache: 'no-store',
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'sync_worker_unavailable' }, { status: 502 });
    }
    const data = await response.json() as { results?: unknown[] };
    return NextResponse.json({ ok: true, processed: Array.isArray(data.results) ? data.results.length : 0 });
  } catch {
    return NextResponse.json({ error: 'sync_worker_unavailable' }, { status: 502 });
  }
}
