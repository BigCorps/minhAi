import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const noStore = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

function cleanUuid(value: unknown) {
  const id = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : '';
}

function bearerToken(request: NextRequest) {
  const header = String(request.headers.get('authorization') || '').trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  const pedidoId = cleanUuid(body?.pedido_id);
  if (!companyId || !pedidoId) return json({ error: 'invalid_request' }, 400);

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData?.user || null;
  if (authError || !user) return json({ error: 'unauthorized' }, 401);

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id,user_id')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError) {
    console.error('[funcionaria/orders/mark-delivered] company:', companyError.message);
    return json({ error: 'company_lookup_failed' }, 500);
  }
  if (!company) return json({ error: 'company_not_found' }, 404);

  let authorized = company.user_id === user.id;
  if (!authorized) {
    const { data: adminRow, error: adminError } = await admin
      .from('company_admins')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError) {
      console.error('[funcionaria/orders/mark-delivered] admin:', adminError.message);
      return json({ error: 'authorization_lookup_failed' }, 500);
    }
    authorized = !!adminRow;
  }

  if (!authorized) return json({ error: 'forbidden' }, 403);

  const { data: pedido, error: pedidoError } = await admin
    .from('pedidos')
    .select('id,status')
    .eq('id', pedidoId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (pedidoError) {
    console.error('[funcionaria/orders/mark-delivered] pedido:', pedidoError.message);
    return json({ error: 'pedido_lookup_failed' }, 500);
  }
  if (!pedido) return json({ error: 'pedido_not_found' }, 404);

  if (pedido.status === 'entregue') {
    return json({ ok: true, status: 'entregue', already_delivered: true });
  }
  if (pedido.status !== 'pago') {
    return json({ error: 'pedido_not_deliverable', status: pedido.status }, 409);
  }

  const { data: updated, error: updateError } = await admin
    .from('pedidos')
    .update({ status: 'entregue' })
    .eq('id', pedidoId)
    .eq('company_id', companyId)
    .eq('status', 'pago')
    .select('id,status')
    .maybeSingle();

  if (updateError) {
    console.error('[funcionaria/orders/mark-delivered] update:', updateError.message);
    return json({ error: 'pedido_update_failed' }, 500);
  }
  if (!updated) return json({ error: 'pedido_state_changed' }, 409);

  return json({ ok: true, status: updated.status });
}
