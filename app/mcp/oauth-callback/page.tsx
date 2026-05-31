// app/mcp/oauth-callback/page.tsx
'use client'

import { useEffect, Suspense } from 'react'
import { useRouter }           from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2 }             from 'lucide-react'

function OAuthCallbackContent() {
  const router   = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    async function handle() {
      try {
        // Aguarda sessão ser estabelecida pelo Supabase após OAuth Google
        let session = (await supabase.auth.getSession()).data.session
        if (!session) {
          await new Promise(r => setTimeout(r, 1500))
          session = (await supabase.auth.getSession()).data.session
          if (!session) throw new Error('Sessão não estabelecida')
        }

        // CORREÇÃO: lê do cookie (onde o page.tsx salva antes do redirect Google)
        // sessionStorage não sobrevive ao redirect para outra origem
        const raw = document.cookie
          .split(';')
          .map(c => c.trim())
          .find(c => c.startsWith('mcp_oauth_params='))
          ?.split('=')
          .slice(1)
          .join('=') ?? ''

        // Limpa o cookie imediatamente
        document.cookie = 'mcp_oauth_params=; path=/; max-age=0; SameSite=Lax; Secure'

        if (!raw) {
          // Sem params MCP — redirect normal para o dashboard
          router.push('/dashboard')
          return
        }

        const params = JSON.parse(decodeURIComponent(raw))
        const redirectUri = params.redirect_uri ?? ''
        const state       = params.state        ?? ''
        const clientId    = params.client_id    ?? ''

        if (!redirectUri) {
          router.push('/dashboard')
          return
        }

        // Volta para a tela de confirmação com os params MCP e flag google_done
        const url = new URL('/mcp/authorize', window.location.origin)
        url.searchParams.set('redirect_uri',  redirectUri)
        url.searchParams.set('state',         state)
        url.searchParams.set('client_id',     clientId)
        url.searchParams.set('response_type', 'code')
        url.searchParams.set('google_done',   '1')

        router.replace(url.toString())

      } catch (err: any) {
        console.error('MCP OAuth callback error:', err.message)
        router.push('/login?error=auth_error')
      }
    }

    handle()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      <p className="text-white/60 text-sm">Finalizando autenticação...</p>
    </div>
  )
}

export default function McpOAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  )
}
