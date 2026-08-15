import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(digest));
}

function safeJsonForHtml(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function popupHtml({
  type,
  title,
  message,
  email = null,
  ok = false,
}) {
  const payload = safeJsonForHtml({
    type,
    email,
    message,
  });

  const accent = ok ? '#2e7d55' : '#a04a63';
  const icon = ok ? '✓' : '!';

  return new Response(
    `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${ok ? 'Google conectado' : 'Conexão Google'}</title>
  <style>
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      display:grid;
      place-items:center;
      padding:24px;
      background:#fff5f8;
      color:#40232c;
      font-family:Arial,Helvetica,sans-serif
    }
    .card{
      width:min(100%,420px);
      padding:32px 26px;
      border:1px solid rgba(192,96,120,.22);
      border-radius:24px;
      background:#fff;
      text-align:center;
      box-shadow:0 18px 55px rgba(64,35,44,.10)
    }
    .icon{
      width:52px;height:52px;
      display:grid;place-items:center;
      margin:0 auto 16px;
      border-radius:50%;
      background:#fdf0f3;
      color:${accent};
      font-size:26px;font-weight:800
    }
    h1{margin:0;font-size:24px}
    p{margin:12px 0 0;color:#7c5560;line-height:1.55;font-size:14px}
    a{
      display:inline-flex;
      margin-top:22px;
      padding:11px 18px;
      border-radius:999px;
      background:#d86090;
      color:white;
      text-decoration:none;
      font-size:13px;
      font-weight:700
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://conviteia.com/convite/painel">Voltar ao painel</a>
  </div>

  <script>
    const payload = ${payload};

    if (window.opener) {
      window.opener.postMessage(payload, '*');
      setTimeout(() => window.close(), 250);
    }
  </script>
</body>
</html>`,
    {
      status: ok ? 200 : 400,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    const googleError = url.searchParams.get('error');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (googleError) {
      return popupHtml({
        type: 'conviteia-google-auth-cancelled',
        title: 'Conexão cancelada',
        message:
          'A conta Google não foi conectada. Você pode tentar novamente pelo painel.',
      });
    }

    if (!code || !state) {
      return popupHtml({
        type: 'conviteia-google-auth-error',
        title: 'Não foi possível conectar',
        message:
          'A autorização recebida do Google está incompleta. Tente novamente.',
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

    if (!supabaseUrl || !serviceRole || !clientId || !clientSecret) {
      throw new Error('Configuração Google indisponível no servidor.');
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const conv = admin.schema('conviteria');

    const stateHash = await sha256Hex(state);
    const agora = new Date().toISOString();

    const { data: stateRow, error: stateError } = await conv
      .from('google_oauth_states')
      .select('id, evento_id, user_id, expires_at, used_at')
      .eq('state_hash', stateHash)
      .is('used_at', null)
      .gt('expires_at', agora)
      .maybeSingle();

    if (stateError || !stateRow) {
      return popupHtml({
        type: 'conviteia-google-auth-error',
        title: 'Autorização expirada',
        message:
          'Esta tentativa de conexão expirou ou já foi utilizada. Inicie novamente pelo painel.',
      });
    }

    // Torna o state de uso único antes de trocar o code.
    await conv
      .from('google_oauth_states')
      .update({ used_at: agora })
      .eq('id', stateRow.id)
      .is('used_at', null);

    // Confere novamente se o evento ainda pertence ao usuário que iniciou o OAuth.
    const { data: evento } = await conv
      .from('eventos')
      .select('id, conta_id')
      .eq('id', stateRow.evento_id)
      .maybeSingle();

    if (!evento) {
      throw new Error('Convite não encontrado.');
    }

    const { data: conta } = await conv
      .from('contas')
      .select('user_id')
      .eq('id', evento.conta_id)
      .maybeSingle();

    if (!conta || conta.user_id !== stateRow.user_id) {
      throw new Error('Convite não encontrado.');
    }

    const redirectUri =
      `${supabaseUrl}/functions/v1/conviteia-google-auth-callback`;

    const tokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      }
    );

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error('ConviteIA Google token:', tokens);
      throw new Error('O Google não concluiu a autorização.');
    }

    const { data: existente } = await conv
      .from('google_conexoes')
      .select('refresh_token, scopes')
      .eq('evento_id', stateRow.evento_id)
      .maybeSingle();

    const refreshToken =
      tokens.refresh_token || existente?.refresh_token;

    if (!refreshToken) {
      throw new Error(
        'O Google não retornou autorização de longo prazo. Reconecte a conta.'
      );
    }

    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const userInfo = await userInfoResponse.json();

    if (!userInfoResponse.ok || !userInfo.email) {
      throw new Error('Não foi possível identificar a conta Google.');
    }

    const scopes = String(tokens.scope || '')
      .split(' ')
      .map((s) => s.trim())
      .filter(Boolean);

    const scopesFinais =
      scopes.length > 0
        ? scopes
        : Array.isArray(existente?.scopes)
          ? existente.scopes
          : [];

    const expiresAt = new Date(
      Date.now() + Number(tokens.expires_in || 3600) * 1000
    ).toISOString();

    const { error: upsertError } = await conv
      .from('google_conexoes')
      .upsert(
        {
          evento_id: stateRow.evento_id,
          google_email: userInfo.email,
          google_user_id: userInfo.id ?? null,
          access_token: tokens.access_token,
          refresh_token: refreshToken,
          token_type: tokens.token_type ?? 'Bearer',
          scopes: scopesFinais,
          expires_at: expiresAt,
          is_active: true,
          last_token_refresh: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'evento_id',
        }
      );

    if (upsertError) {
      console.error('ConviteIA Google save:', upsertError);
      throw new Error('Não foi possível salvar a conexão Google.');
    }

    return popupHtml({
      type: 'conviteia-google-auth-success',
      title: 'Google conectado',
      message:
        'Esta conta já está vinculada somente a este convite.',
      email: userInfo.email,
      ok: true,
    });
  } catch (error) {
    console.error('ConviteIA google-auth-callback:', error);

    return popupHtml({
      type: 'conviteia-google-auth-error',
      title: 'Não foi possível conectar',
      message:
        error instanceof Error
          ? error.message
          : 'Tente novamente pelo painel da ConviteIA.',
    });
  }
});
