import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { companyId } = await req.json();
  const supabase = createClient();

  // Verifica ownership
  const { data: original } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .eq('user_id', user.id)
    .single();

  if (!original) return NextResponse.json({ error: 'Assistente não encontrado' }, { status: 404 });

  // Gera novo slug único
  const baseSlug = `${original.slug}-copia`;
  let newSlug = baseSlug;
  let attempt = 1;
  while (true) {
    const { data: exists } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', newSlug)
      .maybeSingle();
    if (!exists) break;
    newSlug = `${baseSlug}-${++attempt}`;
  }

  // Copia company — exclui campos que devem ser únicos ou não copiados
  const {
    id, created_at, updated_at, slug, webapp_enabled, webapp_configured_at,
    webapp_domain, printnode_computer_id, mp_access_token, mp_terminal_id,
    brasilnfe_token, brasilnfe_ambiente, nfe_ativo, nfe_cnpj,
    ...copyFields
  } = original;

  const { data: newCompany, error: companyErr } = await supabase
    .from('companies')
    .insert({
      ...copyFields,
      slug: newSlug,
      name: `${original.name} (cópia)`,
      user_id: user.id,
      webapp_enabled: false,
      mp_access_token: null,
      mp_terminal_id: null,
      brasilnfe_token: null,
      nfe_ativo: false,
    })
    .select('id')
    .single();

  if (companyErr || !newCompany) {
    return NextResponse.json({ error: companyErr?.message }, { status: 500 });
  }

  // Copia company_function_settings
  const { data: funcSettings } = await supabase
    .from('company_function_settings')
    .select('*')
    .eq('company_id', companyId);

  if (funcSettings?.length) {
    const newSettings = funcSettings.map(({ id, company_id, created_at, updated_at, ...rest }: any) => ({
      ...rest,
      company_id: newCompany.id,
    }));
    await supabase.from('company_function_settings').insert(newSettings);
  }

  // Copia produtos_venda
  const { data: produtos } = await supabase
    .from('produtos_venda')
    .select('*')
    .eq('company_id', companyId);

  if (produtos?.length) {
    const newProdutos = produtos.map(({ id, company_id, created_at, updated_at, ...rest }: any) => ({
      ...rest,
      company_id: newCompany.id,
    }));
    await supabase.from('produtos_venda').insert(newProdutos);
  }

  // Copia faq_entries
  const { data: faqs } = await supabase
    .from('faq_entries')
    .select('*')
    .eq('company_id', companyId);

  if (faqs?.length) {
    const newFaqs = faqs.map(({ id, company_id, created_at, updated_at, usage_count, last_used_at, ...rest }: any) => ({
      ...rest,
      company_id: newCompany.id,
      usage_count: 0,
    }));
    await supabase.from('faq_entries').insert(newFaqs);
  }

  // Copia company_links
  const { data: links } = await supabase
    .from('company_links')
    .select('*')
    .eq('company_id', companyId);

  if (links?.length) {
    const newLinks = links.map(({ id, company_id, created_at, updated_at, ...rest }: any) => ({
      ...rest,
      company_id: newCompany.id,
    }));
    await supabase.from('company_links').insert(newLinks);
  }

  return NextResponse.json({ success: true, newCompanyId: newCompany.id });
}
