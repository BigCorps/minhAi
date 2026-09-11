import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RequestedItem = { produto_id: string; quantidade: number };

function normalizeItems(value: unknown): RequestedItem[] {
  if (!Array.isArray(value)) return [];
  const map = new Map<string, number>();
  for (const raw of value.slice(0, 50)) {
    const id = String(raw?.produto_id || '').trim();
    const qty = Math.max(1, Math.min(50, Math.floor(Number(raw?.quantidade || 0))));
    if (!id || !Number.isFinite(qty)) continue;
    map.set(id, Math.min(50, (map.get(id) || 0) + qty));
  }
  return [...map.entries()].map(([produto_id, quantidade]) => ({ produto_id, quantidade }));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = String(body?.company_id || '').trim();
  const clienteNome = String(body?.cliente_nome || '').trim().slice(0, 120) || null;
  const observacoes = String(body?.observacoes || '').trim().slice(0, 500) || null;
  const items = normalizeItems(body?.itens);

  if (!companyId || !items.length) {
    return NextResponse.json({ error: 'invalid_order' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: company } = await supabase
    .from('companies')
    .select('id,name,is_active,is_public')
    .eq('id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  if (!company) return NextResponse.json({ error: 'company_not_found' }, { status: 404 });

  const { data: settings } = await supabase
    .from('funcionaria_company_settings')
    .select('company_id')
    .eq('company_id', companyId)
    .maybeSingle();
  if (!settings) return NextResponse.json({ error: 'not_funcionaria' }, { status: 404 });

  const { data: entitlements, error: entitlementError } = await supabase.rpc(
    'funcionaria_active_entitlements',
    { p_company_id: companyId },
  );
  if (entitlementError) {
    console.error('[funcionaria/public-order] entitlements:', entitlementError.message);
    return NextResponse.json({ error: 'entitlements_lookup_failed' }, { status: 500 });
  }

  const skills: string[] = Array.isArray(entitlements?.skill_keys) ? entitlements.skill_keys : [];
  if (!skills.includes('sales_orders')) {
    return NextResponse.json({ error: 'sales_skill_not_active' }, { status: 403 });
  }

  const productIds = items.map((item) => item.produto_id);
  const { data: products, error: productsError } = await supabase
    .from('produtos_venda')
    .select('id,nome,preco_venda,estoque_atual,controla_estoque,is_active')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .in('id', productIds);

  if (productsError || !products || products.length !== productIds.length) {
    return NextResponse.json({ error: 'invalid_products' }, { status: 409 });
  }

  const byId = new Map(products.map((p: any) => [p.id, p]));
  let subtotal = 0;
  for (const item of items) {
    const product: any = byId.get(item.produto_id);
    if (!product) return NextResponse.json({ error: 'invalid_products' }, { status: 409 });
    if (product.controla_estoque === true && Number(product.estoque_atual || 0) < item.quantidade) {
      return NextResponse.json(
        { error: 'insufficient_stock', product_name: product.nome },
        { status: 409 },
      );
    }
    subtotal += Number(product.preco_venda || 0) * item.quantidade;
  }

  if (skills.includes('checkout_payments')) {
    const { data, error } = await supabase.rpc('funcionaria_criar_checkout', {
      p_company_id: companyId,
      p_itens: items,
      p_cliente_nome: clienteNome,
      p_observacoes: observacoes,
    });
    if (error) {
      console.error('[funcionaria/public-order] checkout:', error.message);
      return NextResponse.json({ error: error.message || 'checkout_create_failed' }, { status: 409 });
    }
    const checkout = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ ok: true, kind: 'checkout', checkout });
  }

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      company_id: companyId,
      cliente_nome: clienteNome,
      subtotal,
      desconto: 0,
      total: subtotal,
      status: 'aberto',
      observacoes,
      platform: 'funcionaria_web',
    })
    .select('id,total,status')
    .single();

  if (pedidoError || !pedido) {
    console.error('[funcionaria/public-order] pedido:', pedidoError?.message);
    return NextResponse.json({ error: 'order_create_failed' }, { status: 500 });
  }

  const rows = items.map((item) => {
    const product: any = byId.get(item.produto_id);
    const unit = Number(product.preco_venda || 0);
    return {
      pedido_id: pedido.id,
      produto_id: item.produto_id,
      nome_snapshot: product.nome,
      preco_unitario: unit,
      quantidade: item.quantidade,
      subtotal: unit * item.quantidade,
    };
  });

  const { error: itemsError } = await supabase.from('pedido_itens').insert(rows);
  if (itemsError) {
    console.error('[funcionaria/public-order] itens:', itemsError.message);
    await supabase.from('pedidos').delete().eq('id', pedido.id);
    return NextResponse.json({ error: 'order_items_create_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    kind: 'order',
    order: {
      pedido_id: pedido.id,
      total: Number(pedido.total || subtotal),
      status: pedido.status,
    },
  });
}
