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
    .select('id,is_active,is_public,mp_access_token,mp_terminal_id,receiving_pix_key,infinitepay_handle')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    console.error('[public/payment-capabilities] company:', error.message);
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

  let pixConfigured = Boolean(String(company.receiving_pix_key || '').trim());
  if (!pixConfigured) {
    const { data: pixPreference } = await supabase
      .from('pix_payment_preferences')
      .select('mode')
      .eq('company_id', companyId)
      .eq('product', 'minhai')
      .maybeSingle();
    // Modos legados/provedor podem funcionar sem receiving_pix_key local.
    // No modo free, a chave local continua obrigatória.
    pixConfigured = Boolean(pixPreference?.mode && pixPreference.mode !== 'free');
  }

  return NextResponse.json(
    {
      mp_point_configured:
        Boolean(String(company.mp_access_token || '').trim()) &&
        Boolean(String(company.mp_terminal_id || '').trim()),
      pix_configured: pixConfigured,
      infinitepay_configured: Boolean(String(company.infinitepay_handle || '').trim()),
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}
