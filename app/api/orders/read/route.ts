import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanUuid, resolveCompanyActor } from '@/lib/orders-server';

const STAFF_TYPES = ['administrador','gerente','atendente','caixa','funcionario','colaborador'];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  const mode = String(body?.mode || 'customer');
  if (!companyId) return NextResponse.json({ error: 'invalid_company_id' }, { status: 400 });
  const admin = createAdminClient();

  try {
    if (mode === 'customer') {
      const { actor } = await resolveCompanyActor(request, body, companyId, ['cliente']);
      if (!actor.profileId) return NextResponse.json({ error: 'customer_profile_required' }, { status: 403 });
      const { data: orders, error } = await admin
        .from('pedidos')
        .select('id,company_id,profile_id,total,status,created_at,metodo_pagamento,cliente_nome')
        .eq('company_id', companyId)
        .eq('profile_id', actor.profileId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const ids = (orders || []).map((o: any) => o.id);
      let items: any[] = [];
      if (ids.length) {
        const { data } = await admin.from('pedido_itens')
          .select('pedido_id,nome_snapshot,quantidade,preco_unitario,subtotal')
          .in('pedido_id', ids);
        items = data || [];
      }
      return NextResponse.json({ orders: (orders || []).map((o: any) => ({
        ...o,
        numero_pedido: String(o.id).slice(0,8).toUpperCase(),
        tipo_pagamento: o.metodo_pagamento,
        itens: items.filter((i: any) => i.pedido_id === o.id).map((i: any) => ({
          produto_nome: i.nome_snapshot || 'Produto', quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario), subtotal: Number(i.subtotal),
        })),
      })) });
    }

    if (mode === 'clients') {
      await resolveCompanyActor(request, body, companyId, STAFF_TYPES);
      const { data: clients, error } = await admin
        .from('company_profiles')
        .select('id,nome,email,telefone,identificador,created_at')
        .eq('company_id', companyId)
        .eq('tipo', 'cliente')
        .eq('is_active', true)
        .order('nome', { ascending: true });
      if (error) throw error;
      const ids = (clients || []).map((c: any) => c.id);
      let orders: any[] = [];
      if (ids.length) {
        const { data } = await admin.from('pedidos')
          .select('profile_id,created_at')
          .eq('company_id', companyId)
          .in('profile_id', ids)
          .order('created_at', { ascending: false });
        orders = data || [];
      }
      return NextResponse.json({ clients: (clients || []).map((c: any) => {
        const own = orders.filter((o: any) => o.profile_id === c.id);
        return { ...c, total_pedidos: own.length, ultimo_pedido: own[0]?.created_at || null };
      }) });
    }

    return NextResponse.json({ error: 'unsupported_mode' }, { status: 400 });
  } catch (error: any) {
    const message = String(error?.message || 'forbidden');
    return NextResponse.json({ error: message }, { status: message === 'unauthorized' ? 401 : 403 });
  }
}
