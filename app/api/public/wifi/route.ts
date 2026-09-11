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
    .select('id,name,is_active,is_public,wifi_network_name,wifi_network_password')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    console.error('[public/wifi] company:', error.message);
    return NextResponse.json({ error: 'company_lookup_failed' }, { status: 500 });
  }
  if (!company || company.is_active !== true) {
    return NextResponse.json({ error: 'company_not_found' }, { status: 404 });
  }

  const { data: funcionaria } = await supabase
    .from('funcionaria_company_settings')
    .select('company_id')
    .eq('company_id', companyId)
    .maybeSingle();

  let featureEnabled = false;

  if (funcionaria) {
    const { data: entitlement, error: entitlementError } = await supabase.rpc(
      'funcionaria_active_entitlements',
      { p_company_id: companyId },
    );
    if (entitlementError) {
      console.error('[public/wifi] entitlement:', entitlementError.message);
      return NextResponse.json({ error: 'entitlement_lookup_failed' }, { status: 500 });
    }
    const keys = Array.isArray(entitlement?.function_keys) ? entitlement.function_keys : [];
    featureEnabled = keys.includes('wifi_qrcode');
  } else if (company.is_public === true) {
    const { data: setting } = await supabase
      .from('company_function_settings')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('function_key', 'wifi_qrcode')
      .maybeSingle();
    featureEnabled = setting?.is_enabled === true;
  }

  if (!featureEnabled) {
    return NextResponse.json({ error: 'wifi_not_available' }, { status: 404 });
  }

  const networkName = String(company.wifi_network_name || '').trim();
  if (!networkName) {
    return NextResponse.json({ error: 'wifi_not_configured' }, { status: 404 });
  }

  return NextResponse.json(
    {
      wifi_network_name: networkName,
      wifi_network_password: String(company.wifi_network_password || ''),
      name: String(company.name || ''),
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}
