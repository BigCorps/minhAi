// supabase/functions/melhoria-agenda-alertas/index.ts
// Alertas de consulta/exame. Cron a cada minuto.
// Até 3 tentativas por alerta; recipients=0 conta como falha de entrega.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const APP = 'https://melhoria.org';
const TZ = 'America/Sao_Paulo';
const LOTE = 150;
const MAX_TENTATIVAS_PUSH = 3;

function hora(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  }).format(new Date(iso));
}

function diaEHora(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  }).format(new Date(iso));
}

async function push(externalId: string, titulo: string, mensagem: string, url: string): Promise<boolean> {
  const appId = Deno.env.get('MELHORIA_ONESIGNAL_APP_ID') || Deno.env.get('ONESIGNAL_APP_ID');
  const key = Deno.env.get('MELHORIA_ONESIGNAL_REST_API_KEY') || Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !key) {
    console.error('OneSignal sem credenciais');
    return false;
  }

  try {
    const r = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${key}` },
      body: JSON.stringify({
        app_id: appId,
        headings: { en: titulo, pt: titulo },
        contents: { en: mensagem, pt: mensagem },
        url,
        target_channel: 'push',
        include_aliases: { external_id: [externalId] },
        priority: 10,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.errors) {
      console.error('OneSignal:', j.errors ?? j);
      return false;
    }
    if (Number(j.recipients ?? 0) <= 0) {
      console.warn(`sem inscrição para ${externalId}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error('rede OneSignal:', e);
    return false;
  }
}

function podeTentarPush(tentativas: number, ultima: string | null, agora: Date): boolean {
  if (tentativas >= MAX_TENTATIVAS_PUSH) return false;
  if (!ultima || tentativas <= 0) return true;
  const esperaMin = tentativas === 1 ? 2 : 5;
  return agora.getTime() - new Date(ultima).getTime() >= esperaMin * 60_000;
}

function texto(tipo: string, ag: any): { titulo: string; msg: string } | null {
  const oQue = ag.tipo === 'exame' ? 'Exame' : ag.tipo === 'vacina' ? 'Vacina' : 'Consulta';
  const onde = ag.local ? ` em ${ag.local}` : '';

  switch (tipo) {
    case '7d':
      return { titulo: `${oQue} daqui a uma semana`, msg: `${ag.titulo} — ${diaEHora(ag.data_hora)}${onde}.` };
    case '1d':
      return {
        titulo: `${oQue} amanhã`,
        msg: `${ag.titulo} às ${hora(ag.data_hora)}${onde}.${ag.levar?.length ? ` Levar: ${ag.levar.join(', ')}.` : ''}`,
      };
    case '3h':
      return { titulo: `${oQue} hoje às ${hora(ag.data_hora)}`, msg: `${ag.titulo}${onde}. Faltam cerca de 3 horas.` };
    case '1h':
      return { titulo: `${oQue} em 1 hora`, msg: `${ag.titulo} às ${hora(ag.data_hora)}${onde}. Hora de se preparar.` };
    case 'preparo':
      return {
        titulo: 'Comece o jejum agora',
        msg: `Não coma nem beba nada até o exame, às ${hora(ag.data_hora)}.${ag.preparo ? ` ${ag.preparo}` : ''}`,
      };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  const segredo = Deno.env.get('MELHORIA_CRON_SECRET');
  if (!segredo || req.headers.get('x-melhoria-secret') !== segredo) {
    return new Response(JSON.stringify({ error: 'não autorizado' }), { status: 401 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { db: { schema: 'melhoria' }, auth: { persistSession: false } },
  );

  const agora = new Date();
  const resumo = { enviados: 0, retries: 0, falhas: 0, vencidos: 0 };

  try {
    const { data: alertas, error: erroAlertas } = await admin
      .from('agenda_alertas')
      .select(`
        id, tipo, disparar_em, push_tentativas, push_ultima_tentativa_em,
        agendamentos!inner (
          id, titulo, tipo, local, data_hora, preparo, levar, status,
          perfis!inner ( user_id )
        )
      `)
      .eq('status', 'pendente')
      .lt('push_tentativas', MAX_TENTATIVAS_PUSH)
      .lte('disparar_em', agora.toISOString())
      .order('disparar_em', { ascending: true })
      .limit(LOTE);

    if (erroAlertas) throw erroAlertas;

    for (const a of alertas ?? []) {
      const ag = (a as any).agendamentos;

      if (!ag || ['cancelado', 'realizado', 'faltou'].includes(ag.status)) {
        await admin.from('agenda_alertas').update({ status: 'cancelado' }).eq('id', a.id);
        continue;
      }

      const atraso = agora.getTime() - new Date(a.disparar_em).getTime();
      if (atraso > 2 * 60 * 60_000) {
        await admin.from('agenda_alertas').update({ status: 'cancelado' }).eq('id', a.id);
        resumo.vencidos++;
        continue;
      }

      const tentativas = Number((a as any).push_tentativas ?? 0);
      const ultima = (a as any).push_ultima_tentativa_em as string | null;
      if (!podeTentarPush(tentativas, ultima, agora)) continue;

      const t = texto(a.tipo, ag);
      if (!t) continue;
      const novaTentativa = tentativas + 1;

      const ok = await push(
        ag.perfis.user_id,
        t.titulo,
        t.msg,
        `${APP}/melhoria/agenda?compromisso=${ag.id}`,
      );

      if (ok) {
        const { error } = await admin.from('agenda_alertas')
          .update({
            status: 'enviado',
            enviado_em: agora.toISOString(),
            push_tentativas: novaTentativa,
            push_ultima_tentativa_em: agora.toISOString(),
            push_erro: null,
          })
          .eq('id', a.id)
          .eq('status', 'pendente');
        if (error) resumo.falhas++;
        else resumo.enviados++;
      } else {
        const { error } = await admin.from('agenda_alertas')
          .update({
            push_tentativas: novaTentativa,
            push_ultima_tentativa_em: agora.toISOString(),
            push_erro: 'onesignal_sem_entrega',
          })
          .eq('id', a.id)
          .eq('status', 'pendente');
        if (error) resumo.falhas++;
        else {
          resumo.falhas++;
          if (novaTentativa < MAX_TENTATIVAS_PUSH) resumo.retries++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, ...resumo }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('melhoria-agenda-alertas:', e);
    return new Response(
      JSON.stringify({ ok: false, erro: String(e), ...resumo }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
