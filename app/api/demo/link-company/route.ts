// app/api/demo/link-company/route.ts
//
// Passo 4 (fim do funil): vincula a demo_session ao usuário/empresa
// recém-criados, marca status='concluido', e dispara o e-mail de
// relatório interno (email_type: 'relatorio_interno') para
// ith.almeida@gmail.com, via enviar-email-demo.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getDemoSessionByToken } from '@/lib/demo-token';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { token, companyId } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });
    }
    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json({ error: 'companyId obrigatório' }, { status: 400 });
    }

    const session = await getDemoSessionByToken(token);
    if (!session) {
      // Sessão já expirou — não é um erro grave aqui (a empresa real
      // já foi criada de qualquer forma), só não conseguimos vincular
      // analytics. Responde OK para não gerar erro confuso no client.
      return NextResponse.json({ success: true, linked: false });
    }

    const supabase = createAdminClient();

    // Busca o user_id dono da company recém-criada, para preencher
    // linked_user_id corretamente.
    const { data: company } = await supabase
      .from('companies')
      .select('user_id')
      .eq('id', companyId)
      .maybeSingle();

    await supabase
      .from('demo_sessions')
      .update({
        status: 'concluido',
        linked_company_id: companyId,
        linked_user_id: company?.user_id ?? null,
        linked_at: new Date().toISOString(),
      })
      .eq('token', token);

    // ── Dispara e-mail de relatório interno (fire-and-forget) ──────
    // Decisão confirmada: só campos estruturados, sem resumo por IA.
    supabase.functions
      .invoke('enviar-email-demo', {
        body: {
          email_type: 'relatorio_interno',
          token: session.token,
          ramo: session.ramo,
          nome_negocio: session.nome_negocio,
          produto: session.produto,
          preco: session.preco,
          nome_lead: session.nome_lead,
          email_lead: session.email,
          phone_lead: session.phone,
          objetivo_cumprido: session.objetivo_cumprido,
          canal_atual: session.canal_atual,
          status: 'concluido',
          utm_source: session.utm_source,
          utm_medium: session.utm_medium,
          utm_campaign: session.utm_campaign,
          origem_simples: session.origem_simples,
        },
      })
      .catch((err: any) => {
        console.error('[api/demo/link-company] Erro ao enviar relatório interno:', err.message);
      });

    return NextResponse.json({ success: true, linked: true });
  } catch (error: any) {
    console.error('[api/demo/link-company] Erro:', error.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}