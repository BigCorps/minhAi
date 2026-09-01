// app/api/demo/whatsapp/route.ts
//
// Passo 3: recebe { token, phone }, valida, persiste em demo_sessions.
// O telefone normalizado é o identificador que meta-demo-router usa
// para reconhecer a sessão quando a mensagem chegar de fato no
// WhatsApp real.
//
// CORREÇÃO DE BUG REAL (encontrado em teste): o WhatsApp real sempre
// envia from_id com código do país (ex: 5511999998888, 13 dígitos).
// Se o lead digita o telefone sem o "55" (ex: (11) 99999-8888 →
// 11999998888, 11 dígitos), a comparação em meta-demo-router nunca
// batia — a sessão nunca era encontrada. Agora normalizamos sempre
// adicionando "55" na frente quando o número não o tiver (heurística:
// números brasileiros com DDD têm 10 ou 11 dígitos sem o código do
// país; se vier com 12-13 dígitos, já assumimos que o código do país
// já está presente).

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getDemoSessionByToken } from '@/lib/demo-token';

export const runtime = 'nodejs';

/**
 * Normaliza um telefone brasileiro para o formato completo com código
 * do país (55 + DDD + número), sem nenhum outro caractere.
 * Mesma lógica deve ser espelhada em meta-demo-router (Deno) — ver
 * comentário lá referenciando esta função.
 */
function normalizePhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // 10-11 dígitos = DDD + número, sem código do país → adiciona 55.
  // 12-13 dígitos = já deve ter o código do país (55 + DDD + número).
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export async function POST(request: NextRequest) {
  try {
    const { token, phone } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    if (typeof phone !== 'string' || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
    }

    const normalized = normalizePhoneBR(phone);
    if (normalized.length < 12 || normalized.length > 13) {
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
      .update({ phone: normalized, canal_atual: 'whatsapp' })
      .eq('token', token);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[api/demo/whatsapp] Erro:', error.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}