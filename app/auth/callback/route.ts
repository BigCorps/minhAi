// app/auth/callback/route.ts
// Callback OAuth do Supabase — login Google/Facebook + fluxo MCP
// Modificação: detecta fluxo MCP via cookie e redireciona corretamente

import { createClient }  from '@/lib/supabase-server'
import { recordPlatformOAuthLogin } from '@/lib/platform-activity-server'
import { NextResponse }  from 'next/server'
import { cookies }       from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code   = requestUrl.searchParams.get('code')
  const next   = requestUrl.searchParams.get('next') ?? '/dashboard'
  const isLink = requestUrl.searchParams.get('link') === 'true'
  const linkNext = requestUrl.searchParams.get('next') ?? '/dashboard/perfil?linked=google'

  if (code) {
    try {
      const cookieStore = await cookies()
      const supabase    = createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('❌ Erro ao trocar code por session:', error)
        return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin))
      }

      if (data.session) {
        console.log('✅ Sessão criada:', data.session.user.email)

        // ── Detectar fluxo MCP ───────────────────────────────────────────────
        // O cookie mcp_oauth_params é salvo pelo authorize page antes do redirect Google
        const mcpParamsCookie = cookieStore.get('mcp_oauth_params')?.value
        if (mcpParamsCookie) {
          try {
            const mcpParams = JSON.parse(decodeURIComponent(mcpParamsCookie))
            const { redirect_uri, state, client_id } = mcpParams

            // Montar URL de volta para /mcp/authorize com flag google_done=1
            const authorizeUrl = new URL('/mcp/authorize', requestUrl.origin)
            authorizeUrl.searchParams.set('redirect_uri',  redirect_uri)
            authorizeUrl.searchParams.set('state',         state ?? '')
            authorizeUrl.searchParams.set('client_id',     client_id ?? '')
            authorizeUrl.searchParams.set('response_type', 'code')
            authorizeUrl.searchParams.set('google_done',   '1')

            const response = NextResponse.redirect(authorizeUrl.toString())

            // Limpar cookie MCP
            response.cookies.delete('mcp_oauth_params')

            // Salvar email para biometria
            response.cookies.set('lastLoggedInUser', data.session.user.email!, {
              path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: true,
            })

            console.log('🔗 Fluxo MCP detectado — redirecionando para authorize')
            return response

          } catch (parseErr) {
            console.warn('⚠️ Erro ao parsear mcp_oauth_params:', parseErr)
            // Se falhar, cai no fluxo normal abaixo
          }
        }
        // ── Fim detecção MCP ─────────────────────────────────────────────────

        // ── Fluxo de vinculação de conta Google ──────────────────────────────
        if (isLink) {
          const response = NextResponse.redirect(
            new URL(linkNext, requestUrl.origin)
          )
          response.cookies.set('lastLoggedInUser', data.session.user.email!, {
            path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: true,
          })
          console.log('🔗 Conta Google vinculada para:', data.session.user.email)
          return response
        }
        // ────────────────────────────────────────────────────────────────────

        // ── Telemetria first-party: login por produto ───────────────────────
        // É deliberadamente não-crítica: uma indisponibilidade da telemetria
        // nunca pode bloquear o login do cliente.
        try {
          await recordPlatformOAuthLogin({
            user: data.session.user,
            hostname: requestUrl.hostname,
            nextPath: next,
          })
        } catch (activityError) {
          console.error(
            '⚠️ Não foi possível registrar login da plataforma (não-crítico):',
            activityError
          )
        }
        // ────────────────────────────────────────────────────────────────────

        const response = NextResponse.redirect(new URL(next, requestUrl.origin))

        response.cookies.set('lastLoggedInUser', data.session.user.email!, {
          path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: true,
        })

        // ── Registrar indicação se veio de link ──────────────────────────────
        try {
          const pendingRef = cookieStore.get('pendingRefCode')?.value
          if (pendingRef && data.session.user) {
            const userId = data.session.user.id

            const { data: existing } = await supabase
              .from('user_referrals')
              .select('id')
              .eq('referred_id', userId)
              .maybeSingle()

            if (!existing) {
              const { data: referrerProfile } = await supabase
                .from('user_profiles')
                .select('user_id')
                .eq('referral_code', pendingRef.toUpperCase())
                .maybeSingle()

              if (referrerProfile && referrerProfile.user_id !== userId) {
                await supabase.from('user_referrals').insert({
                  referrer_id:   referrerProfile.user_id,
                  referred_id:   userId,
                  referral_code: pendingRef.toUpperCase(),
                  status:        'pending',
                })
                console.log(`✅ Indicação registrada: ${pendingRef} → ${userId}`)
              }
            }

            response.cookies.delete('pendingRefCode')
          }
        } catch (refError) {
          console.error('⚠️ Erro ao registrar indicação (não-crítico):', refError)
        }
        // ────────────────────────────────────────────────────────────────────

        return response
      }
    } catch (err: any) {
      console.error('❌ Erro no callback:', err)
      return NextResponse.redirect(new URL('/login?error=callback_error', requestUrl.origin))
    }
  }

  console.warn('⚠️ Callback sem code')
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
