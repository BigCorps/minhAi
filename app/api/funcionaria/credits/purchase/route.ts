import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserlessClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const sessionClient = createServerClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { company_id, package_id } = await request.json();
    const companyId = String(company_id || '').trim();
    const packageId = String(package_id || '').trim();
    if (!companyId || !packageId) {
      return NextResponse.json({ ok: false, error: 'company_id e package_id são obrigatórios' }, { status: 400 });
    }

    const admin = createBrowserlessClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: company } = await admin
      .from('companies')
      .select('id,user_id')
      .eq('id', companyId)
      .maybeSingle();
    if (!company?.id || !company.user_id) {
      return NextResponse.json({ ok: false, error: 'Empresa não encontrada' }, { status: 404 });
    }

    let canAccess = company.user_id === user.id;
    if (!canAccess) {
      const { data: adminRow } = await admin
        .from('company_admins')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .maybeSingle();
      canAccess = !!adminRow;
    }
    if (!canAccess) {
      return NextResponse.json({ ok: false, error: 'Sem acesso a esta empresa' }, { status: 403 });
    }

    const { data: packageData } = await admin
      .from('credits_packages')
      .select('id,package_type,is_active,price_cents')
      .eq('id', packageId)
      .maybeSingle();
    if (!packageData || packageData.is_active !== true || packageData.package_type !== 'credits' || Number(packageData.price_cents) <= 0) {
      return NextResponse.json({ ok: false, error: 'Pacote de créditos inválido' }, { status: 400 });
    }

    // A carteira já existente é por usuário responsável; assim o saldo é único
    // para todas as FuncionarIA pertencentes a ele.
    const { data, error } = await admin.functions.invoke('gerar-cobranca-creditos', {
      body: {
        user_id: company.user_id,
        package_id: packageId,
      },
    });

    if (error || !data?.success) {
      console.error('[FuncionarIA credits] gerar-cobranca-creditos:', error || data);
      return NextResponse.json({ ok: false, error: data?.error || error?.message || 'Erro ao criar cobrança' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (error: any) {
    console.error('[FuncionarIA credits] erro:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
