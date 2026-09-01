// supabase/functions/melhoria-disparar-lembretes/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// O relógio da MelhorIA. Roda a cada minuto, chamada pelo pg_cron.
//
// POR QUE ESTA FUNÇÃO EXISTE
// O useLembreteWatcher.ts da minhAi guarda lembretes em localStorage e roda um
// setInterval com tolerância de 15 segundos. Ou seja: o lembrete só existe
// enquanto o aplicativo está aberto na tela. Fechou o navegador, reiniciou o
// aparelho ou o iOS suspendeu a aba — o remédio não é lembrado, e ninguém
// fica sabendo. Para o assistente de uma loja isso é um detalhe. Para um
// anticoagulante, não é.
//
// Aqui o relógio é o banco. O navegador só confirma e exibe.
//
// DEPLOY
//   supabase functions deploy melhoria-disparar-lembretes --no-verify-jwt
//
// ENV
//   MELHORIA_CRON_SECRET     — o mesmo valor do BLOCO 2 da migração
//   ONESIGNAL_APP_ID
//   ONESIGNAL_REST_API_KEY
//   SUPABASE_URL             — injetada pela plataforma
//   SUPABASE_SERVICE_ROLE_KEY— injetada pela plataforma
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const BASE_URL = 'https://melhoria.org';

// Janelas de escalonamento. A dose vira 'perdido' aos 120 min (cron do banco).
const MIN_ESCALONAR_CUIDADOR = 30;
const MIN_ESCALONAR_SMS      = 60;

// Teto por execução: protege contra uma fila represada disparar milhares de
// push de uma vez depois de uma indisponibilidade.
const LIMITE_POR_RODADA = 200;

interface Push {
  externalId: string;
  titulo: string;
  mensagem: string;
  url: string;
}

async function enviarPush(p: Push): Promise<boolean> {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const key   = Deno.env.get('ONESIGNAL_REST_API_KEY');
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

        // Confirmar direto da notificação: quem já está com o remédio na mão
        // não deveria precisar abrir o aplicativo.
        buttons: [
          { id: 'tomei',     text: 'Tomei' },
          { id: 'nao_tomei', text: 'Não tomei' },
        ],

        // Prioridade alta + som: o aviso precisa furar o modo silencioso
        // brando do Android.
        priority: 10,
        android_channel_id: undefined,
        ttl: 3600,   // 1h. Push de remédio atrasado além disso é ruído perigoso.
      }),
    });

    const json = await resp.json();
    if (!resp.ok || json.errors) {
      console.error('OneSignal recusou:', JSON.stringify(json.errors ?? json));
      return false;
    }
    // recipients = 0 significa que o aparelho não está inscrito. Não é erro de
    // rede: é alguém que não vai receber o lembrete. Vale monitorar.
    if (json.recipients === 0) {
      console.warn(`Sem destinatário inscrito para external_id ${p.externalId}`);
    }
    return true;
  } catch (e) {
    console.error('Falha de rede no OneSignal:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  // ── Autenticação por segredo compartilhado ────────────────────────────────
  // Mesmo padrão do 'arte-uploads-cleanup' (x-cleanup-secret), que é o que
  // funciona neste projeto. NÃO usar current_setting('app.supabase_url'):
  // esse parâmetro não existe no banco, e é por isso que os jobs
  // 'check-expired-plans' e 'alerta-certificado-nfe' falham em toda execução.
  const segredo = Deno.env.get('MELHORIA_CRON_SECRET');
  if (!segredo || req.headers.get('x-melhoria-secret') !== segredo) {
    return new Response(JSON.stringify({ error: 'não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { db: { schema: 'melhoria' }, auth: { persistSession: false } },
  );

  const agora = new Date();
  const resumo = { notificados: 0, escalonados: 0, sms_pendentes: 0, falhas: 0 };

  try {
    // ══ 1. Doses vencidas ainda pendentes ═══════════════════════════════════
    const { data: pendentes, error: erroPendentes } = await supabase
      .from('dose_eventos')
      .select(`
        id, previsto_para, perfil_id,
        doses!inner ( quantidade, medicamentos!inner ( nome, dosagem ) ),
        perfis!inner ( nome, user_id, timezone )
      `)
      .eq('status', 'pendente')
      .lte('previsto_para', agora.toISOString())
      // Nada mais velho que 2h: isso já é 'perdido', e mandar push de remédio
      // muito atrasado pode induzir a tomar fora de hora.
      .gte('previsto_para', new Date(agora.getTime() - 120 * 60_000).toISOString())
      .order('previsto_para', { ascending: true })
      .limit(LIMITE_POR_RODADA);

    if (erroPendentes) throw erroPendentes;

    for (const ev of pendentes ?? []) {
      const med  = (ev as any).doses?.medicamentos;
      const pes  = (ev as any).perfis;
      const nome = med?.nome ?? 'seu remédio';
      const dose = med?.dosagem ? ` (${med.dosagem})` : '';

      const ok = await enviarPush({
        externalId: pes.user_id,
        titulo: 'Hora do remédio',
        mensagem: `${nome}${dose}. Toque para confirmar.`,
        url: `${BASE_URL}/melhoria?dose=${ev.id}`,
      });

      // Marca 'notificado' mesmo se o push falhou: o evento não pode ficar em
      // laço eterno tentando a cada minuto. A falha vai para o log e a dose
      // ainda aparece na tela do aplicativo.
      const { error } = await supabase
        .from('dose_eventos')
        .update({
          status: 'notificado',
          notificado_em: agora.toISOString(),
          canal: 'push',
        })
        .eq('id', ev.id)
        .eq('status', 'pendente');   // guarda contra corrida entre rodadas

      if (error) { resumo.falhas++; continue; }
      ok ? resumo.notificados++ : resumo.falhas++;
    }

    // ══ 2. Escalonamento para o cuidador (30 min sem confirmar) ═════════════
    // É isto que faz o produto valer dinheiro: o filho descobre que o pai não
    // tomou o remédio no mesmo dia, não no mês seguinte.
    const corte30 = new Date(agora.getTime() - MIN_ESCALONAR_CUIDADOR * 60_000);

    const { data: atrasadas } = await supabase
      .from('dose_eventos')
      .select(`
        id, previsto_para, perfil_id,
        doses!inner ( medicamentos!inner ( nome ) ),
        perfis!inner ( nome )
      `)
      .eq('status', 'notificado')
      .is('escalonado_em', null)
      .lte('previsto_para', corte30.toISOString())
      .limit(LIMITE_POR_RODADA);

    for (const ev of atrasadas ?? []) {
      const nomeIdoso = (ev as any).perfis?.nome ?? 'Seu familiar';
      const nomeMed   = (ev as any).doses?.medicamentos?.nome ?? 'o remédio';

      const { data: cuidadores } = await supabase
        .from('cuidadores')
        .select('user_id')
        .eq('perfil_id', ev.perfil_id)
        .eq('status', 'ativo')
        .eq('recebe_escalonamento', true)
        .not('user_id', 'is', null);

      for (const c of cuidadores ?? []) {
        await enviarPush({
          externalId: (c as any).user_id,
          titulo: `${nomeIdoso} não confirmou o remédio`,
          mensagem: `${nomeMed} estava marcado para 30 minutos atrás.`,
          url: `${BASE_URL}/melhoria/familia`,
        });
      }

      await supabase
        .from('dose_eventos')
        .update({ escalonado_em: agora.toISOString() })
        .eq('id', ev.id);

      resumo.escalonados++;
    }

    // ══ 3. Marcar candidatas a SMS (60 min sem confirmar) ═══════════════════
    // Esta função NÃO envia SMS. SMS consome 2 créditos POR DESTINATÁRIO e
    // precisa passar por cobrar_credito_se_suficiente, que é fail-closed —
    // enviar daqui pularia a cobrança. Aqui só marcamos; quem envia é a rota
    // /api/melhoria/escalonar-sms, na Fase 4.
    const corte60 = new Date(agora.getTime() - MIN_ESCALONAR_SMS * 60_000);

    const { data: paraSms } = await supabase
      .from('dose_eventos')
      .select('id')
      .eq('status', 'notificado')
      .not('escalonado_em', 'is', null)
      .is('escalonado_sms_em', null)
      .lte('previsto_para', corte60.toISOString())
      .limit(LIMITE_POR_RODADA);

    if (paraSms?.length) {
      await supabase
        .from('dose_eventos')
        .update({ escalonado_sms_em: agora.toISOString() })
        .in('id', paraSms.map((e: any) => e.id));
      resumo.sms_pendentes = paraSms.length;
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
