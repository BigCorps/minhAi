import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');

    if (!supabaseUrl || !serviceRole || !clientId) {
      throw new Error('Configuração Google indisponível no servidor.');
    }

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!jwt) {
      return json({ error: 'Faça login para continuar.' }, 401);
    }

    const body = await req.json().catch(() => null);
    const eventoId = String(body?.evento_id ?? '').trim();

    if (!eventoId) {
      return json({ error: 'Convite não informado.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } =
      await admin.auth.getUser(jwt);

    const user = authData?.user;

    if (authError || !user) {
      return json({ error: 'Sessão inválida.' }, 401);
    }

    const conv = admin.schema('conviteria');

    const { data: evento, error: eventoError } = await conv
      .from('eventos')
      .select('id, conta_id')
      .eq('id', eventoId)
      .maybeSingle();

    if (eventoError || !evento) {
      return json({ error: 'Convite não encontrado.' }, 404);
    }

    const { data: conta } = await conv
      .from('contas')
      .select('user_id')
      .eq('id', evento.conta_id)
      .maybeSingle();

    if (!conta || conta.user_id !== user.id) {
      return json({ error: 'Convite não encontrado.' }, 404);
    }

    await conv
      .from('google_oauth_states')
      .delete()
      .eq('evento_id', eventoId)
      .eq('user_id', user.id)
      .is('used_at', null);

    const stateBytes = new Uint8Array(32);
    crypto.getRandomValues(stateBytes);

    const state = bytesToHex(stateBytes);
    const stateHash = await sha256Hex(state);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: stateError } = await conv
      .from('google_oauth_states')
      .insert({
        state_hash: stateHash,
        evento_id: eventoId,
        user_id: user.id,
        expires_at: expiresAt,
      });

    if (stateError) {
      console.error('ConviteIA Google state:', stateError);
      throw new Error('Não foi possível iniciar a conexão Google.');
    }

    const redirectUri =
      `${supabaseUrl}/functions/v1/conviteia-google-auth-callback`;

    // A Agenda do convidado é alimentada por link/ICS gerado pelo ConviteIA.
    // Portanto a conta do anfitrião só precisa autorizar o envio pelo Gmail.
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const authUrl =
      new URL('https://accounts.google.com/o/oauth2/v2/auth');

    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return json({
      success: true,
      auth_url: authUrl.toString(),
    });
  } catch (error) {
    console.error('ConviteIA google-auth-url:', error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível conectar ao Google.',
      },
      500
    );
  }
});
