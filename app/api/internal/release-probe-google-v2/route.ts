import { getSupabaseServerKey } from '@/lib/supabase-server-key';
import { internalServiceHeaders } from '@/lib/internal-service-headers';
import 'server-only';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FUNCTIONS = [
  ['enviar-email-google-v2', 'invalid_company_id'],
  ['listar-eventos-google-v2', 'invalid_company_id'],
  ['appointment-actions-v2', 'invalid_action'],
  ['criar-evento-calendario-v2', 'invalid_company_id'],
] as const;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

// Sem argumento Request: query, body e headers externos nunca definem os probes.
export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') return json({ success: false }, 404);
  let serviceRole: string;
  try { serviceRole = getSupabaseServerKey(); } catch {
    return json({ success: false, probes: {} }, 503);
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  if (!serviceRole || base !== 'https://qyonozbroekuqlotqcbm.supabase.co') {
    return json({ success: false, probes: {} }, 503);
  }

  const results = await Promise.all(FUNCTIONS.map(async ([slug, validationError]) => {
    const tests = [
      { name: 'no_auth', method: 'POST', token: null, status: 401, error: 'unauthorized' },
      { name: 'invalid_auth', method: 'POST', token: 'definitely-invalid', status: 401, error: 'unauthorized' },
      { name: 'wrong_method', method: 'GET', token: serviceRole, status: 405, error: 'method_not_allowed' },
      { name: 'invalid_payload_service_role', method: 'POST', token: serviceRole, status: 400, error: validationError },
    ] as const;
    const statuses: Record<string, number> = {};
    let passed = true;
    for (const test of tests) {
      try {
        const response = await fetch(`${base}/functions/v1/${slug}`, {
          method: test.method,
          headers: {
            'Content-Type': 'application/json',
            ...(test.token === serviceRole ? internalServiceHeaders(serviceRole)
              : test.token ? { Authorization: `Bearer ${test.token}` } : {}),
          },
          ...(test.method === 'POST' ? { body: '{}' } : {}),
          cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5_000),
        });
        statuses[test.name] = response.status;
        const payload = await response.json().catch(() => null);
        passed = passed && response.status === test.status && payload?.error === test.error;
      } catch {
        // 0 indica falha de transporte; detalhes/headers/payloads nunca são expostos.
        statuses[test.name] = 0;
        passed = false;
      }
    }
    return { slug, statuses, passed };
  }));
  const success = results.every(result => result.passed);
  return json({ success, credential_source: process.env.SUPABASE_SECRET_KEY !== undefined ? 'supabase_secret_key' : 'legacy_service_role', credential_family: serviceRole.startsWith('sb_secret_') ? 'sb_secret' : 'legacy', probes: Object.fromEntries(results.map(result => [result.slug, result.statuses])) }, success ? 200 : 502);
}

function unsupported() {
  return json({ success: false }, process.env.VERCEL_ENV === 'preview' ? 405 : 404);
}
export { unsupported as POST, unsupported as HEAD, unsupported as OPTIONS, unsupported as PUT, unsupported as PATCH, unsupported as DELETE };
