import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanUuid } from '@/lib/orders-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: noStore }); }

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const pedidoId = cleanUuid(body?.pedido_id);
  const transactionId = cleanUuid(body?.transaction_id);
  const profileToken = String(body?.profile_token || '').trim();
  if (!pedidoId || !transactionId) return json({ error: 'invalid_request' }, 400);

  const admin = createAdminClient();
  const { data: tx, error: txError } = await admin
    .from('pix_transactions')
    .select('id,company_id,pedido_id,status')
    .eq('id', transactionId)
    .maybeSingle();
  if (txError) return json({ error: 'transaction_lookup_failed' }, 500);
  if (!tx || tx.pedido_id !== pedidoId) return json({ error: 'transaction_order_mismatch' }, 404);

  const { data: pedido, error: pedidoError } = await admin
    .from('pedidos')
    .select('id,company_id,status,profile_id,cliente_nome')
    .eq('id', pedidoId)
    .eq('company_id', tx.company_id)
    .maybeSingle();
  if (pedidoError) return json({ error: 'pedido_lookup_failed' }, 500);
  if (!pedido) return json({ error: 'pedido_not_found' }, 404);
  if (!['pago', 'entregue'].includes(String(pedido.status || ''))) {
    return json({ error: 'pedido_not_paid', status: pedido.status }, 409);
  }

  let linked = false;
  let resultingProfileId = pedido.profile_id || null;

  if (!resultingProfileId && profileToken) {
    const { data: session } = await admin
      .from('profile_sessions')
      .select('profile_id,company_id,expires_at')
      .eq('token', profileToken)
      .eq('company_id', pedido.company_id)
      .maybeSingle();

    const sessionValid = !!session && (!session.expires_at || new Date(session.expires_at).getTime() > Date.now());
    if (sessionValid && session?.profile_id) {
      const { data: profile } = await admin
        .from('company_profiles')
        .select('id,is_active')
        .eq('id', session.profile_id)
        .eq('company_id', pedido.company_id)
        .maybeSingle();
      if (profile && profile.is_active !== false) {
        const { data: updated } = await admin
          .from('pedidos')
          .update({ profile_id: profile.id })
          .eq('id', pedidoId)
          .eq('company_id', pedido.company_id)
          .is('profile_id', null)
          .select('profile_id')
          .maybeSingle();
        if (updated?.profile_id) {
          resultingProfileId = updated.profile_id;
          linked = true;
        }
      }
    }
  }

  return json({
    ok: true,
    linked,
    profile_id: resultingProfileId,
    cliente_nome: pedido.cliente_nome || null,
    transaction_status: tx.status || null,
  });
}
