// app/api/demo/email/route.ts
//
// Passo 2: recebe { token, email }, valida, persiste em demo_sessions,
// e invoca a Edge Function enviar-email-demo (email_type:
// 'confirmacao_lead') para disparar a confirmação mock.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getDemoSessionByToken } from '@/lib/demo-token';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
    }

    const session = await getDemoSessionByToken(token);

    if (!session) {
      return NextResponse.json(
        { error: 'SESSAO_EXPIRADA', message: 'Esta demonstração expirou.' },
        { status: 410 }
      );
    }

    if (!session.objetivo_cumprido) {
      return NextResponse.json(
        { error: 'Objetivo da demonstração ainda não foi cumprido.' },
        { status: 400 }
      );
    }

    const emailTrimmed = email.trim();
    const supabase = createAdminClient();

    // Persiste o e-mail e avança o canal_atual, antes de disparar o envio
    await supabase
      .from('demo_sessions')
      .update({ email: emailTrimmed, canal_atual: 'email' })
      .eq('token', token);

    const tipoObjetivo: 'pedido' | 'horario' = ['clinica', 'servicos', 'academia'].includes(
      session.ramo
    )
      ? 'horario'
      : 'pedido';

    const { error: invokeError } = await supabase.functions.invoke('enviar-email-demo', {
      body: {
        email_type: 'confirmacao_lead',
        to: emailTrimmed,
        nome_negocio: session.nome_negocio,
        produto: session.produto,
        preco: session.preco,
        tipo_objetivo: tipoObjetivo,
        horario: session.horario_marcado ?? undefined,
        nome_lead: session.nome_lead,
      },
    });

    if (invokeError) {
      console.error('[api/demo/email] Erro ao invocar enviar-email-demo:', invokeError.message);
      return NextResponse.json(
        { error: 'Não foi possível enviar o e-mail agora. Tente novamente.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[api/demo/email] Erro:', error.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}