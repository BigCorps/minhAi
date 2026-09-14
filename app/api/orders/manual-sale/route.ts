import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanText, cleanUuid, resolveCompanyActor } from '@/lib/orders-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STAFF_TYPES = ['frentista', 'atendente', 'caixa', 'gerente', 'colaborador', 'administrador'];
const METHODS = new Set(['pix', 'nfc', 'tef', 'dinheiro', 'fiado']);
const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: noStore }); }

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  const method = String(body?.metodo_pagamento || '').trim();
  const value = Number(body?.valor);

  if (!companyId || !METHODS.has(method) || !Number.isFinite(value) || value <= 0 || value > 10_000_000) {
    return json({ error: 'invalid_sale' }, 400);
  }

  const resolved = await resolveCompanyActor(request, body, companyId, STAFF_TYPES);
  if (!resolved.company) return json({ error: resolved.error || 'company_not_found' }, resolved.error === 'company_lookup_failed' ? 500 : 404);
  if (!resolved.actor) return json({ error: resolved.error || 'unauthorized' }, resolved.error === 'forbidden' ? 403 : 401);

  const admin = createAdminClient();
  const description = cleanText(body?.descricao, 500) || 'Venda rápida';

  let productId: string | null = null;
  const { data: existing } = await admin
    .from('produtos_venda')
    .select('id')
    .eq('company_id', companyId)
    .eq('nome', 'Venda Avulsa')
    .limit(1)
    .maybeSingle();
  productId = existing?.id || null;

  if (!productId) {
    const { data: inserted } = await admin
      .from('produtos_venda')
      .insert({
        company_id: companyId,
        nome: 'Venda Avulsa',
        descricao: 'Placeholder para vendas rápidas via assistente',
        preco_venda: value,
        unidade: 'un',
        controla_estoque: false,
        is_active: false,
      })
      .select('id')
      .maybeSingle();
    productId = inserted?.id || null;
    if (!productId) {
      const { data: retry } = await admin
        .from('produtos_venda')
        .select('id')
        .eq('company_id', companyId)
        .eq('nome', 'Venda Avulsa')
        .limit(1)
        .maybeSingle();
      productId = retry?.id || null;
    }
  }

  if (!productId) return json({ error: 'placeholder_product_failed' }, 500);

  const now = new Date().toISOString();
  const { data: pedido, error: pedidoError } = await admin
    .from('pedidos')
    .insert({
      company_id: companyId,
      user_id: resolved.company.user_id || null,
      profile_id: resolved.actor.profileId || null,
      subtotal: value,
      desconto: 0,
      total: value,
      metodo_pagamento: method,
      status: 'pago',
      observacoes: description !== 'Venda rápida' ? description : null,
      paid_at: now,
      platform: 'manual_sale',
    })
    .select('id')
    .single();

  if (pedidoError || !pedido) return json({ error: 'order_create_failed' }, 500);

  const { error: itemError } = await admin.from('pedido_itens').insert({
    pedido_id: pedido.id,
    produto_id: productId,
    nome_snapshot: description,
    preco_unitario: value,
    quantidade: 1,
    subtotal: value,
  });

  if (itemError) {
    await admin.from('pedidos').delete().eq('id', pedido.id).eq('company_id', companyId);
    return json({ error: 'order_item_create_failed' }, 500);
  }

  return json({ ok: true, pedido_id: pedido.id });
}
