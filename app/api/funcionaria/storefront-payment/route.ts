import { NextRequest, NextResponse } from 'next/server';
import { verifyStorefrontPaymentToken } from '@/lib/orders-server';
import { internalServiceHeaders } from '@/lib/internal-service-headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

async function invokeEdge(body: Record<string, unknown>) {
  const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  if (!base) {
    return { ok: false, status: 500, data: { error: 'server_not_configured' } };
  }

  let serviceHeaders: Record<string, string>;
  try {
    serviceHeaders = internalServiceHeaders();
  } catch {
    return { ok: false, status: 500, data: { error: 'server_not_configured' } };
  }

  const response = await fetch(`${base}/functions/v1/funcionaria-storefront-payments-v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...serviceHeaders,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || '');
  const token = verifyStorefrontPaymentToken(body?.payment_token);

  if (!token) return json({ error: 'invalid_or_expired_payment_token' }, 401);
  if (!['create_pix', 'create_card', 'status'].includes(action)) {
    return json({ error: 'invalid_action' }, 400);
  }

  const edgeAction =
    action === 'create_pix'
      ? 'create_pix'
      : action === 'create_card'
        ? 'create_card'
        : 'status';

  const edge = await invokeEdge({
    action: edgeAction,
    checkout_id: token.checkoutId,
  });

  if (!edge.ok) {
    return json(edge.data || { error: 'payment_provider_failed' }, edge.status || 502);
  }

  return json({
    ...edge.data,
    pedido_id: token.pedidoId,
    company_id: token.companyId,
  });
}