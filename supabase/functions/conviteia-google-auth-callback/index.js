import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const FRONTEND_CALLBACK =
  'https://conviteia.com/convite/google/callback';

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

function voltarAoConviteIA(status, message = '') {
  const destino = new URL(FRONTEND_CALLBACK);
  destino.searchParams.set('status', status);

  if (message) {
    destino.searchParams.set('message', message.slice(0, 240));
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: destino.toString(),
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    const googleError = url.searchParams.get('error');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (googleError) {
      return voltarAoConviteIA(
        'cancelled',
        'A conexão com o Google foi cancelada.'
      );
    }

    if (!code || !state) {
      return voltarAoConviteIA(
        'error',
        'A autorização recebida do Google está incompleta. Tente novamente.'
      );
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
      return voltarAoConviteIA(
        'error',
        'Esta autorização expirou ou já foi utilizada. Inicie novamente pelo painel.'
      );
    }

    const { data: stateConsumido, error: stateConsumeError } = await conv
      .from('google_oauth_states')
      .update({ used_at: agora })
      .eq('id', stateRow.id)
      .is('used_at', null)
      .select('id')
      .maybeSingle();

    if (stateConsumeError || !stateConsumido) {
      return voltarAoConviteIA(
        'error',
        'Esta autorização já foi utilizada. Inicie novamente pelo painel.'
      );
    }

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

    return voltarAoConviteIA('success');
  } catch (error) {
    console.error('ConviteIA google-auth-callback:', error);

    return voltarAoConviteIA(
      'error',
      error instanceof Error
        ? error.message
        : 'Não foi possível concluir a conexão Google.'
    );
  }
});
