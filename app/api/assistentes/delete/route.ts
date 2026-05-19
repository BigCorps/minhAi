import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { companyId } = await req.json();
  if (!companyId) return NextResponse.json({ error: 'companyId obrigatório' }, { status: 400 });

  const supabase = createClient();

  // Verifica ownership
  const { data: company } = await supabase
    .from('companies')
    .select('id, slug')
    .eq('id', companyId)
    .eq('user_id', user.id)
    .single();

  if (!company) return NextResponse.json({ error: 'Assistente não encontrado' }, { status: 404 });

  // Deleta na ordem correta para respeitar foreign keys
  const tables = [
    { table: 'pedido_itens',              fk: 'pedido_id',    via: 'pedidos' },
    { table: 'commission_pending',        fk: 'company_id' },
    { table: 'pix_transactions',          fk: 'company_id' },
    { table: 'pedidos',                   fk: 'company_id' },
    { table: 'cobrancas',                 fk: 'company_id' },
    { table: 'meta_connections',          fk: 'company_id' },
    { table: 'company_function_settings', fk: 'company_id' },
    { table: 'faq_entries',               fk: 'company_id' },
    { table: 'company_links',             fk: 'company_id' },
    { table: 'produtos_venda',            fk: 'company_id' },
    { table: 'assistant_function_logs',   fk: 'company_id' },
    { table: 'assistant_sessions',        fk: 'company_id' },
    { table: 'conversations',             fk: 'company_id' },
    { table: 'fila_configs',              fk: 'company_id' },
    { table: 'fila_senhas',               fk: 'company_id' },
    { table: 'company_profiles',          fk: 'company_id' },
    { table: 'company_prompts',           fk: 'company_id' },
    { table: 'registration_configs',      fk: 'company_id' },
    { table: 'registrations',             fk: 'company_id' },
    { table: 'notas',                     fk: 'company_id' },
    { table: 'lista_compras',             fk: 'company_id' },
    { table: 'google_accounts',           fk: 'company_id' },
    { table: 'customer_appointments',     fk: 'company_id' },
    { table: 'company_balance',           fk: 'company_id' },
    { table: 'balance_transactions',      fk: 'company_id' },
    { table: 'company_admins',            fk: 'company_id' },
  ];

  // Deleta pedido_itens via pedidos primeiro
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id')
    .eq('company_id', companyId);

  if (pedidos?.length) {
    const pedidoIds = pedidos.map(p => p.id);
    await supabase.from('pedido_itens').delete().in('pedido_id', pedidoIds);
    await supabase.from('mp_orders').delete().in('pedido_id', pedidoIds);
  }

  // Deleta messages via conversations
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .eq('company_id', companyId);

  if (convs?.length) {
    const convIds = convs.map(c => c.id);
    await supabase.from('messages').delete().in('conversation_id', convIds);
  }

  // Deleta profile_sessions via company_profiles
  const { data: profiles } = await supabase
    .from('company_profiles')
    .select('id')
    .eq('company_id', companyId);

  if (profiles?.length) {
    const profileIds = profiles.map(p => p.id);
    await supabase.from('profile_sessions').delete().in('profile_id', profileIds);
  }

  // Deleta pesquisas e respostas
  const { data: pesquisas } = await supabase
    .from('pesquisas')
    .select('id')
    .eq('company_id', companyId);

  if (pesquisas?.length) {
    const pesquisaIds = pesquisas.map(p => p.id);
    await supabase.from('pesquisa_respostas').delete().in('pesquisa_id', pesquisaIds);
    await supabase.from('pesquisa_perguntas').delete().in('pesquisa_id', pesquisaIds);
    await supabase.from('pesquisas').delete().in('id', pesquisaIds);
  }

  // Deleta fila_senhas via fila_configs
  const { data: filaConfigs } = await supabase
    .from('fila_configs')
    .select('id')
    .eq('company_id', companyId);

  if (filaConfigs?.length) {
    const filaIds = filaConfigs.map(f => f.id);
    await supabase.from('fila_senhas').delete().in('fila_config_id', filaIds);
  }

  // Deleta tabelas diretas por company_id
  for (const { table, fk, via } of tables) {
    if (via) continue; // já tratadas acima
    await supabase.from(table as any).delete().eq(fk, companyId);
  }

  // Por último, deleta a company
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
