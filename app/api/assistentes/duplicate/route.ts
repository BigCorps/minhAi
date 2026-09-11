import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { companyId, newName, newSlug } = await req.json();
  if (!companyId || !newSlug || !newName) {
    return NextResponse.json({ error: 'Nome, slug e empresa são obrigatórios' }, { status: 400 });
  }

  // Operação server-side autorizada pelo proprietário. Usamos service role
  // somente depois de vincular explicitamente a empresa ao user.id.
  const supabase = createAdminClient();

  const { data: original } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!original) {
    return NextResponse.json({ error: 'Assistente não encontrado' }, { status: 404 });
  }

  const {
    id,
    created_at,
    updated_at,
    slug,
    webapp_enabled,
    webapp_configured_at,
    webapp_domain,
    printnode_computer_id,
    printnode_api_key,
    mp_access_token,
    mp_terminal_id,
    receiving_pix_key,
    receiving_pix_key_type,
    wifi_network_password,
    fullscreen_password,
    brasilnfe_token,
    nfe_csc_codigo,
    brasilnfe_ambiente,
    nfe_ativo,
    nfe_cnpj,
    tuya_access_token,
    tuya_refresh_token,
    ...copyFields
  } = original;

  const { data: newCompany, error: companyErr } = await supabase
    .from('companies')
    .insert({
      ...copyFields,
      name: newName,
      slug: newSlug,
      user_id: user.id,
      webapp_enabled: false,
      mp_access_token: null,
      mp_terminal_id: null,
      receiving_pix_key: null,
      receiving_pix_key_type: null,
      wifi_network_password: null,
      fullscreen_password: null,
      printnode_api_key: null,
      brasilnfe_token: null,
      nfe_csc_codigo: null,
      tuya_access_token: null,
      tuya_refresh_token: null,
      nfe_ativo: false,
    })
    .select('id')
    .single();

  if (companyErr || !newCompany) {
    return NextResponse.json({ error: companyErr?.message || 'Erro ao duplicar assistente' }, { status: 500 });
  }

  const { data: funcSettings } = await supabase
    .from('company_function_settings')
    .select('*')
    .eq('company_id', companyId);

  if (funcSettings?.length) {
    const newSettings = funcSettings.map(
      ({ id, company_id, created_at, updated_at, ...rest }: any) => ({
        ...rest,
        company_id: newCompany.id,
      }),
    );
    await supabase.from('company_function_settings').insert(newSettings);
  }

  const { data: produtos } = await supabase
    .from('produtos_venda')
    .select('*')
    .eq('company_id', companyId);

  if (produtos?.length) {
    const newProdutos = produtos.map(
      ({ id, company_id, created_at, updated_at, ...rest }: any) => ({
        ...rest,
        company_id: newCompany.id,
      }),
    );
    await supabase.from('produtos_venda').insert(newProdutos);
  }

  const { data: faqs } = await supabase
    .from('faq_entries')
    .select('*')
    .eq('company_id', companyId);

  if (faqs?.length) {
    const newFaqs = faqs.map(
      ({ id, company_id, created_at, updated_at, usage_count, last_used_at, ...rest }: any) => ({
        ...rest,
        company_id: newCompany.id,
        usage_count: 0,
      }),
    );
    await supabase.from('faq_entries').insert(newFaqs);
  }

  const { data: links } = await supabase
    .from('company_links')
    .select('*')
    .eq('company_id', companyId);

  if (links?.length) {
    const newLinks = links.map(
      ({ id, company_id, created_at, updated_at, ...rest }: any) => ({
        ...rest,
        company_id: newCompany.id,
      }),
    );
    await supabase.from('company_links').insert(newLinks);
  }

  return NextResponse.json({ success: true, newCompanyId: newCompany.id });
}
