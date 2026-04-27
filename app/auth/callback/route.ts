import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const isLink = requestUrl.searchParams.get('link') === 'true';

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

        // ── Se veio do fluxo de vinculação de conta, redireciona ao perfil ──
        if (isLink) {
          const response = NextResponse.redirect(
            new URL('/dashboard/perfil?linked=google', requestUrl.origin)
          );
          response.cookies.set('lastLoggedInUser', data.session.user.email!, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax',
            secure: true,
          });
          console.log('🔗 Conta Google vinculada para:', data.session.user.email);
          return response;
        }
        // ─────────────────────────────────────────────────────────────────────

        const response = NextResponse.redirect(new URL(next, requestUrl.origin));

        response.cookies.set('lastLoggedInUser', data.session.user.email!, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
          sameSite: 'lax',
          secure: true,
        });

        // ── Registrar indicação se veio de link ──────────────────────────────
        try {
          const pendingRef = cookieStore.get('pendingRefCode')?.value;
          if (pendingRef && data.session.user) {
            const userId = data.session.user.id;

            // Verificar se já tem indicação registrada
            const { data: existing } = await supabase
              .from('user_referrals')
              .select('id')
              .eq('referred_id', userId)
              .maybeSingle();

            if (!existing) {
              // Buscar referrer pelo código
              const { data: referrerProfile } = await supabase
                .from('user_profiles')
                .select('user_id')
                .eq('referral_code', pendingRef.toUpperCase())
                .maybeSingle();

              if (referrerProfile && referrerProfile.user_id !== userId) {
                await supabase.from('user_referrals').insert({
                  referrer_id: referrerProfile.user_id,
                  referred_id: userId,
                  referral_code: pendingRef.toUpperCase(),
                  status: 'pending',
                });
                console.log(`✅ Indicação registrada: ${pendingRef} → ${userId}`);
              }
            }

            // Limpar cookie
            response.cookies.delete('pendingRefCode');
          }
        } catch (refError) {
          console.error('⚠️ Erro ao registrar indicação (não-crítico):', refError);
        }
        // ─────────────────────────────────────────────────────────────────────

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