import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    try {
      const cookieStore = await cookies();
      const supabase = createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('❌ Erro ao trocar code por session:', error);
        return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin));
      }

      if (data.session) {
        console.log('✅ Sessão criada:', data.session.user.email);
        console.log('🔄 Redirecionando para:', next);

        const response = NextResponse.redirect(new URL(next, requestUrl.origin));

        // Salvar email no cookie para biometria detectar no login
        response.cookies.set('lastLoggedInUser', data.session.user.email!, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
          sameSite: 'lax',
          secure: true,
        });

        // Registrar indicação para OAuth (Google/Facebook)
        try {
          const pendingRef = cookieStore.get('pendingRefCode')?.value;
          if (pendingRef && data.session.user) {
            const { data: referrerProfile } = await supabase
              .from('user_profiles')
              .select('user_id')
              .eq('referral_code', pendingRef.toUpperCase())
              .single();

            if (referrerProfile) {
              await supabase.from('user_referrals').insert({
                referrer_id: referrerProfile.user_id,
                referred_id: data.session.user.id,
                referral_code: pendingRef.toUpperCase(),
                status: 'pending',
              });
              console.log('✅ Indicação OAuth registrada:', pendingRef.toUpperCase());
            }

            response.cookies.delete('pendingRefCode');
          }
        } catch (refError) {
          console.error('Erro ao registrar indicação OAuth:', refError);
        }

        return response;
      }
    } catch (error) {
      console.error('❌ Erro no callback:', error);
      return NextResponse.redirect(new URL('/login?error=callback_error', requestUrl.origin));
    }
  }

  console.warn('⚠️ Callback sem code');
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
