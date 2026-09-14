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

  const admin = createAdminClient();

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id,user_id,is_active')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError) {
    console.error('[public/company-plan-state] company:', companyError.message);
    return NextResponse.json({ error: 'company_lookup_failed' }, { status: 500 });
  }

  if (!company || company.is_active !== true) {
    return NextResponse.json({ error: 'company_not_found' }, { status: 404 });
  }

  if (!company.user_id) {
    return NextResponse.json(
      { active: false },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  }

  const { data: credits, error: creditsError } = await admin
    .from('user_credits')
    .select('has_active_plan,plan_expires_at')
    .eq('user_id', company.user_id)
    .maybeSingle();

  if (creditsError) {
    console.error('[public/company-plan-state] credits:', creditsError.message);
    return NextResponse.json({ error: 'credits_lookup_failed' }, { status: 500 });
  }

  const active =
    credits?.has_active_plan === true &&
    credits.plan_expires_at != null &&
    new Date(credits.plan_expires_at) > new Date();

  // Contrato público mínimo: não expõe user_id, saldo, nome do plano ou validade.
  return NextResponse.json(
    { active },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
