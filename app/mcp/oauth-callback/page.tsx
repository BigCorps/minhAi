// app/mcp/oauth-callback/page.tsx
// Após login com Google, recupera os params MCP do sessionStorage
// e redireciona para a tela de confirmação de empresa

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
        // Aguarda a sessão ser estabelecida pelo Supabase após OAuth
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // Aguarda mais um pouco se a sessão ainda não chegou
          await new Promise(r => setTimeout(r, 1500))
          const { data: { session: session2 } } = await supabase.auth.getSession()
          if (!session2) throw new Error('Sessão não estabelecida')
        }

        // Recuperar params MCP salvos antes do redirect para o Google
        const redirectUri = sessionStorage.getItem('mcp_redirect_uri') ?? ''
        const state       = sessionStorage.getItem('mcp_state') ?? ''
        const clientId    = sessionStorage.getItem('mcp_client_id') ?? ''

        sessionStorage.removeItem('mcp_redirect_uri')
        sessionStorage.removeItem('mcp_state')
        sessionStorage.removeItem('mcp_client_id')

        if (!redirectUri) {
          // Sem params MCP — redireciona pro dashboard normal
          router.push('/dashboard')
          return
        }

        // Redireciona de volta para a tela de confirmação com os params
        const url = new URL('/mcp/authorize', window.location.origin)
        url.searchParams.set('redirect_uri', redirectUri)
        url.searchParams.set('state', state)
        url.searchParams.set('client_id', clientId)
        url.searchParams.set('response_type', 'code')
        url.searchParams.set('google_done', '1') // flag para pular o step de login

        router.replace(url.toString())

      } catch (err: any) {
        console.error('MCP OAuth callback error:', err.message)
        router.push('/login?error=auth_error')
      }
    }

    handle()
  }, [])

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