// app/api/demo/whatsapp/route.ts
//
// Passo 3: recebe { token, phone }, valida, persiste em demo_sessions.
// O telefone normalizado (só dígitos) é o identificador que
// meta-demo-router usa para reconhecer a sessão quando a mensagem
// chegar de fato no WhatsApp real.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getDemoSessionByToken } from '@/lib/demo-token';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { token, phone } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    const digits = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
    if (digits.length < 10 || digits.length > 13) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
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

    const supabase = createAdminClient();

    await supabase
      .from('demo_sessions')
      .update({ phone: digits, canal_atual: 'whatsapp' })
      .eq('token', token);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[api/demo/whatsapp] Erro:', error.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}