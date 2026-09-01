import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const GMAIL_SEND =
  'https://www.googleapis.com/auth/gmail.send';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function base64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64UrlUtf8(value) {
  return base64Utf8(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function dataGoogle(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function localEvento(cfg) {
  return [
    cfg?.local?.nome,
    cfg?.local?.logradouro,
    cfg?.local?.bairro,
    cfg?.local?.cidade,
    cfg?.local?.cep,
  ]
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

function urlGoogleAgenda(cfg, slug) {
  const inicio = new Date(cfg?.evento?.dataIso ?? '');

  if (Number.isNaN(inicio.getTime())) {
    return null;
  }

  const fim = new Date(
    inicio.getTime() + 4 * 60 * 60 * 1000
  );

  const conviteUrl =
    `https://${slug}.conviteia.com`;

  const titulo =
    String(cfg?.anfitrioes?.exibicao ?? '').trim() ||
    'Evento';

  const detalhes = [
    'Evento salvo a partir de um convite ConviteIA.',
    '',
    `Convite: ${conviteUrl}`,
  ].join('\n');

  const url = new URL(
    'https://calendar.google.com/calendar/render'
  );

  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', titulo);
  url.searchParams.set(
    'dates',
    `${dataGoogle(inicio)}/${dataGoogle(fim)}`
  );
  url.searchParams.set('details', detalhes);
  url.searchParams.set('ctz', 'America/Sao_Paulo');

  const local = localEvento(cfg);

  if (local) {
    url.searchParams.set('location', local);
  }

  return url.toString();
}

function conteudoPorTipo(tipo, nomesEvento) {
  if (tipo === 'lembrete_30d') {
    return {
      assunto: `Falta 1 mês para ${nomesEvento} 💌`,
      titulo: 'Falta 1 mês!',
      texto:
        `Está chegando o dia de ${nomesEvento}. ` +
        'Guarde a data e confira novamente os detalhes do convite.',
    };
  }

  if (tipo === 'lembrete_7d') {
    return {
      assunto: `É na próxima semana — ${nomesEvento} ✨`,
      titulo: 'É na próxima semana!',
      texto:
        `Falta só uma semana para ${nomesEvento}. ` +
        'Confira horário, local e os detalhes antes do grande dia.',
    };
  }

  return {
    assunto: `É amanhã — ${nomesEvento} 🎉`,
    titulo: 'É amanhã!',
    texto:
      `Amanhã é o dia de ${nomesEvento}. ` +
      'Confira o horário e o local para aproveitar tudo com tranquilidade.',
  };
}

async function tokenValido(
  conv,
  conexao,
  clientId,
  clientSecret
) {
  const expira =
    new Date(conexao.expires_at).getTime();

  if (
    Number.isFinite(expira) &&
    expira - Date.now() > 5 * 60 * 1000
  ) {
    return conexao.access_token;
  }

  const response = await fetch(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: conexao.refresh_token,
        grant_type: 'refresh_token',
      }),
    }
  );

  const tokens = await response.json();

  if (!response.ok || !tokens.access_token) {
    throw new Error(
      'A autorização Google precisa ser reconectada.'
    );
  }

  const expiresAt = new Date(
    Date.now() +
      Number(tokens.expires_in || 3600) * 1000
  ).toISOString();

  const { error } = await conv
    .from('google_conexoes')
    .update({
      access_token: tokens.access_token,
      expires_at: expiresAt,
      last_token_refresh: new Date().toISOString(),
    })
    .eq('evento_id', conexao.evento_id);

  if (error) {
    console.error(
      'ConviteIA lembrete refresh save:',
      error
    );
  }

  return tokens.access_token;
}

function montarEmail({
  convidado,
  evento,
  tipo,
}) {
  const cfg = evento.config ?? {};

  const nomesEvento =
    String(cfg?.anfitrioes?.exibicao ?? '').trim() ||
    'seu evento';

  const conviteUrl =
    `https://${evento.slug}.conviteia.com`;

  const agendaUrl =
    urlGoogleAgenda(cfg, evento.slug);

  const dataExtenso =
    String(cfg?.evento?.dataExtenso ?? '').trim();

  const horario =
    String(cfg?.evento?.horario ?? '').trim();

  const local =
    localEvento(cfg);

  const dataLinha = [
    dataExtenso,
    horario,
  ]
    .filter(Boolean)
    .join(' · ');

  const copy =
    conteudoPorTipo(tipo, nomesEvento);

  const agendaBotao = agendaUrl
    ? `
      <a
        href="${escapeHtml(agendaUrl)}"
        target="_blank"
        style="
          display:inline-block;
          margin:7px 5px;
          padding:12px 18px;
          border:1px solid #e0c7cf;
          border-radius:999px;
          background:#ffffff;
          color:#a04a63;
          text-decoration:none;
          font-size:14px;
          font-weight:700;
        "
      >
        Adicionar ao Google Agenda
      </a>`
    : '';

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(copy.assunto)}</title>
</head>
<body style="margin:0;padding:0;background:#fff5f8;font-family:Arial,Helvetica,sans-serif;color:#40232c">
  <div style="max-width:600px;margin:0 auto;padding:28px 16px">
    <div style="overflow:hidden;border:1px solid #efd9e0;border-radius:24px;background:#ffffff;box-shadow:0 14px 45px rgba(64,35,44,.08)">
      <div style="padding:28px 24px;text-align:center;background:#fdf0f3">
        <img
          src="https://conviteia.com/brands/convite/icone-512.png"
          alt="ConviteIA"
          width="68"
          height="68"
          style="display:block;margin:0 auto 12px;width:68px;height:68px"
        >
        <div style="font-size:12px;font-weight:700;color:#a04a63;letter-spacing:.04em">
          ConviteIA
        </div>
      </div>

      <div style="padding:30px 26px">
        <h1 style="margin:0;text-align:center;font-size:28px;line-height:1.15;color:#40232c">
          ${escapeHtml(copy.titulo)}
        </h1>

        <p style="margin:16px auto 0;max-width:440px;text-align:center;font-size:15px;line-height:1.65;color:#7c5560">
          Olá, <strong style="color:#40232c">${escapeHtml(convidado.nome)}</strong>.
          ${escapeHtml(copy.texto)}
        </p>

        ${
          dataLinha || local
            ? `
              <div style="margin:24px 0;padding:18px;border-radius:16px;background:#fff8fa;text-align:center">
                ${
                  dataLinha
                    ? `<div style="font-size:15px;font-weight:700;color:#40232c">${escapeHtml(dataLinha)}</div>`
                    : ''
                }
                ${
                  local
                    ? `<div style="margin-top:7px;font-size:13px;line-height:1.5;color:#7c5560">${escapeHtml(local)}</div>`
                    : ''
                }
              </div>`
            : ''
        }

        <div style="margin-top:26px;text-align:center">
          <a
            href="${escapeHtml(conviteUrl)}"
            target="_blank"
            style="
              display:inline-block;
              margin:7px 5px;
              padding:13px 20px;
              border-radius:999px;
              background:#d86090;
              color:#ffffff;
              text-decoration:none;
              font-size:14px;
              font-weight:700;
            "
          >
            Ver convite
          </a>

          ${agendaBotao}
        </div>
      </div>

      <div style="padding:18px 24px;border-top:1px solid #f2e6ea;background:#fffafb;text-align:center;font-size:11px;line-height:1.5;color:#9b7b84">
        Lembrete enviado pela conta Google conectada pelos anfitriões ao convite.
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: copy.assunto,
    html,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return json(
      { error: 'Método não permitido.' },
      405
    );
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL');

  const serviceRole =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const clientId =
    Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');

  const clientSecret =
    Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

  if (
    !supabaseUrl ||
    !serviceRole ||
    !clientId ||
    !clientSecret
  ) {
    return json(
      { error: 'Configuração Google indisponível.' },
      500
    );
  }

  const bearer =
    req.headers
      .get('Authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim();

  // Chamado somente pelo cron interno.
  if (!bearer || bearer !== serviceRole) {
    return json(
      { error: 'Não autorizado.' },
      401
    );
  }

  const admin = createClient(
    supabaseUrl,
    serviceRole,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const conv =
    admin.schema('conviteria');

  const agora =
    new Date().toISOString();

  const { data: fila, error: filaError } =
    await conv
      .from('google_envios')
      .select(
        'id, evento_id, convidado_id, tipo, to_email, agendado_para, tentativas'
      )
      .eq('status', 'agendado')
      .in('tipo', [
        'lembrete_30d',
        'lembrete_7d',
        'lembrete_1d',
      ])
      .lte('agendado_para', agora)
      .order('agendado_para', {
        ascending: true,
      })
      .limit(50);

  if (filaError) {
    console.error(
      'ConviteIA lembretes fila:',
      filaError
    );

    return json(
      { error: 'Falha ao consultar a fila.' },
      500
    );
  }

  const resultado = {
    encontrados: fila?.length ?? 0,
    enviados: 0,
    ignorados: 0,
    aguardando_google: 0,
    falhas: 0,
  };

  for (const item of fila ?? []) {
    try {
      // Claim simples e idempotente. Se outro worker já pegou,
      // o update não retorna linha e este ciclo pula o item.
      const { data: claim } = await conv
        .from('google_envios')
        .update({
          status: 'processando',
          tentativas:
            Number(item.tentativas ?? 0) + 1,
          ultimo_erro: null,
        })
        .eq('id', item.id)
        .eq('status', 'agendado')
        .select('id')
        .maybeSingle();

      if (!claim) {
        continue;
      }

      const [
        eventoResp,
        convidadoResp,
        conexaoResp,
        preferenciasResp,
      ] = await Promise.all([
        conv
          .from('eventos')
          .select(
            'id, slug, config, data_evento, arquivado'
          )
          .eq('id', item.evento_id)
          .maybeSingle(),

        conv
          .from('convidados')
          .select(
            'id, nome, email, comparecera'
          )
          .eq('id', item.convidado_id)
          .eq('evento_id', item.evento_id)
          .maybeSingle(),

        conv
          .from('google_conexoes')
          .select(
            'evento_id, access_token, refresh_token, expires_at, scopes'
          )
          .eq('evento_id', item.evento_id)
          .eq('is_active', true)
          .maybeSingle(),

        conv
          .from('google_preferencias')
          .select('lembrete_30d,lembrete_7d,lembrete_1d')
          .eq('evento_id', item.evento_id)
          .maybeSingle(),
      ]);

      const evento =
        eventoResp.data;

      const convidado =
        convidadoResp.data;

      const conexao =
        conexaoResp.data;

      const preferencias =
        preferenciasResp.data;

      const habilitado =
        item.tipo === 'lembrete_30d'
          ? preferencias?.lembrete_30d !== false
          : item.tipo === 'lembrete_7d'
            ? preferencias?.lembrete_7d !== false
            : preferencias?.lembrete_1d !== false;

      if (!habilitado) {
        await conv
          .from('google_envios')
          .update({
            status: 'ignorado',
            ultimo_erro: null,
          })
          .eq('id', item.id);

        resultado.ignorados++;
        continue;
      }

      const eventoJaPassou =
        !evento?.data_evento ||
        new Date(evento.data_evento).getTime() <= Date.now();

      if (
        !evento ||
        evento.arquivado ||
        eventoJaPassou ||
        !convidado ||
        convidado.comparecera !== true ||
        !convidado.email
      ) {
        await conv
          .from('google_envios')
          .update({
            status: 'ignorado',
            ultimo_erro: null,
          })
          .eq('id', item.id);

        resultado.ignorados++;
        continue;
      }

      if (!conexao) {
        // Pode ser conectado depois. Mantemos na fila enquanto o evento
        // ainda não ocorreu.
        await conv
          .from('google_envios')
          .update({
            status: 'agendado',
            ultimo_erro:
              'Conta Google não conectada ao convite.',
          })
          .eq('id', item.id);

        resultado.aguardando_google++;
        continue;
      }

      const scopes =
        Array.isArray(conexao.scopes)
          ? conexao.scopes
          : [];

      if (!scopes.includes(GMAIL_SEND)) {
        await conv
          .from('google_envios')
          .update({
            status: 'agendado',
            ultimo_erro:
              'A conta Google precisa ser reconectada com permissão Gmail.',
          })
          .eq('id', item.id);

        resultado.aguardando_google++;
        continue;
      }

      let accessToken;

      try {
        accessToken =
          await tokenValido(
            conv,
            conexao,
            clientId,
            clientSecret
          );
      } catch (tokenError) {
        await conv
          .from('google_envios')
          .update({
            status: 'agendado',
            ultimo_erro:
              tokenError instanceof Error
                ? tokenError.message.slice(0, 500)
                : 'Falha ao renovar autorização Google.',
          })
          .eq('id', item.id);

        resultado.aguardando_google++;
        continue;
      }

      const email =
        montarEmail({
          convidado,
          evento,
          tipo: item.tipo,
        });

      const raw = [
        `To: ${String(convidado.email).trim().toLowerCase()}`,
        `Subject: =?UTF-8?B?${base64Utf8(email.subject)}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        email.html,
      ].join('\r\n');

      const gmailResponse =
        await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              raw: base64UrlUtf8(raw),
            }),
          }
        );

      const gmailData =
        await gmailResponse.json();

      if (!gmailResponse.ok) {
        throw new Error(
          gmailData?.error?.message ||
          'O Gmail não aceitou o lembrete.'
        );
      }

      await conv
        .from('google_envios')
        .update({
          status: 'enviado',
          google_message_id:
            gmailData.id ?? null,
          enviado_em:
            new Date().toISOString(),
          ultimo_erro: null,
        })
        .eq('id', item.id);

      resultado.enviados++;
    } catch (error) {
      console.error(
        'ConviteIA lembrete item:',
        item.id,
        error
      );

      // Falha transitória: volta para a fila. Como o worker roda de hora
      // em hora, ele tentará novamente enquanto o evento ainda for futuro.
      await conv
        .from('google_envios')
        .update({
          status: 'agendado',
          ultimo_erro:
            error instanceof Error
              ? error.message.slice(0, 500)
              : 'Falha no envio do lembrete.',
        })
        .eq('id', item.id);

      resultado.falhas++;
    }
  }

  return json({
    success: true,
    ...resultado,
  });
});
