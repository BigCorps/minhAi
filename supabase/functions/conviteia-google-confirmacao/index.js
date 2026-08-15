import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GMAIL_SEND =
  'https://www.googleapis.com/auth/gmail.send';

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

function foldIcsLine(line) {
  if (line.length <= 72) return line;

  const partes = [];

  for (let i = 0; i < line.length; i += 70) {
    partes.push(
      `${i === 0 ? '' : ' '}${line.slice(i, i + 70)}`
    );
  }

  return partes.join('\r\n');
}

function icsEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function dataIcs(date) {
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

  const details = [
    'Presença confirmada pela ConviteIA.',
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
    `${dataIcs(inicio)}/${dataIcs(fim)}`
  );
  url.searchParams.set('details', details);
  url.searchParams.set(
    'ctz',
    'America/Sao_Paulo'
  );

  const local = localEvento(cfg);

  if (local) {
    url.searchParams.set('location', local);
  }

  return url.toString();
}

function montarIcs(cfg, slug) {
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

  const local = localEvento(cfg);

  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ConviteIA//Convite Digital//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@conviteia.com`,
    `DTSTAMP:${dataIcs(new Date())}`,
    `DTSTART:${dataIcs(inicio)}`,
    `DTEND:${dataIcs(fim)}`,
    `SUMMARY:${icsEscape(titulo)}`,
    `DESCRIPTION:${icsEscape(
      `Presença confirmada pela ConviteIA.\n${conviteUrl}`
    )}`,
    ...(local
      ? [`LOCATION:${icsEscape(local)}`]
      : []),
    `URL:${conviteUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return linhas
    .map(foldIcsLine)
    .join('\r\n');
}

async function tokenValido(
  conv,
  conexao,
  clientId,
  clientSecret
) {
  const expira =
    new Date(conexao.expires_at).getTime();

  const margem =
    5 * 60 * 1000;

  if (
    Number.isFinite(expira) &&
    expira - Date.now() > margem
  ) {
    return conexao.access_token;
  }

  const resposta = await fetch(
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
        refresh_token:
          conexao.refresh_token,
        grant_type: 'refresh_token',
      }),
    }
  );

  const tokens =
    await resposta.json();

  if (
    !resposta.ok ||
    !tokens.access_token
  ) {
    throw new Error(
      'Falha ao renovar a autorização Google.'
    );
  }

  const expiresAt =
    new Date(
      Date.now() +
      Number(tokens.expires_in || 3600) *
        1000
    ).toISOString();

  const { error } = await conv
    .from('google_conexoes')
    .update({
      access_token:
        tokens.access_token,
      expires_at: expiresAt,
      last_token_refresh:
        new Date().toISOString(),
    })
    .eq('evento_id', conexao.evento_id);

  if (error) {
    console.error(
      'ConviteIA Google refresh save:',
      error
    );
  }

  return tokens.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: CORS,
    });
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
    Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY'
    );

  const clientId =
    Deno.env.get(
      'GOOGLE_OAUTH_CLIENT_ID'
    );

  const clientSecret =
    Deno.env.get(
      'GOOGLE_OAUTH_CLIENT_SECRET'
    );

  if (
    !supabaseUrl ||
    !serviceRole ||
    !clientId ||
    !clientSecret
  ) {
    return json(
      {
        error:
          'Configuração Google indisponível.',
      },
      500
    );
  }

  const bearer =
    req.headers
      .get('Authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim();

  // Esta função não é chamada pelo navegador.
  // Somente o backend ConviteIA, usando service_role.
  if (!bearer || bearer !== serviceRole) {
    return json(
      { error: 'Não autorizado.' },
      401
    );
  }

  const body =
    await req
      .json()
      .catch(() => null);

  const eventoId =
    String(
      body?.evento_id ?? ''
    ).trim();

  const convidadoId =
    String(
      body?.convidado_id ?? ''
    ).trim();

  const idempotencyKey =
    String(
      body?.idempotency_key ?? ''
    ).trim();

  const atualizado =
    body?.atualizado === true;

  if (
    !eventoId ||
    !convidadoId ||
    !idempotencyKey
  ) {
    return json(
      { error: 'Dados incompletos.' },
      400
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

  let logId = null;

  try {
    const [
      eventoResp,
      convidadoResp,
      conexaoResp,
      preferenciasResp,
    ] = await Promise.all([
      conv
        .from('eventos')
        .select(
          'id, slug, config, tipo_evento_id'
        )
        .eq('id', eventoId)
        .eq('arquivado', false)
        .maybeSingle(),

      conv
        .from('convidados')
        .select(
          'id, nome, email, acompanhantes'
        )
        .eq('id', convidadoId)
        .eq('evento_id', eventoId)
        .eq('comparecera', true)
        .maybeSingle(),

      conv
        .from('google_conexoes')
        .select(
          'evento_id, access_token, refresh_token, expires_at, scopes, google_email'
        )
        .eq('evento_id', eventoId)
        .eq('is_active', true)
        .maybeSingle(),

      conv
        .from('google_preferencias')
        .select('enviar_confirmacao')
        .eq('evento_id', eventoId)
        .maybeSingle(),
    ]);

    const evento =
      eventoResp.data;

    const convidado =
      convidadoResp.data;

    const conexao =
      conexaoResp.data;

    const enviarConfirmacao =
      preferenciasResp.data?.enviar_confirmacao !== false;

    if (
      !evento ||
      !convidado
    ) {
      return json(
        {
          success: false,
          sent: false,
          reason:
            'registro_nao_encontrado',
        },
        404
      );
    }

    if (!enviarConfirmacao) {
      return json({
        success: true,
        sent: false,
        reason:
          'confirmacao_desativada',
      });
    }

    if (
      !conexao
    ) {
      return json({
        success: true,
        sent: false,
        reason:
          'google_nao_conectado',
      });
    }

    const scopes =
      Array.isArray(conexao.scopes)
        ? conexao.scopes
        : [];

    if (
      !scopes.includes(GMAIL_SEND)
    ) {
      return json({
        success: true,
        sent: false,
        reason:
          'gmail_sem_permissao',
      });
    }

    const email =
      String(
        convidado.email ?? ''
      )
        .trim()
        .toLowerCase();

    if (!email) {
      return json({
        success: true,
        sent: false,
        reason:
          'convidado_sem_email',
      });
    }

    const { data: log, error: logError } =
      await conv
        .from('google_envios')
        .insert({
          evento_id: eventoId,
          convidado_id:
            convidadoId,
          tipo: 'confirmacao',
          idempotency_key:
            idempotencyKey,
          to_email: email,
          status: 'processando',
          tentativas: 1,
        })
        .select('id')
        .single();

    if (logError) {
      if (logError.code === '23505') {
        const {
          data: existente,
        } = await conv
          .from('google_envios')
          .select(
            'status, google_message_id'
          )
          .eq(
            'idempotency_key',
            idempotencyKey
          )
          .maybeSingle();

        return json({
          success: true,
          sent:
            existente?.status ===
            'enviado',
          duplicate: true,
          message_id:
            existente
              ?.google_message_id ??
            null,
        });
      }

      throw logError;
    }

    logId = log.id;

    const accessToken =
      await tokenValido(
        conv,
        conexao,
        clientId,
        clientSecret
      );

    const cfg =
      evento.config ?? {};

    const nomesEvento =
      String(
        cfg?.anfitrioes?.exibicao ??
        ''
      ).trim() ||
      'Seu evento';

    const conviteUrl =
      `https://${evento.slug}.conviteia.com`;

    const agendaUrl =
      urlGoogleAgenda(
        cfg,
        evento.slug
      );

    const dataExtenso =
      String(
        cfg?.evento?.dataExtenso ??
        ''
      ).trim();

    const horario =
      String(
        cfg?.evento?.horario ??
        ''
      ).trim();

    const local =
      localEvento(cfg);

    const familia =
      Array.isArray(
        convidado.acompanhantes
      )
        ? convidado.acompanhantes
            .map((x) =>
              String(x ?? '').trim()
            )
            .filter(Boolean)
        : [];

    const pessoas = [
      String(
        convidado.nome ?? ''
      ).trim(),
      ...familia,
    ].filter(Boolean);

    const subject =
      atualizado
        ? `Confirmação atualizada — ${nomesEvento}`
        : `Presença confirmada — ${nomesEvento}`;

    const pessoasHtml =
      pessoas
        .map(
          (nome) =>
            `<li style="margin:4px 0">${escapeHtml(
              nome
            )}</li>`
        )
        .join('');

    const dataLinha =
      [
        dataExtenso,
        horario,
      ]
        .filter(Boolean)
        .join(' · ');

    const agendaBotao =
      agendaUrl
        ? `
          <a
            href="${escapeHtml(agendaUrl)}"
            target="_blank"
            style="
              display:inline-block;
              margin:8px 6px;
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
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#fff5f8;font-family:Arial,Helvetica,sans-serif;color:#40232c">
  <div style="max-width:600px;margin:0 auto;padding:28px 16px">
    <div style="overflow:hidden;border:1px solid #efd9e0;border-radius:24px;background:#ffffff;box-shadow:0 14px 45px rgba(64,35,44,.08)">
      <div style="padding:30px 24px;text-align:center;background:#fdf0f3">
        <img
          src="https://conviteia.com/brands/convite/icone-512.png"
          alt="ConviteIA"
          width="72"
          height="72"
          style="display:block;margin:0 auto 12px;width:72px;height:72px"
        >
        <div style="font-size:12px;font-weight:700;color:#a04a63;letter-spacing:.04em">
          ConviteIA
        </div>
      </div>

      <div style="padding:30px 26px">
        <h1 style="margin:0;text-align:center;font-size:27px;line-height:1.15;color:#40232c">
          ${atualizado ? 'Confirmação atualizada!' : 'Presença confirmada!'}
        </h1>

        <p style="margin:16px 0 0;text-align:center;font-size:15px;line-height:1.6;color:#7c5560">
          Olá, <strong style="color:#40232c">${escapeHtml(convidado.nome)}</strong>.
          Sua confirmação para <strong style="color:#40232c">${escapeHtml(nomesEvento)}</strong>
          foi registrada com sucesso.
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

        <div style="margin:22px 0">
          <div style="margin-bottom:8px;font-size:13px;font-weight:700;color:#5d3c46">
            Pessoas confirmadas
          </div>
          <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.55;color:#7c5560">
            ${pessoasHtml}
          </ul>
        </div>

        <div style="margin-top:26px;text-align:center">
          <a
            href="${escapeHtml(conviteUrl)}"
            target="_blank"
            style="
              display:inline-block;
              margin:8px 6px;
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
        Este e-mail foi enviado pela conta Google conectada pelos anfitriões ao convite.
      </div>
    </div>
  </div>
</body>
</html>`;

    const ics =
      montarIcs(
        cfg,
        evento.slug
      );

    const boundary =
      `conviteia_${crypto.randomUUID().replace(/-/g, '')}`;

    const headers = [
      `To: ${email}`,
      `Subject: =?UTF-8?B?${base64Utf8(subject)}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
    ];

    const partes = [
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      html,
    ];

    if (ics) {
      partes.push(
        `--${boundary}`,
        'Content-Type: text/calendar; charset=UTF-8; method=PUBLISH; name="convite.ics"',
        'Content-Disposition: attachment; filename="convite.ics"',
        'Content-Transfer-Encoding: base64',
        '',
        base64Utf8(ics)
      );
    }

    partes.push(
      `--${boundary}--`,
      ''
    );

    const raw =
      base64UrlUtf8(
        [
          ...headers,
          ...partes,
        ].join('\r\n')
      );

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
            raw,
          }),
        }
      );

    const gmailData =
      await gmailResponse.json();

    if (!gmailResponse.ok) {
      throw new Error(
        gmailData?.error?.message ||
        'O Gmail não aceitou o envio.'
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
      .eq('id', logId);

    return json({
      success: true,
      sent: true,
      message_id:
        gmailData.id ?? null,
      agenda_url:
        agendaUrl,
    });
  } catch (error) {
    console.error(
      'ConviteIA Google confirmação:',
      error
    );

    if (logId) {
      await conv
        .from('google_envios')
        .update({
          status: 'falhou',
          ultimo_erro:
            error instanceof Error
              ? error.message.slice(
                  0,
                  500
                )
              : 'Falha no envio.',
        })
        .eq('id', logId);
    }

    // Falha de e-mail NÃO invalida o RSVP.
    return json({
      success: false,
      sent: false,
      reason: 'falha_envio',
      error:
        error instanceof Error
          ? error.message
          : 'Falha no envio.',
    });
  }
});
