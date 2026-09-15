import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanUuid, resolveCompanyActor } from '@/lib/orders-server';

const PROFILE_TYPES = ['administrador','gerente','atendente','caixa','funcionario','colaborador','cliente','morador'];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  if (!companyId) return NextResponse.json({ error: 'invalid_company_id' }, { status: 400 });

  try {
    const { actor } = await resolveCompanyActor(request, body, companyId, PROFILE_TYPES);
    const admin = createAdminClient();
    let profileId = actor.profileId || null;

    if (!profileId && actor.kind === 'supabase_user') {
      const { data: fallback } = await admin
        .from('company_profiles')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .in('tipo', ['administrador','gerente','caixa','atendente','funcionario','colaborador'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      profileId = fallback?.id || null;
    }

    if (!profileId) return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    const { data: profile } = await admin
      .from('company_profiles')
      .select('id,company_id,tipo,nome,identificador,email,telefone,is_active,created_at')
      .eq('id', profileId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (error: any) {
    const message = String(error?.message || 'forbidden');
    return NextResponse.json({ error: message }, { status: message === 'unauthorized' ? 401 : 403 });
  }
}
