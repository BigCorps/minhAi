import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanUuid } from '@/lib/orders-server';

async function userCanManageCompany(admin: ReturnType<typeof createAdminClient>, userId: string, companyId: string) {
  const { data: company, error } = await admin
    .from('companies')
    .select('id,user_id,is_active')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !company || company.is_active === false) return { allowed: false, company: null };
  if (company.user_id === userId) return { allowed: true, company };

  const { data: adminRow } = await admin
    .from('company_admins')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle();

  return { allowed: !!adminRow, company };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  const questionId = String(body?.question_id || '').trim();
  const resposta = String(body?.resposta || '').trim().slice(0, 2000);

  if (!companyId || !/^\d{1,30}$/.test(questionId) || !resposta) {
    return NextResponse.json({ error: 'Campos obrigatórios inválidos' }, { status: 400 });
  }

  const admin = createAdminClient();
  const access = await userCanManageCompany(admin, user.id, companyId);
  if (!access.company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
  if (!access.allowed) return NextResponse.json({ error: 'Sem permissão para esta empresa' }, { status: 403 });

  const { data: conn } = await admin
    .from('ml_connections')
    .select('access_token,expires_at,refresh_token')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  if (!conn?.access_token) return NextResponse.json({ error: 'Conta ML não conectada' }, { status: 401 });

  const answerRes = await fetch('https://api.mercadolibre.com/answers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question_id: Number(questionId),
      text: resposta,
    }),
  });

  if (!answerRes.ok) {
    const err = await answerRes.json().catch(() => ({}));
    return NextResponse.json({ error: err?.message ?? 'Erro ao postar resposta' }, { status: 422 });
  }

  await admin
    .from('ml_questions')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('ml_question_id', questionId)
    .eq('company_id', companyId);

  return NextResponse.json({ ok: true });
}
