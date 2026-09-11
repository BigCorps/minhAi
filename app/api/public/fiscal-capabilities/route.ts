import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function cleanCompanyId(value: string | null) {
  const id = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : '';
}

export async function GET(request: NextRequest) {
  const companyId = cleanCompanyId(request.nextUrl.searchParams.get('company_id'));
  if (!companyId) {
    return NextResponse.json({ error: 'company_id_required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: company, error } = await supabase
    .from('companies')
    .select('id,is_active,is_public,nfe_ativo,nfe_plano,brasilnfe_token')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    console.error('[public/fiscal-capabilities] company:', error.message);
    return NextResponse.json({ error: 'company_lookup_failed' }, { status: 500 });
  }

  if (!company || company.is_active !== true) {
    return NextResponse.json({ error: 'company_not_found' }, { status: 404 });
  }

  if (company.is_public !== true) {
    const { data: funcionaria } = await supabase
      .from('funcionaria_company_settings')
      .select('company_id')
      .eq('company_id', companyId)
      .maybeSingle();

    if (!funcionaria) {
      return NextResponse.json({ error: 'company_not_found' }, { status: 404 });
    }
  }

  return NextResponse.json(
    {
      configured: Boolean(String(company.brasilnfe_token || '').trim()),
      active: company.nfe_ativo === true,
      plan: company.nfe_plano ?? null,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}
