// supabase/functions/melhoria-google-auth-callback/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Recebe o retorno do Google e guarda os tokens.
//
//   supabase functions deploy melhoria-google-auth-callback --no-verify-jwt
//
// verify_jwt = false é obrigatório: quem chama é o Google, que não tem JWT do
// Supabase. A segurança vem do `state`, consumido de forma atômica.
//
// Este é o URI que precisa ser acrescentado ao OAuth Client no Google Console:
//   https://<projeto>.supabase.co/functions/v1/melhoria-google-auth-callback
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const APP = 'https://melhoria.org';

async function sha256Hex(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Volta para o app com uma mensagem em português claro, nunca com erro cru. */
function voltar(tipo: 'ok' | 'erro', mensagem: string) {
  const destino = new URL(`${APP}/melhoria/agenda`);
  destino.searchParams.set('google', tipo);
  destino.searchParams.set('msg', mensagem);
  return new Response(null, { status: 302, headers: { Location: destino.toString() } });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code  = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const erroGoogle = url.searchParams.get('error');

    // A pessoa clicou em "Cancelar" na tela do Google. Não é falha.
    if (erroGoogle === 'access_denied') {
      return voltar('erro', 'Você não autorizou o acesso à agenda. Tudo bem, os lembretes continuam funcionando pelo aplicativo.');
    }
    if (!code || !state) {
      return voltar('erro', 'Não foi possível conectar. Tente de novo.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      db: { schema: 'melhoria' },
      auth: { persistSession: false },
    });

    const stateHash = await sha256Hex(state);

    const { data: linha } = await admin
      .from('google_oauth_states')
      .select('id, perfil_id, user_id, expires_at, used_at')
      .eq('state_hash', stateHash)
      .maybeSingle();

    if (!linha || linha.used_at || new Date(linha.expires_at) < new Date()) {
      return voltar('erro', 'Esta autorização expirou. Comece de novo pela tela de consultas.');
    }

    // Consumo ATÔMICO: o `.is('used_at', null)` no UPDATE é o que impede
    // replay. Ler e depois marcar em dois passos abre janela de corrida.
    const { data: consumido } = await admin
      .from('google_oauth_states')
      .update({ used_at: new Date().toISOString() })
      .eq('id', linha.id)
      .is('used_at', null)
      .select('id')
      .maybeSingle();

    if (!consumido) {
      return voltar('erro', 'Esta autorização já foi usada. Comece de novo.');
    }

    // ── Troca do código pelos tokens ──────────────────────────────────────
    const resposta = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!,
        redirect_uri:  `${supabaseUrl}/functions/v1/melhoria-google-auth-callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await resposta.json();
    if (!resposta.ok || !tokens.access_token) {
      console.error('troca de token falhou:', tokens);
      return voltar('erro', 'O Google recusou a conexão. Tente de novo.');
    }

    // Descobre o e-mail da conta conectada, para mostrar na tela.
    let email: string | null = null;
    try {
      const info = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (info.ok) email = (await info.json())?.email ?? null;
    } catch { /* não é crítico */ }

    // O Google só manda refresh_token na PRIMEIRA autorização. Numa
    // reconexão ele vem vazio — preservar o antigo é o que evita a conexão
    // morrer em 1 hora.
    const { data: existente } = await admin
      .from('google_conexoes')
      .select('refresh_token')
      .eq('perfil_id', linha.perfil_id)
      .maybeSingle();

    const refreshToken = tokens.refresh_token || existente?.refresh_token || null;

    const { error } = await admin
      .from('google_conexoes')
      .upsert({
        perfil_id: linha.perfil_id,
        google_email: email,
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        token_type: tokens.token_type ?? 'Bearer',
        scopes: (tokens.scope ?? '').split(' ').filter(Boolean),
        expires_at: new Date(Date.now() + Number(tokens.expires_in ?? 3600) * 1000).toISOString(),
        is_active: true,
        last_token_refresh: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'perfil_id' });

    if (error) {
      console.error('upsert conexão:', error);
      return voltar('erro', 'Conectou no Google, mas não consegui salvar. Tente de novo.');
    }

    // Registra o consentimento de agenda com carimbo de tempo (LGPD).
    await admin
      .from('perfis')
      .update({ consentiu_agenda_em: new Date().toISOString() })
      .eq('id', linha.perfil_id);

    return voltar('ok', 'Agenda do Google conectada.');
  } catch (e) {
    console.error('melhoria-google-auth-callback:', e);
    return voltar('erro', 'Algo deu errado. Tente de novo em instantes.');
  }
});
