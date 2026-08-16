import { createClient, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function redirectWith(origin: string, next: string, params: Record<string, string>) {
  const url = new URL(next || '/dashboard', origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const returnedState = requestUrl.searchParams.get('state');
  const cookieState = request.headers.get('cookie')?.match(/mp_oauth_state=([^;]+)/)?.[1];

  if (!code || !returnedState || returnedState !== cookieState) {
    return redirectWith(requestUrl.origin, '/dashboard', { mp_error: 'state' });
  }

  const [, companyId, nextEncoded] = returnedState.split('.');
  const next = nextEncoded ? decodeURIComponent(nextEncoded) : '/dashboard';

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', requestUrl.origin));

  const { data: company } = await supabase.from('companies')
    .select('id,user_id,segment_key')
    .eq('id', companyId).eq('user_id', user.id).maybeSingle();
  if (!company) return redirectWith(requestUrl.origin, next, { mp_error: 'no_company' });

  const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.ML_APP_ID,
      client_secret: process.env.ML_APP_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${requestUrl.origin}/api/mp/callback`,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData?.access_token) {
    console.error('Erro ao trocar code por token MP:', tokenRes.status);
    return redirectWith(requestUrl.origin, next, { mp_error: 'token' });
  }

  const admin = createAdminClient();

  if (company.segment_key === 'pix_wiki') {
    const mpUserId = String(tokenData.user_id ?? '');
    if (!mpUserId) return redirectWith(requestUrl.origin, next, { mp_error: 'seller' });

    const { data: usedByOther } = await admin.from('pixwiki_mp_connections')
      .select('company_id')
      .eq('mp_user_id', mpUserId)
      .eq('is_active', true)
      .neq('company_id', company.id)
      .maybeSingle();
    if (usedByOther) {
      return redirectWith(requestUrl.origin, next, { mp_error: 'account_in_use', company: company.id });
    }

    const { data: existing } = await admin.from('pixwiki_mp_connections')
      .select('id,legacy_connection_id,refresh_token')
      .eq('company_id', company.id)
      .maybeSingle();

    const refreshToken = tokenData.refresh_token || existing?.refresh_token;
    if (!refreshToken) return redirectWith(requestUrl.origin, next, { mp_error: 'refresh_token' });

    const connectionRow = {
      company_id: company.id,
      user_id: user.id,
      mp_user_id: mpUserId,
      access_token: tokenData.access_token,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + Number(tokenData.expires_in ?? 15552000) * 1000).toISOString(),
      granted_scope: tokenData.scope ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveError } = await admin.from('pixwiki_mp_connections')
      .upsert(connectionRow, { onConflict: 'company_id' })
      .select('id,legacy_connection_id')
      .single();
    if (saveError || !saved) {
      console.error('Erro ao salvar conexão MP PixWiki:', saveError?.message);
      return redirectWith(requestUrl.origin, next, { mp_error: 'save_failed' });
    }

    const { error: settingsError } = await admin.from('pixwiki_payment_settings').upsert({
      company_id: company.id,
      user_id: user.id,
      mp_connection_id: saved.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });
    if (settingsError) {
      console.error('Erro ao vincular conexão MP à empresa PixWiki:', settingsError.message);
      return redirectWith(requestUrl.origin, next, { mp_error: 'link_failed' });
    }

    // Empresas que já existiam antes da multiempresa mantêm um espelho legado.
    // Atualizá-lo evita quebrar outras rotinas antigas da minhAi que ainda leem
    // mp_connections por usuário.
    if (saved.legacy_connection_id) {
      await admin.from('mp_connections').update({
        mp_user_id: mpUserId,
        access_token: tokenData.access_token,
        refresh_token: refreshToken,
        expires_at: connectionRow.expires_at,
        granted_scope: connectionRow.granted_scope,
        is_active: true,
        updated_at: connectionRow.updated_at,
      }).eq('id', saved.legacy_connection_id);
    }

    const response = redirectWith(requestUrl.origin, next, { mp_connected: '1', company: company.id });
    response.cookies.delete('mp_oauth_state');
    return response;
  }

  // Compatibilidade integral para os demais produtos do repositório.
  const { error: upsertError } = await admin.from('mp_connections').upsert({
    user_id: user.id,
    mp_user_id: String(tokenData.user_id ?? ''),
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: new Date(Date.now() + Number(tokenData.expires_in ?? 15552000) * 1000).toISOString(),
    granted_scope: tokenData.scope ?? null,
    is_active: true,
  }, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('Erro ao salvar conexão Mercado Pago:', upsertError.message);
    return redirectWith(requestUrl.origin, next, { mp_error: 'save_failed' });
  }

  const response = redirectWith(requestUrl.origin, next, { mp_connected: '1' });
  response.cookies.delete('mp_oauth_state');
  return response;
}
