// app/api/melhoria/panico/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Disparo do botão de emergência.
//
// ── O QUE FOI REAPROVEITADO DA minhAi ───────────────────────────────────────
// A edge function `send-sms-gerente` é usada EXATAMENTE como o
// EnviarSmsDisplay a usa, com o mesmo payload:
//     { number, gerente_nome, motivo }
// Não mexi nela, não criei outra. É a mesma função, o mesmo provedor (API
// Brasil) e o mesmo formato que já roda em produção.
//
// ── O QUE MUDA AQUI, E POR QUÊ ──────────────────────────────────────────────
// 1. A COBRANÇA. No modal da minhAi, o `send-sms-gerente` é chamado direto do
//    navegador com a ANON KEY e SEM nenhuma chamada de cobrança — quem debita
//    é o `register_function_usage`, disparado quando a função é ABERTA. Cinco
//    SMS com o modal aberto cobram uma vez só. Aqui a cobrança é por
//    destinatário, no servidor, com `cobrar_credito_se_suficiente`, que é
//    fail-closed.
//
// 2. O ENVIO NÃO PODE SER DO NAVEGADOR. Chamar send-sms-gerente do cliente
//    significa que qualquer pessoa com o devtools aberto manda SMS de graça,
//    pulando a cobrança. Numa loja isso é um vazamento pequeno; num app com
//    botão de emergência é um vetor de abuso.
//
// 3. PUSH SEMPRE, SMS SÓ COM CRÉDITO. O botão nunca morre por falta de saldo:
//    push e aviso no app são grátis e saem sempre. O SMS é a camada paga.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { montarSmsPanico, mensagemPanicoPadrao, contarSms } from '@/lib/melhoria/telefone';

export const runtime = 'nodejs';

// Mesmo valor global de assistant_functions.enviar_sms. Não há
// custom_credits_per_use aqui: a MelhorIA usa o preço da minhAi.
const CREDITOS_POR_SMS = 2;

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  ordem: number;
}

async function enviarPush(externalId: string, titulo: string, msg: string, url: string) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const key   = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !key) return false;

  try {
    const r = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${key}` },
      body: JSON.stringify({
        app_id: appId,
        headings: { en: titulo, pt: titulo },
        contents: { en: msg, pt: msg },
        url,
        target_channel: 'push',
        include_aliases: { external_id: [externalId] },
        priority: 10,
      }),
    });
    const j = await r.json();
    return r.ok && !j.errors;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude, precisao, origem } = (await req.json()) as {
      latitude?: number; longitude?: number; precisao?: number;
      origem?: 'botao' | 'texto' | 'ditado';
    };

    const cookieStore = await cookies();
    const comoUsuario = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    );

    const { data: sessao } = await comoUsuario.auth.getUser();
    if (!sessao?.user) {
      return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const mel = admin.schema('melhoria');

    const { data: companies } = await admin
      .from('companies').select('id')
      .eq('user_id', sessao.user.id).eq('segment_key', 'melhoria').limit(1);
    const companyId = companies?.[0]?.id;
    if (!companyId) return NextResponse.json({ erro: 'conta não encontrada' }, { status: 404 });

    const { data: perfis } = await mel
      .from('perfis').select('id, nome, mensagem_panico')
      .eq('company_id', companyId).limit(1);
    const perfil = perfis?.[0];
    if (!perfil) return NextResponse.json({ erro: 'perfil não encontrado' }, { status: 404 });

    const local = latitude && longitude ? { latitude, longitude } : null;
    const texto = montarSmsPanico(
      perfil.mensagem_panico || mensagemPanicoPadrao(perfil.nome),
      local,
    );
    const smsPorContato = contarSms(texto);
    const custoPorContato = smsPorContato * CREDITOS_POR_SMS;

    // ── 1. PUSH para os cuidadores — grátis, sempre, primeiro ─────────────
    // Vem antes do SMS de propósito: é instantâneo e não depende de crédito
    // nem de operadora. Se tudo o mais falhar, isto já saiu.
    const { data: cuidadores } = await mel
      .from('cuidadores')
      .select('user_id, nome')
      .eq('perfil_id', perfil.id)
      .eq('status', 'ativo')
      .eq('recebe_panico', true)
      .not('user_id', 'is', null);

    let pushEnviados = 0;
    for (const c of cuidadores ?? []) {
      const ok = await enviarPush(
        (c as any).user_id,
        `${perfil.nome} precisa de ajuda`,
        local
          ? 'Botão de emergência acionado. Toque para ver onde.'
          : 'Botão de emergência acionado no aplicativo.',
        'https://melhoria.org/melhoria/emergencia',
      );
      if (ok) pushEnviados++;
    }

    // ── 2. SMS — só com crédito, cobrado por destinatário ─────────────────
    const { data: contatos } = await mel
      .from('contatos_emergencia')
      .select('id, nome, telefone, ordem')
      .eq('perfil_id', perfil.id)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    const notificados: any[] = [];
    let smsEnviados = 0;
    let bloqueados = 0;

    for (const contato of (contatos ?? []) as Contato[]) {
      // Cobra ANTES de mandar. Se o saldo acabar no meio da lista, os
      // primeiros já receberam e os últimos voltam 'sem_credito' — e a tela
      // mostra exatamente isso, nome por nome.
      const { data: cobranca } = await admin.rpc('cobrar_credito_se_suficiente', {
        p_company_id: companyId,
        p_function_key: 'enviar_sms',
        p_credits: custoPorContato,
        p_metadata: { marca: 'melhoria', origem: 'panico', contato: contato.nome },
      });

      const res = Array.isArray(cobranca) ? cobranca[0] : cobranca;

      if (!res?.sucesso) {
        bloqueados++;
        notificados.push({
          nome: contato.nome, canal: 'sms', status: 'sem_credito',
        });
        continue;
      }

      try {
        // Mesmo payload do EnviarSmsDisplay. Não inventamos formato novo.
        const r = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-sms-gerente`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              number: contato.telefone.replace(/\D/g, ''),
              gerente_nome: '',
              motivo: texto,
            }),
          },
        );

        const resultado = await r.json();

        if (!r.ok || resultado?.error) throw new Error(resultado?.error ?? 'falhou');

        smsEnviados++;
        notificados.push({ nome: contato.nome, canal: 'sms', status: 'enviado' });
      } catch (e) {
        // Não entregou: devolve o crédito. Cobrar por SMS que não saiu é
        // errado, e neste contexto é especialmente errado.
        await admin.rpc('cobrar_credito_se_suficiente', {
          p_company_id: companyId,
          p_function_key: 'enviar_sms',
          p_credits: -custoPorContato,
          p_metadata: { marca: 'melhoria', origem: 'panico', estorno: true },
        });

        notificados.push({
          nome: contato.nome, canal: 'sms', status: 'falhou', erro: String(e).slice(0, 120),
        });
      }
    }

    // ── 3. Registro ───────────────────────────────────────────────────────
    const { data: evento } = await mel
      .from('panico_eventos')
      .insert({
        perfil_id: perfil.id,
        origem: origem ?? 'botao',
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        precisao_m: precisao ? Math.round(precisao) : null,
        contatos_notificados: notificados,
        push_enviados: pushEnviados,
        sms_enviados: smsEnviados,
        sms_bloqueados_sem_credito: bloqueados,
        status: 'disparado',
      })
      .select('id')
      .single();

    return NextResponse.json({
      ok: true,
      eventoId: evento?.id,
      pushEnviados,
      smsEnviados,
      bloqueados,
      notificados,
      // A tela usa isto para dizer o que FOI feito antes de falar em recarga.
      semContatos: (contatos ?? []).length === 0,
    });
  } catch (e) {
    console.error('/api/melhoria/panico:', e);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
