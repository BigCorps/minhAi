 import { createClient, createAdminClient } from '@/lib/supabase-server';
 import { NextResponse } from 'next/server';

 export const dynamic = 'force-dynamic';

 export async function GET(request: Request) {
   const requestUrl = new URL(request.url);
   const code = requestUrl.searchParams.get('code');
   const returnedState = requestUrl.searchParams.get('state');
   const cookieState = request.headers.get('cookie')?.match(/mp_oauth_state=([^;]+)/)?.[1];

   if (!code || !returnedState || returnedState !== cookieState) {
     return NextResponse.redirect(new URL('/dashboard?mp_error=1', requestUrl.origin));
   }

   const [, companyId, nextEncoded] = returnedState.split('.');
   const next = nextEncoded ? decodeURIComponent(nextEncoded) : '/dashboard';

   const supabase = createClient();
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) {
     return NextResponse.redirect(new URL('/login', requestUrl.origin));
   }

   const { data: company } = await supabase
     .from('companies')
     .select('id')
     .eq('id', companyId)
     .eq('user_id', user.id)
     .maybeSingle();

   if (!company) {
     return NextResponse.redirect(new URL(`${next}?mp_error=no_company`, requestUrl.origin));
   }

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
   if (!tokenRes.ok) {
     console.error('Erro ao trocar code por token MP:', tokenData);
     return NextResponse.redirect(new URL(`${next}?mp_error=token`, requestUrl.origin));
   }

   const admin = createAdminClient();
   const { error: upsertError } = await admin.from('mp_connections').upsert({
     user_id: user.id,
     mp_user_id: String(tokenData.user_id ?? ''),
     access_token: tokenData.access_token,
     refresh_token: tokenData.refresh_token,
     expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
     granted_scope: tokenData.scope ?? null,
     is_active: true,
   }, { onConflict: 'user_id' });

   if (upsertError) {
     console.error('Erro ao salvar conexão Mercado Pago:', upsertError);
     return NextResponse.redirect(new URL(`${next}?mp_error=save_failed`, requestUrl.origin));
   }

   const response = NextResponse.redirect(new URL(`${next}?mp_connected=1`, requestUrl.origin));
   response.cookies.delete('mp_oauth_state');
   return response;
 }
