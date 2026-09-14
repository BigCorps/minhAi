import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanText, cleanUuid, signOrderMutationToken } from '@/lib/orders-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };
const METHODS = new Set(['pix', 'nfc', 'tef', 'dinheiro', 'fiado']);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

function normalizeRequestedItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((raw: any) => {
    const optionIds = Array.isArray(raw?.opcoes_selecionadas)
      ? [...new Set(raw.opcoes_selecionadas
          .slice(0, 50)
          .map((o: any) => cleanUuid(o?.item_id))
          .filter(Boolean))]
      : [];

    return {
      produto_id: cleanUuid(raw?.produto_id),
      quantidade: Math.max(1, Math.min(50, Math.floor(Number(raw?.quantidade || 0)))),
      opcoes_selecionadas: optionIds.map((item_id) => ({ item_id })),
    };
  }).filter((item: any) => item.produto_id && Number.isFinite(item.quantidade));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  const method = String(body?.metodo_pagamento || '').trim();
  const items = normalizeRequestedItems(body?.itens);

  if (!companyId || !METHODS.has(method) || !items.length) {
    return json({ error: 'invalid_order' }, 400);
  }

  const admin = createAdminClient();
  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id,user_id,is_active')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError) return json({ error: 'company_lookup_failed' }, 500);
  if (!company || company.is_active === false) return json({ error: 'company_not_found' }, 404);

  const productIds = [...new Set(items.map((item: any) => item.produto_id))];
  const { data: products, error: productsError } = await admin
    .from('produtos_venda')
    .select('id,nome,preco_venda,estoque_atual,controla_estoque,is_active')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .in('id', productIds);

  if (productsError) return json({ error: 'products_lookup_failed' }, 500);
  if (!products || products.length !== productIds.length) return json({ error: 'invalid_products' }, 409);

  const { data: groups, error: groupsError } = await admin
    .from('produto_opcoes_grupos')
    .select('id,produto_id,nome,obrigatorio,min_escolhas,max_escolhas')
    .in('produto_id', productIds);
  if (groupsError) return json({ error: 'options_lookup_failed' }, 500);

  const selectedOptionIds = [...new Set(items.flatMap((item: any) => item.opcoes_selecionadas.map((o: any) => o.item_id)))];
  let optionRows: any[] = [];
  if (selectedOptionIds.length) {
    const { data, error } = await admin
      .from('produto_opcoes_itens')
      .select('id,grupo_id,nome,preco_adicional,disponivel')
      .in('id', selectedOptionIds);
    if (error) return json({ error: 'option_items_lookup_failed' }, 500);
    optionRows = data || [];
    if (optionRows.length !== selectedOptionIds.length) return json({ error: 'invalid_options' }, 409);
  }

  const productById = new Map((products || []).map((p: any) => [p.id, p]));
  const groupById = new Map((groups || []).map((g: any) => [g.id, g]));
  const optionById = new Map(optionRows.map((o: any) => [o.id, o]));
  const groupsByProduct = new Map<string, any[]>();
  for (const group of groups || []) {
    const current = groupsByProduct.get(group.produto_id) || [];
    current.push(group);
    groupsByProduct.set(group.produto_id, current);
  }

  let subtotal = 0;
  const itemRows: any[] = [];

  for (const requested of items as any[]) {
    const product: any = productById.get(requested.produto_id);
    if (!product) return json({ error: 'invalid_products' }, 409);

    if (product.controla_estoque === true && Number(product.estoque_atual || 0) < requested.quantidade) {
      return json({ error: 'insufficient_stock', product_name: product.nome }, 409);
    }

    const countsByGroup = new Map<string, number>();
    const sanitizedOptions: any[] = [];
    let additional = 0;

    for (const selected of requested.opcoes_selecionadas) {
      const option: any = optionById.get(selected.item_id);
      if (!option || option.disponivel === false) return json({ error: 'invalid_options' }, 409);
      const group: any = groupById.get(option.grupo_id);
      if (!group || group.produto_id !== product.id) return json({ error: 'invalid_options' }, 409);
      countsByGroup.set(group.id, (countsByGroup.get(group.id) || 0) + 1);
      additional += Number(option.preco_adicional || 0);
      sanitizedOptions.push({
        grupo_id: group.id,
        grupo_nome: group.nome,
        item_id: option.id,
        item_nome: option.nome,
        preco_adicional: Number(option.preco_adicional || 0),
      });
    }

    for (const group of groupsByProduct.get(product.id) || []) {
      const count = countsByGroup.get(group.id) || 0;
      const min = Math.max(0, Number(group.min_escolhas || (group.obrigatorio ? 1 : 0)));
      const max = Math.max(1, Number(group.max_escolhas || 1));
      if (group.obrigatorio && count < min) return json({ error: 'required_options_missing', group_name: group.nome }, 409);
      if (count > max) return json({ error: 'too_many_options', group_name: group.nome }, 409);
    }

    const unit = Number(product.preco_venda || 0) + additional;
    const rowSubtotal = unit * requested.quantidade;
    subtotal += rowSubtotal;
    itemRows.push({
      produto_id: product.id,
      nome_snapshot: product.nome,
      preco_unitario: unit,
      quantidade: requested.quantidade,
      subtotal: rowSubtotal,
      opcoes_selecionadas: sanitizedOptions,
    });
  }

  if (!Number.isFinite(subtotal) || subtotal <= 0) return json({ error: 'invalid_total' }, 409);

  const { data: pedido, error: pedidoError } = await admin
    .from('pedidos')
    .insert({
      company_id: companyId,
      user_id: company.user_id || null,
      session_id: cleanText(body?.session_id, 200),
      cliente_nome: cleanText(body?.cliente_nome, 120),
      cliente_telefone: cleanText(body?.cliente_telefone, 60),
      subtotal,
      desconto: 0,
      total: subtotal,
      metodo_pagamento: method,
      status: 'aberto',
      observacoes: cleanText(body?.observacoes, 500),
      platform: 'sale_mode',
    })
    .select('id,company_id,session_id,cliente_nome,cliente_telefone,subtotal,desconto,total,cobranca_id,metodo_pagamento,status,observacoes,created_at,updated_at,paid_at')
    .single();

  if (pedidoError || !pedido) return json({ error: 'order_create_failed' }, 500);

  const rows = itemRows.map((row) => ({ ...row, pedido_id: pedido.id }));
  const { error: itemsError } = await admin.from('pedido_itens').insert(rows);
  if (itemsError) {
    await admin.from('pedidos').delete().eq('id', pedido.id).eq('company_id', companyId);
    return json({ error: 'order_items_create_failed' }, 500);
  }

  let mutationToken = '';
  try {
    mutationToken = signOrderMutationToken(pedido.id, companyId);
  } catch {
    await admin.from('pedidos').delete().eq('id', pedido.id).eq('company_id', companyId);
    return json({ error: 'order_mutation_token_failed' }, 500);
  }

  return json({ ok: true, order: pedido, mutation_token: mutationToken });
}
