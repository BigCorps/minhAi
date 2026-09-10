// app/api/melhoria/panico/route.ts
// Disparo do botão de emergência do MelhorIA.
// Push é gratuito; SMS é cobrado por destinatário e estornado se o provedor falhar.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { montarSmsPanico, mensagemPanicoPadrao, contarSms } from '@/lib/melhoria/telefone';

export const runtime = 'nodejs';

const CREDITOS_POR_SMS = 2;

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  ordem: number;
}

async function enviarPush(externalId: string, titulo: string, msg: string, url: string) {
  // Credenciais próprias do MelhorIA. O fallback mantém compatibilidade até
  // as novas variáveis serem cadastradas no Vercel.
  const appId =
    process.env.NEXT_PUBLIC_MELHORIA_ONESIGNAL_APP_ID ||
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const key =
    process.env.MELHORIA_ONESIGNAL_REST_API_KEY ||
    process.env.ONESIGNAL_REST_API_KEY;

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

    const j = await r.json().catch(() => ({}));
    // HTTP 200 com recipients=0 NÃO é entrega. O frontend só pode dizer que
    // avisou alguém quando existe pelo menos um destinatário real.
    return r.ok && !j.errors && Number(j.recipients ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude, precisao, origem } = (await req.json()) as {
      latitude?: number;
      longitude?: number;
      precisao?: number;
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
      .from('companies')
      .select('id')
      .eq('user_id', sessao.user.id)
      .eq('segment_key', 'melhoria')
      .limit(1);

    const companyId = companies?.[0]?.id;
    if (!companyId) {
      return NextResponse.json({ erro: 'conta não encontrada' }, { status: 404 });
    }

    const { data: perfis } = await mel
      .from('perfis')
      .select('id, nome, mensagem_panico')
      .eq('company_id', companyId)
      .limit(1);

    const perfil = perfis?.[0];
    if (!perfil) {
      return NextResponse.json({ erro: 'perfil não encontrado' }, { status: 404 });
    }

    const temLocal = Number.isFinite(latitude) && Number.isFinite(longitude);
    const local = temLocal ? { latitude: latitude!, longitude: longitude! } : null;
    const texto = montarSmsPanico(
      perfil.mensagem_panico || mensagemPanicoPadrao(perfil.nome),
      local,
    );
    const smsPorContato = contarSms(texto);
    const custoPorContato = smsPorContato * CREDITOS_POR_SMS;

    // 1. Push para cuidadores — grátis e sempre primeiro.
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

    // 2. SMS — cobra antes de cada destinatário.
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
      const { data: cobranca } = await admin.rpc('cobrar_credito_se_suficiente', {
        p_company_id: companyId,
        p_function_key: 'enviar_sms',
        p_credits: custoPorContato,
        p_metadata: { marca: 'melhoria', origem: 'panico', contato: contato.nome },
      });

      const res = Array.isArray(cobranca) ? cobranca[0] : cobranca;

      if (!res?.sucesso) {
        bloqueados++;
        notificados.push({ nome: contato.nome, canal: 'sms', status: 'sem_credito' });
        continue;
      }

      try {
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

        const resultado = await r.json().catch(() => ({}));
        if (!r.ok || resultado?.error) throw new Error(resultado?.error ?? 'falhou');

        smsEnviados++;
        notificados.push({ nome: contato.nome, canal: 'sms', status: 'enviado' });
      } catch (e) {
        // Não entregou: devolve o crédito.
        await admin.rpc('cobrar_credito_se_suficiente', {
          p_company_id: companyId,
          p_function_key: 'enviar_sms',
          p_credits: -custoPorContato,
          p_metadata: { marca: 'melhoria', origem: 'panico', estorno: true },
        });

        notificados.push({
          nome: contato.nome,
          canal: 'sms',
          status: 'falhou',
          erro: String(e).slice(0, 120),
        });
      }
    }

    // 3. Registro do disparo.
    const { data: evento } = await mel
      .from('panico_eventos')
      .insert({
        perfil_id: perfil.id,
        origem: origem ?? 'botao',
        latitude: temLocal ? latitude : null,
        longitude: temLocal ? longitude : null,
        precisao_m: Number.isFinite(precisao) ? Math.round(precisao!) : null,
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
      semContatos: (contatos ?? []).length === 0,
    });
  } catch (e) {
    console.error('/api/melhoria/panico:', e);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
