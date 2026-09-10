// supabase/functions/melhoria-disparar-lembretes/index.ts
// Relógio do MelhorIA. Executado pelo pg_cron a cada minuto.
// - push do titular: até 3 tentativas;
// - push do cuidador após 30 min: até 3 tentativas;
// - SMS do cuidador após 60 min: cobrado e idempotente por destinatário.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const BASE_URL = 'https://melhoria.org';
const MIN_ESCALONAR_CUIDADOR = 30;
const MIN_ESCALONAR_SMS = 60;
const LIMITE_POR_RODADA = 200;
const MAX_TENTATIVAS_PUSH = 3;
const MAX_TENTATIVAS_CUIDADOR = 3;
const MAX_TENTATIVAS_SMS = 3;
const CREDITOS_POR_SMS = 2;

interface Push {
  externalId: string;
  titulo: string;
  mensagem: string;
  url: string;
}

async function enviarPush(p: Push): Promise<boolean> {
  // Variáveis próprias do MelhorIA; fallback preserva a configuração atual
  // até as novas credenciais do app OneSignal de melhoria.org serem cadastradas.
  const appId = Deno.env.get('MELHORIA_ONESIGNAL_APP_ID') || Deno.env.get('ONESIGNAL_APP_ID');
  const key = Deno.env.get('MELHORIA_ONESIGNAL_REST_API_KEY') || Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !key) {
    console.error('OneSignal sem credenciais');
    return false;
  }

  try {
    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${key}`,
      },
      body: JSON.stringify({
        app_id: appId,
        headings: { en: p.titulo, pt: p.titulo },
        contents: { en: p.mensagem, pt: p.mensagem },
        url: p.url,
        target_channel: 'push',
        include_aliases: { external_id: [p.externalId] },
        buttons: [
          { id: 'tomei', text: 'Tomei' },
          { id: 'nao_tomei', text: 'Não tomei' },
        ],
        priority: 10,
        ttl: 3600,
      }),
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || json.errors) {
      console.error('OneSignal recusou:', JSON.stringify(json.errors ?? json));
      return false;
    }
    if (Number(json.recipients ?? 0) <= 0) {
      console.warn(`Sem destinatário inscrito para external_id ${p.externalId}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Falha de rede no OneSignal:', e);
    return false;
  }
}

function podeTentar(
  tentativas: number,
  ultima: string | null,
  agora: Date,
  espera1 = 2,
  espera2 = 5,
): boolean {
  if (tentativas >= 3) return false;
  if (!ultima || tentativas <= 0) return true;
  const esperaMin = tentativas === 1 ? espera1 : espera2;
  return agora.getTime() - new Date(ultima).getTime() >= esperaMin * 60_000;
}

async function enviarSms(
  numero: string,
  mensagem: string,
  serviceKey: string,
  supabaseUrl: string,
): Promise<boolean> {
  try {
    const r = await fetch(`${supabaseUrl}/functions/v1/send-sms-gerente`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        number: numero.replace(/\D/g, ''),
        gerente_nome: '',
        motivo: mensagem,
      }),
    });
    const body = await r.json().catch(() => ({}));
    return r.ok && !body?.error;
  } catch (e) {
    console.error('Falha ao enviar SMS:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  const segredo = Deno.env.get('MELHORIA_CRON_SECRET');
  if (!segredo || req.headers.get('x-melhoria-secret') !== segredo) {
    return new Response(JSON.stringify({ error: 'não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const mel = createClient(
    supabaseUrl,
    serviceKey,
    { db: { schema: 'melhoria' }, auth: { persistSession: false } },
  );
  const admin = createClient(
    supabaseUrl,
    serviceKey,
    { auth: { persistSession: false } },
  );

  const agora = new Date();
  const resumo = {
    notificados: 0,
    retries: 0,
    escalonados: 0,
    sms_enviados: 0,
    sms_sem_credito: 0,
    sms_falhas: 0,
    falhas: 0,
  };

  try {
    // 1) Push principal do titular.
    const { data: pendentes, error: erroPendentes } = await mel
      .from('dose_eventos')
      .select(`
        id, previsto_para, perfil_id, push_tentativas, push_ultima_tentativa_em,
        doses!inner ( quantidade, medicamentos!inner ( nome, dosagem ) ),
        perfis!inner ( nome, user_id, timezone )
      `)
      .eq('status', 'pendente')
      .lt('push_tentativas', MAX_TENTATIVAS_PUSH)
      .lte('previsto_para', agora.toISOString())
      .gte('previsto_para', new Date(agora.getTime() - 120 * 60_000).toISOString())
      .order('previsto_para', { ascending: true })
      .limit(LIMITE_POR_RODADA);

    if (erroPendentes) throw erroPendentes;

    for (const ev of pendentes ?? []) {
      const tentativas = Number((ev as any).push_tentativas ?? 0);
      const ultima = (ev as any).push_ultima_tentativa_em as string | null;
      if (!podeTentar(tentativas, ultima, agora, 2, 5)) continue;

      const med = (ev as any).doses?.medicamentos;
      const pes = (ev as any).perfis;
      const nome = med?.nome ?? 'seu remédio';
      const dose = med?.dosagem ? ` (${med.dosagem})` : '';
      const novaTentativa = tentativas + 1;

      const ok = await enviarPush({
        externalId: pes.user_id,
        titulo: 'Hora do remédio',
        mensagem: `${nome}${dose}. Toque para confirmar.`,
        url: `${BASE_URL}/melhoria?dose=${ev.id}`,
      });

      if (ok) {
        const { error } = await mel
          .from('dose_eventos')
          .update({
            status: 'notificado',
            notificado_em: agora.toISOString(),
            canal: 'push',
            push_tentativas: novaTentativa,
            push_ultima_tentativa_em: agora.toISOString(),
            push_erro: null,
          })
          .eq('id', ev.id)
          .eq('status', 'pendente');
        if (error) resumo.falhas++;
        else resumo.notificados++;
      } else {
        const { error } = await mel
          .from('dose_eventos')
          .update({
            push_tentativas: novaTentativa,
            push_ultima_tentativa_em: agora.toISOString(),
            push_erro: 'onesignal_sem_entrega',
          })
          .eq('id', ev.id)
          .eq('status', 'pendente');
        resumo.falhas++;
        if (!error && novaTentativa < MAX_TENTATIVAS_PUSH) resumo.retries++;
      }
    }

    // 2) Push para cuidadores após 30 min.
    const corte30 = new Date(agora.getTime() - MIN_ESCALONAR_CUIDADOR * 60_000);
    const { data: atrasadas, error: erroAtrasadas } = await mel
      .from('dose_eventos')
      .select(`
        id, previsto_para, perfil_id,
        cuidador_push_tentativas, cuidador_push_ultima_tentativa_em,
        doses!inner ( medicamentos!inner ( nome ) ),
        perfis!inner ( nome )
      `)
      .in('status', ['notificado', 'pendente'])
      .is('escalonado_em', null)
      .lt('cuidador_push_tentativas', MAX_TENTATIVAS_CUIDADOR)
      .lte('previsto_para', corte30.toISOString())
      .limit(LIMITE_POR_RODADA);

    if (erroAtrasadas) throw erroAtrasadas;

    for (const ev of atrasadas ?? []) {
      const tentativas = Number((ev as any).cuidador_push_tentativas ?? 0);
      const ultima = (ev as any).cuidador_push_ultima_tentativa_em as string | null;
      if (!podeTentar(tentativas, ultima, agora, 5, 15)) continue;

      const nomeIdoso = (ev as any).perfis?.nome ?? 'Seu familiar';
      const nomeMed = (ev as any).doses?.medicamentos?.nome ?? 'o remédio';
      const { data: cuidadores } = await mel
        .from('cuidadores')
        .select('user_id')
        .eq('perfil_id', ev.perfil_id)
        .eq('status', 'ativo')
        .eq('recebe_escalonamento', true)
        .not('user_id', 'is', null);

      let algumEntregue = false;
      for (const c of cuidadores ?? []) {
        const entregue = await enviarPush({
          externalId: (c as any).user_id,
          titulo: `${nomeIdoso} não confirmou o remédio`,
          mensagem: `${nomeMed} estava marcado para mais de 30 minutos atrás.`,
          url: `${BASE_URL}/melhoria/familia`,
        });
        algumEntregue ||= entregue;
      }

      const novaTentativa = tentativas + 1;
      const semCuidadores = !(cuidadores?.length);
      const esgotou = novaTentativa >= MAX_TENTATIVAS_CUIDADOR;
      const update: Record<string, unknown> = {
        cuidador_push_tentativas: novaTentativa,
        cuidador_push_ultima_tentativa_em: agora.toISOString(),
        cuidador_push_erro: algumEntregue || semCuidadores ? null : 'onesignal_sem_entrega',
      };
      if (algumEntregue || semCuidadores || esgotou) {
        update.escalonado_em = agora.toISOString();
      }

      await mel
        .from('dose_eventos')
        .update(update)
        .eq('id', ev.id)
        .is('escalonado_em', null);

      if (algumEntregue) resumo.escalonados++;
      else if (!semCuidadores) resumo.falhas++;
    }

    // 3) SMS para cuidadores após 60 min.
    // Controle por dose+cuidador evita duplicar SMS quando apenas um envio falha.
    const corte60 = new Date(agora.getTime() - MIN_ESCALONAR_SMS * 60_000);
    const { data: paraSms, error: erroParaSms } = await mel
      .from('dose_eventos')
      .select(`
        id, perfil_id, previsto_para,
        doses!inner ( medicamentos!inner ( nome ) ),
        perfis!inner ( nome, company_id )
      `)
      .in('status', ['notificado', 'pendente'])
      .is('escalonado_sms_em', null)
      .lte('previsto_para', corte60.toISOString())
      .limit(LIMITE_POR_RODADA);

    if (erroParaSms) throw erroParaSms;

    for (const ev of paraSms ?? []) {
      const perfil = (ev as any).perfis;
      const nomeIdoso = perfil?.nome ?? 'Seu familiar';
      const nomeMed = (ev as any).doses?.medicamentos?.nome ?? 'o remédio';
      const companyId = perfil?.company_id;
      if (!companyId) {
        resumo.sms_falhas++;
        continue;
      }

      const { data: cuidadores } = await mel
        .from('cuidadores')
        .select('id, nome, telefone')
        .eq('perfil_id', ev.perfil_id)
        .eq('status', 'ativo')
        .eq('recebe_escalonamento', true)
        .not('telefone', 'is', null);

      const validos = (cuidadores ?? []).filter(
        (c: any) => String(c.telefone ?? '').replace(/\D/g, '').length >= 10,
      );

      if (!validos.length) {
        await mel
          .from('dose_eventos')
          .update({ escalonado_sms_em: agora.toISOString() })
          .eq('id', ev.id)
          .is('escalonado_sms_em', null);
        continue;
      }

      await mel.from('dose_sms_envios').upsert(
        validos.map((c: any) => ({ dose_evento_id: ev.id, cuidador_id: c.id })),
        { onConflict: 'dose_evento_id,cuidador_id', ignoreDuplicates: true },
      );

      const { data: envios } = await mel
        .from('dose_sms_envios')
        .select('id, cuidador_id, status, tentativas')
        .eq('dose_evento_id', ev.id);

      const porId = new Map(validos.map((c: any) => [c.id, c]));
      for (const envio of envios ?? []) {
        if (envio.status === 'enviado' || envio.status === 'sem_credito') continue;
        if (Number(envio.tentativas ?? 0) >= MAX_TENTATIVAS_SMS) continue;
        const cuidador = porId.get(envio.cuidador_id);
        if (!cuidador) continue;

        const { data: cobranca, error: erroCobranca } = await admin.rpc(
          'cobrar_credito_se_suficiente',
          {
            p_company_id: companyId,
            p_function_key: 'enviar_sms',
            p_credits: CREDITOS_POR_SMS,
            p_metadata: {
              marca: 'melhoria',
              origem: 'dose_escalonamento',
              dose_evento_id: ev.id,
              cuidador: cuidador.nome,
            },
          },
        );
        const cob = Array.isArray(cobranca) ? cobranca[0] : cobranca;

        if (erroCobranca || !cob?.sucesso) {
          await mel.from('dose_sms_envios').update({
            status: 'sem_credito',
            ultimo_erro: erroCobranca ? 'falha_cobranca' : 'sem_credito',
            updated_at: agora.toISOString(),
          }).eq('id', envio.id);
          resumo.sms_sem_credito++;
          continue;
        }

        const mensagem = `MelhorIA: ${nomeIdoso} ainda não confirmou ${nomeMed}, previsto há mais de 1 hora. Entre em contato para conferir se está tudo bem.`;
        const ok = await enviarSms(cuidador.telefone, mensagem, serviceKey, supabaseUrl);
        const novaTentativa = Number(envio.tentativas ?? 0) + 1;

        if (ok) {
          await mel.from('dose_sms_envios').update({
            status: 'enviado',
            tentativas: novaTentativa,
            ultimo_erro: null,
            enviado_em: agora.toISOString(),
            updated_at: agora.toISOString(),
          }).eq('id', envio.id);
          resumo.sms_enviados++;
        } else {
          await admin.rpc('cobrar_credito_se_suficiente', {
            p_company_id: companyId,
            p_function_key: 'enviar_sms',
            p_credits: -CREDITOS_POR_SMS,
            p_metadata: {
              marca: 'melhoria',
              origem: 'dose_escalonamento',
              dose_evento_id: ev.id,
              cuidador: cuidador.nome,
              estorno: true,
            },
          });
          await mel.from('dose_sms_envios').update({
            status: 'falhou',
            tentativas: novaTentativa,
            ultimo_erro: 'falha_envio',
            updated_at: agora.toISOString(),
          }).eq('id', envio.id);
          resumo.sms_falhas++;
        }
      }

      const { data: finais } = await mel
        .from('dose_sms_envios')
        .select('status, tentativas')
        .eq('dose_evento_id', ev.id);

      const terminal = (finais ?? []).length > 0 && (finais ?? []).every((x: any) =>
        x.status === 'enviado' ||
        x.status === 'sem_credito' ||
        (x.status === 'falhou' && Number(x.tentativas ?? 0) >= MAX_TENTATIVAS_SMS),
      );

      if (terminal) {
        await mel
          .from('dose_eventos')
          .update({ escalonado_sms_em: agora.toISOString() })
          .eq('id', ev.id)
          .is('escalonado_sms_em', null);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...resumo }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('melhoria-disparar-lembretes:', e);
    return new Response(
      JSON.stringify({ ok: false, erro: String(e), ...resumo }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
