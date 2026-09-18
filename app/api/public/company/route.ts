import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const SAFE_COMPANY_FIELDS = [
  'id',
  'name',
  'slug',
  'logo_url',
  'webapp_logo_url',
  'webapp_theme_color',
  'assistant_role',
  'assistant_avatar_type',
  'wake_word',
  'greeting_message',
  'website',
  'business_hours',
  'business_address',
  'webapp_enabled',
  'webapp_home',
  'modo_vendas_enabled',
  'modo_fila_enabled',
  'modo_links_enabled',
  'inactivity_timeout_seconds',
  'inactivity_action',
  'tts_voice',
  'voice_speed',
  'delivery_enabled',
  'delivery_who_pays',
  'delivery_min_order_cents',
].join(',');

function cleanSlug(value: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  const slug = cleanSlug(request.nextUrl.searchParams.get('slug'));
  if (!slug) {
    return NextResponse.json({ error: 'slug_required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: company, error } = await supabase
    .from('companies')
    .select(`${SAFE_COMPANY_FIELDS},is_public`)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[public/company] company:', error.message);
    return NextResponse.json({ error: 'company_lookup_failed' }, { status: 500 });
  }
  if (!company) {
    return NextResponse.json({ error: 'company_not_found' }, { status: 404 });
  }

  const { data: funcionariaSettings } = await supabase
    .from('funcionaria_company_settings')
    .select(
      'company_id,workplace_mode,storefront_enabled,public_home_mode,storefront_payment_mode,storefront_commission_bps,primary_color,secondary_color,shirt_color,shirt_detail_color,uniform_logo_url,background_preset,background_url,ai_enabled,voice_input_enabled,whatsapp_mode,avatar_option_id,counter,voice_id,logo_placement',
    )
    .eq('company_id', company.id)
    .maybeSingle();

  if (company.is_public !== true && !funcionariaSettings) {
    return NextResponse.json({ error: 'company_not_found' }, { status: 404 });
  }

  const { is_public: _isPublic, ...publicCompany } = company as any;

  if (!funcionariaSettings) {
    return NextResponse.json(
      {
        company: publicCompany,
        is_funcionaria: false,
        settings: null,
        active_skill_keys: [],
        active_function_keys: [],
        active_modules: [],
      },
      { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } },
    );
  }

  const { data: entitlement, error: entitlementError } = await supabase.rpc(
    'funcionaria_active_entitlements',
    { p_company_id: company.id },
  );

  if (entitlementError) {
    console.error('[public/company] entitlements:', entitlementError.message);
    return NextResponse.json({ error: 'entitlements_lookup_failed' }, { status: 500 });
  }

  const payload = entitlement || {};
  return NextResponse.json(
    {
      company: publicCompany,
      is_funcionaria: true,
      settings: funcionariaSettings,
      active_skill_keys: Array.isArray(payload.skill_keys) ? payload.skill_keys : [],
      active_function_keys: Array.isArray(payload.function_keys) ? payload.function_keys : [],
      active_modules: Array.isArray(payload.modules) ? payload.modules : [],
    },
    { headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=60' } },
  );
}
