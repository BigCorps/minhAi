import { NextRequest, NextResponse } from 'next/server';
import { verifyStorefrontPaymentToken } from '@/lib/orders-server';

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
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!base || !serviceKey) {
    return { ok: false, status: 500, data: { error: 'server_not_configured' } };
  }

  const response = await fetch(`${base}/functions/v1/funcionaria-storefront-payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
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
  if (!['create_pix', 'status'].includes(action)) return json({ error: 'invalid_action' }, 400);

  const edge = await invokeEdge(
    action === 'create_pix'
      ? {
          action: 'create_pix',
          checkout_id: token.checkoutId,
        }
      : {
          action: 'check_pix',
          checkout_id: token.checkoutId,
        },
  );

  if (!edge.ok) {
    return json(edge.data || { error: 'payment_provider_failed' }, edge.status || 502);
  }

  return json({
    ...edge.data,
    pedido_id: token.pedidoId,
    company_id: token.companyId,
  });
}
