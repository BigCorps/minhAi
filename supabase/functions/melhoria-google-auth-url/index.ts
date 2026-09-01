// supabase/functions/melhoria-google-auth-url/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Gera a URL de consentimento do Google. Chamada pelo usuário logado, então
// esta é a única das quatro que MANTÉM verify_jwt.
//
//   supabase functions deploy melhoria-google-auth-url
//
// O CLIENT ID é compartilhado com o resto do ecossistema. A tela de permissão
// mostra a identidade minhAi — é intencional: são serviços da mesma plataforma,
// e a pessoa reconhece o nome desde o login.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ESCOPOS = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256Hex(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'não autenticado' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    if (!clientId) return json({ error: 'Google não configurado' }, 500);

    // Cliente com o JWT do usuário: quem valida a sessão é o próprio Supabase.
    const comoUsuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });

    const { data: sessao } = await comoUsuario.auth.getUser();
    if (!sessao?.user) return json({ error: 'sessão inválida' }, 401);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      db: { schema: 'melhoria' },
      auth: { persistSession: false },
    });

    const { data: perfis } = await admin
      .from('perfis')
      .select('id')
      .eq('user_id', sessao.user.id)
      .limit(1);

    const perfilId = perfis?.[0]?.id;
    if (!perfilId) return json({ error: 'perfil não encontrado' }, 404);

    // O state vai em claro para o Google e volta; no banco guardamos só o
    // hash. Vazamento de banco não entrega um state utilizável.
    const state = crypto.randomUUID() + crypto.randomUUID();
    const stateHash = await sha256Hex(state);

    const { error } = await admin.from('google_oauth_states').insert({
      state_hash: stateHash,
      perfil_id: perfilId,
      user_id: sessao.user.id,
    });
    if (error) return json({ error: 'falha ao iniciar' }, 500);

    const redirectUri = `${url}/functions/v1/melhoria-google-auth-callback`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', ESCOPOS.join(' '));
    authUrl.searchParams.set('state', state);
    // offline + consent: sem os dois, o Google não devolve refresh_token na
    // segunda autorização, e a conexão morre em 1 hora sem explicação.
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('include_granted_scopes', 'true');

    return json({ url: authUrl.toString() });
  } catch (e) {
    console.error('melhoria-google-auth-url:', e);
    return json({ error: 'erro interno' }, 500);
  }
});
