import { NextRequest, NextResponse } from 'next/server';
import { internalServiceHeaders } from '@/lib/internal-service-headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FALLBACK = 'https://funcionaria.net';

function safe(value: string | null, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

async function invokeEdge(body: Record<string, unknown>) {
  const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  if (!base) return { ok: false, status: 500, data: { error: 'server_not_configured' } };

  let serviceHeaders: Record<string, string>;
  try {
    serviceHeaders = internalServiceHeaders();
  } catch {
    return { ok: false, status: 500, data: { error: 'server_not_configured' } };
  }

  const response = await fetch(`${base}/functions/v1/funcionaria-storefront-payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...serviceHeaders },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function target(slug: unknown, state: 'confirmado' | 'processando' | 'erro') {
  const clean = String(slug || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(clean)) {
    return `${FALLBACK}/?pagamento=${state}`;
  }
  return `${FALLBACK}/vendas/${encodeURIComponent(clean)}?pagamento=${state}`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const orderNsu = safe(params.get('order_nsu'), 120);
  const transactionNsu = safe(params.get('transaction_nsu') || params.get('transaction_id'), 255);
  const slug = safe(params.get('slug'), 255);
  const receiptUrl = safe(params.get('receipt_url'), 1000);

  if (!/^funcionaria-storefront-[0-9a-f-]{36}$/i.test(orderNsu)
      || !transactionNsu || !slug) {
    return NextResponse.redirect(target('', 'erro'), 303);
  }

  try {
    const signaled = await invokeEdge({
      action: 'signal_infinitepay',
      order_nsu: orderNsu,
      transaction_nsu: transactionNsu,
      slug,
      receipt_url: receiptUrl || null,
    });

    if (!signaled.ok) {
      return NextResponse.redirect(target(signaled.data?.company_slug, 'erro'), 303);
    }

    const confirmed = await invokeEdge({
      action: 'confirm_card',
      order_nsu: orderNsu,
    });

    const companySlug = confirmed.data?.company_slug || signaled.data?.company_slug;
    if (confirmed.ok && confirmed.data?.status === 'paid') {
      return NextResponse.redirect(target(companySlug, 'confirmado'), 303);
    }

    return NextResponse.redirect(target(companySlug, 'processando'), 303);
  } catch {
    return NextResponse.redirect(target('', 'processando'), 303);
  }
}
