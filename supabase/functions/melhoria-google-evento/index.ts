// supabase/functions/melhoria-google-evento/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Processa melhoria.google_fila: cria, atualiza e apaga eventos no Google
// Agenda. Rodada pelo cron a cada 2 minutos.
//
//   supabase functions deploy melhoria-google-evento --no-verify-jwt
//
// ── POR QUE ESTA FUNÇÃO EXISTE ───────────────────────────────────────────────
// O LembreteRemediosDisplay da minhAi cria UM EVENTO POR DOSE POR DIA, em laço
// aninhado sequencial:
//
//     for (dia = 0; dia < totalDias; dia++)
//       for (horario of horariosDiarios)
//         await invoke('criar-evento-calendario', ...)
//         if (calError) throw ...
//
// Três defeitos, todos visíveis no primeiro uso real:
//   1. 3 doses x 90 dias = 270 chamadas sequenciais. Modal travado por minutos.
//   2. O throw no primeiro erro aborta com ~140 eventos já criados. Sem rollback.
//   3. O event_id é descartado. Mudou a dose? Não há como editar nem apagar.
//
// Aqui: UM evento recorrente com RRULE. Uma chamada, um event_id guardado,
// e cancelar o tratamento é um DELETE.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const TZ = 'America/Sao_Paulo';
const LOTE = 40;
const MAX_TENTATIVAS = 4;

interface Conexao {
  perfil_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  calendar_id: string;
  titulo_neutro: boolean;
}

/** Renova o access_token se estiver perto de vencer. Margem de 5 min. */
async function tokenValido(admin: any, c: Conexao): Promise<string | null> {
  const venceEm = new Date(c.expires_at).getTime();
  if (venceEm - Date.now() > 5 * 60_000) return c.access_token;

  if (!c.refresh_token) {
    // Sem refresh_token não há como renovar. Desativa e para de tentar.
    await admin.from('google_conexoes')
      .update({ is_active: false }).eq('perfil_id', c.perfil_id);
    return null;
  }

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!,
      refresh_token: c.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const t = await resp.json();
  if (!resp.ok || !t.access_token) {
    // Usuário revogou o acesso pela conta Google. Desativa em silêncio: os
    // lembretes por push continuam funcionando, que é o que importa.
    await admin.from('google_conexoes')
      .update({ is_active: false }).eq('perfil_id', c.perfil_id);
    return null;
  }

  const novo = {
    access_token: t.access_token,
    expires_at: new Date(Date.now() + Number(t.expires_in ?? 3600) * 1000).toISOString(),
    last_token_refresh: new Date().toISOString(),
  };
  await admin.from('google_conexoes').update(novo).eq('perfil_id', c.perfil_id);
  return t.access_token;
}

/** RFC 5545. Domingo = SU. */
function montarRRule(dias: number[], dataFim: string | null): string {
  const mapa = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  let ate = '';

  if (dataFim) {
    const fim = new Date(`${dataFim}T23:59:00-03:00`);
    ate = ';UNTIL=' + fim.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  if (dias.length === 7) return `RRULE:FREQ=DAILY${ate}`;
  return `RRULE:FREQ=WEEKLY;BYDAY=${dias.map((d) => mapa[d]).join(',')}${ate}`;
}

async function chamarGoogle(
  token: string, metodo: string, caminho: string, corpo?: unknown
) {
  const resp = await fetch(`https://www.googleapis.com/calendar/v3${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  // 410 Gone = evento já não existe. Não é erro: é o resultado desejado num
  // apagar, e num atualizar significa recriar.
  if (resp.status === 410 || resp.status === 404) return { ausente: true };
  if (!resp.ok) throw new Error(`Google ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return resp.status === 204 ? {} : await resp.json();
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

  const resumo = { ok: 0, erro: 0, desistiu: 0, sem_conexao: 0 };

  try {
    const { data: fila } = await admin
      .from('google_fila')
      .select('*')
      .eq('status', 'pendente')
      .lt('tentativas', MAX_TENTATIVAS)
      .order('criado_em', { ascending: true })
      .limit(LOTE);

    // Cache de token por perfil: um lote costuma ter vários itens do mesmo
    // usuário, e renovar token a cada item é desperdício e risco de corrida.
    const tokens = new Map<string, string | null>();
    const conexoes = new Map<string, Conexao>();

    for (const item of fila ?? []) {
      try {
        if (!conexoes.has(item.perfil_id)) {
          const { data: c } = await admin
            .from('google_conexoes')
            .select('perfil_id, access_token, refresh_token, expires_at, calendar_id, titulo_neutro')
            .eq('perfil_id', item.perfil_id)
            .eq('is_active', true)
            .maybeSingle();
          if (c) conexoes.set(item.perfil_id, c as Conexao);
        }

        const conexao = conexoes.get(item.perfil_id);
        if (!conexao) {
          await admin.from('google_fila')
            .update({ status: 'desistiu', ultimo_erro: 'sem conexão ativa',
                      processado_em: new Date().toISOString() })
            .eq('id', item.id);
          resumo.sem_conexao++;
          continue;
        }

        if (!tokens.has(item.perfil_id)) {
          tokens.set(item.perfil_id, await tokenValido(admin, conexao));
        }
        const token = tokens.get(item.perfil_id);

        if (!token) {
          await admin.from('google_fila')
            .update({ status: 'desistiu', ultimo_erro: 'autorização expirada',
                      processado_em: new Date().toISOString() })
            .eq('id', item.id);
          resumo.sem_conexao++;
          continue;
        }

        const cal = encodeURIComponent(conexao.calendar_id || 'primary');

        // ── APAGAR ────────────────────────────────────────────────────────
        if (item.acao === 'apagar') {
          if (item.google_event_id) {
            await chamarGoogle(token, 'DELETE', `/calendars/${cal}/events/${item.google_event_id}`);
          }
          await admin.from('google_fila')
            .update({ status: 'ok', processado_em: new Date().toISOString() })
            .eq('id', item.id);
          resumo.ok++;
          continue;
        }

        // ── Monta o evento ────────────────────────────────────────────────
        let evento: Record<string, unknown>;
        let tabela: 'agendamentos' | 'doses';

        if (item.origem === 'agendamento') {
          tabela = 'agendamentos';
          const { data: a } = await admin
            .from('agendamentos')
            .select('*')
            .eq('id', item.origem_id)
            .maybeSingle();
          if (!a) throw new Error('agendamento sumiu');

          const inicio = new Date(a.data_hora);
          const fim = new Date(inicio.getTime() + (a.duracao_min ?? 60) * 60_000);

          const detalhes = [
            a.profissional && `Profissional: ${a.profissional}`,
            a.especialidade && `Especialidade: ${a.especialidade}`,
            a.telefone_local && `Telefone: ${a.telefone_local}`,
            a.jejum_horas && `Jejum de ${a.jejum_horas} horas antes.`,
            a.preparo && `Preparo: ${a.preparo}`,
            a.levar?.length && `Levar: ${a.levar.join(', ')}`,
            '', 'Criado pela MelhorIA — melhoria.org',
          ].filter(Boolean).join('\n');

          evento = {
            summary: a.titulo,
            description: detalhes,
            location: a.endereco || a.local || undefined,
            start: { dateTime: inicio.toISOString(), timeZone: TZ },
            end:   { dateTime: fim.toISOString(),    timeZone: TZ },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 24 * 60 },
                { method: 'popup', minutes: 60 },
              ],
            },
          };
        } else {
          // ── DOSE: um evento recorrente por grade ────────────────────────
          tabela = 'doses';
          const { data: d } = await admin
            .from('doses')
            .select('*, medicamentos!inner(nome, dosagem, data_fim, perfil_id)')
            .eq('id', item.origem_id)
            .maybeSingle();
          if (!d) throw new Error('dose sumiu');

          const med = (d as any).medicamentos;
          const [h, m] = String(d.horario).split(':').map(Number);

          // Primeira ocorrência: hoje neste horário, no fuso local.
          const hoje = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
          const inicio = new Date(`${hoje}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-03:00`);
          const fim = new Date(inicio.getTime() + 15 * 60_000);

          // Título neutro por padrão: quem tem acesso à agenda não precisa
          // saber que remédio a pessoa toma. O nome fica na descrição.
          const nome = [med.nome, med.dosagem].filter(Boolean).join(' ');

          evento = {
            summary: conexao.titulo_neutro ? 'Hora do remédio' : nome,
            description: `${nome}\n\nCriado pela MelhorIA — melhoria.org`,
            start: { dateTime: inicio.toISOString(), timeZone: TZ },
            end:   { dateTime: fim.toISOString(),    timeZone: TZ },
            recurrence: [montarRRule(d.dias_semana ?? [0,1,2,3,4,5,6], med.data_fim)],
            reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
          };
        }

        // ── Cria ou atualiza ──────────────────────────────────────────────
        let resultado: any;

        if (item.acao === 'atualizar' && item.google_event_id) {
          resultado = await chamarGoogle(
            token, 'PATCH', `/calendars/${cal}/events/${item.google_event_id}`, evento);

          // Alguém apagou o evento direto na agenda: recria.
          if (resultado?.ausente) {
            resultado = await chamarGoogle(token, 'POST', `/calendars/${cal}/events`, evento);
          }
        } else {
          resultado = await chamarGoogle(token, 'POST', `/calendars/${cal}/events`, evento);
        }

        // Guardar o event_id é o que permite editar e cancelar depois. É
        // exatamente o passo que falta no fluxo atual da minhAi.
        if (resultado?.id) {
          await admin.from(tabela)
            .update({ google_event_id: resultado.id })
            .eq('id', item.origem_id);
        }

        await admin.from('google_fila')
          .update({ status: 'ok', google_event_id: resultado?.id ?? item.google_event_id,
                    processado_em: new Date().toISOString() })
          .eq('id', item.id);
        resumo.ok++;

      } catch (e) {
        const tentativas = (item.tentativas ?? 0) + 1;
        const desistir = tentativas >= MAX_TENTATIVAS;

        await admin.from('google_fila')
          .update({
            tentativas,
            ultimo_erro: String(e).slice(0, 300),
            status: desistir ? 'desistiu' : 'pendente',
            processado_em: desistir ? new Date().toISOString() : null,
          })
          .eq('id', item.id);

        desistir ? resumo.desistiu++ : resumo.erro++;
        console.error(`fila ${item.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...resumo }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('melhoria-google-evento:', e);
    return new Response(JSON.stringify({ ok: false, erro: String(e) }), { status: 500 });
  }
});
