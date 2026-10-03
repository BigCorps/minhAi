import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const BASE_URL = 'https://melhoria.org';
const LIMITE = 300;

function localParts(now: Date, timezone: string) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
  return { date, time };
}

async function enviarPush(externalId: string) {
  const appId = Deno.env.get('MELHORIA_ONESIGNAL_APP_ID') || Deno.env.get('ONESIGNAL_APP_ID');
  const key = Deno.env.get('MELHORIA_ONESIGNAL_REST_API_KEY') || Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !key) return false;

  try {
    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${key}` },
      body: JSON.stringify({
        app_id: appId,
        headings: { pt: 'Que tal conferir seu dia?', en: 'Confira seu dia' },
        contents: {
          pt: 'Abra a MelhorIA para ver seus lembretes e o que está programado para hoje.',
          en: 'Abra a MelhorIA para conferir seu dia.',
        },
        url: `${BASE_URL}/app`,
        target_channel: 'push',
        include_aliases: { external_id: [externalId] },
        priority: 5,
        ttl: 7200,
      }),
    });
    const json = await resp.json().catch(() => ({}));
    return resp.ok && !json.errors && Number(json.recipients ?? 0) > 0;
  } catch (e) {
    console.error('melhoria-engajamento-diario OneSignal:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  const segredo = Deno.env.get('MELHORIA_CRON_SECRET');
  if (!segredo || req.headers.get('x-melhoria-secret') !== segredo) {
    return new Response(JSON.stringify({ error: 'não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const mel = createClient(supabaseUrl, serviceKey, {
    db: { schema: 'melhoria' }, auth: { persistSession: false },
  });

  const agora = new Date();
  let enviados = 0;
  let falhas = 0;

  const { data: perfis, error } = await mel
    .from('perfis')
    .select('id,user_id,timezone,lembrete_diario_horario,lembrete_diario_ultimo_envio')
    .eq('lembrete_diario_ativo', true)
    .not('user_id', 'is', null)
    .limit(LIMITE);

  if (error) {
    return new Response(JSON.stringify({ ok: false, erro: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  for (const p of perfis ?? []) {
    const tz = p.timezone || 'America/Sao_Paulo';
    const { date, time } = localParts(agora, tz);
    const alvo = String(p.lembrete_diario_horario || '09:00:00').slice(0, 5);

    // Job roda a cada 5 min. A janela de 5 minutos evita exigir segundo exato.
    const [ah, am] = alvo.split(':').map(Number);
    const [nh, nm] = time.split(':').map(Number);
    const atualMin = nh * 60 + nm;
    const alvoMin = ah * 60 + am;
    if (atualMin < alvoMin || atualMin > alvoMin + 4) continue;
    if (p.lembrete_diario_ultimo_envio === date) continue;

    const ok = await enviarPush(p.user_id);
    if (!ok) { falhas++; continue; }

    const { error: upd } = await mel
      .from('perfis')
      .update({ lembrete_diario_ultimo_envio: date })
      .eq('id', p.id);

    if (upd) falhas++;
    else enviados++;
  }

  return new Response(JSON.stringify({ ok: true, enviados, falhas }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
