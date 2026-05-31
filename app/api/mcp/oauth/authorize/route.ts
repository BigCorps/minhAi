// app/api/mcp/oauth/authorize/route.ts
// Passo 1 do OAuth 2.0 — redireciona para tela de login/autorização minhAi
// Claude e ChatGPT chamam esta URL quando o usuário adiciona o connector

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const APP_URL          = process.env.NEXT_PUBLIC_APP_URL ?? 'https://minhai.app'
const CLIENT_ID        = process.env.MCP_CLIENT_ID ?? ''
const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const clientId            = searchParams.get('client_id')
  const redirectUri         = searchParams.get('redirect_uri')
  const state               = searchParams.get('state')
  const responseType        = searchParams.get('response_type')
  const codeChallenge       = searchParams.get('code_challenge')
  const codeChallengeMethod = searchParams.get('code_challenge_method')

  // Validações básicas
  if (responseType !== 'code') {
    return NextResponse.json({ error: 'unsupported_response_type' }, { status: 400 })
  }

  // Aceita: client estático (minhai-mcp-v1), dinâmico DCR (mcp_client_*), ou sem CLIENT_ID configurado
  const isStatic  = !CLIENT_ID || clientId === CLIENT_ID
  const isDynamic = (clientId ?? '').startsWith('mcp_client_')

  if (!isStatic && !isDynamic) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
  }

  if (!redirectUri) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri obrigatório' }, { status: 400 })
  }

  // Para clientes dinâmicos (DCR), busca o client_name registrado
  // Isso permite exibir "Conectar ao Manus" em vez de sempre "Conectar ao Claude"
  let clientDisplayName = ''
  if (isDynamic && clientId) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
      const { data } = await supabase
        .from('mcp_registered_clients')
        .select('client_name')
        .eq('client_id', clientId)
        .single()
      if (data?.client_name) clientDisplayName = data.client_name
    } catch (_e) { /* não bloqueia o fluxo */ }
  }

  // Redireciona para a página de autorização minhAi
  const authPageUrl = new URL(`${APP_URL}/mcp/authorize`)
  authPageUrl.searchParams.set('redirect_uri',  redirectUri)
  authPageUrl.searchParams.set('state',         state ?? '')
  authPageUrl.searchParams.set('client_id',     clientId ?? '')
  authPageUrl.searchParams.set('response_type', 'code')

  // Repassar parâmetros PKCE
  if (codeChallenge)       authPageUrl.searchParams.set('code_challenge',        codeChallenge)
  if (codeChallengeMethod) authPageUrl.searchParams.set('code_challenge_method', codeChallengeMethod)

  // Repassar client_name resolvido (para o authorize page usar)
  if (clientDisplayName)   authPageUrl.searchParams.set('client_display_name', clientDisplayName)

  return NextResponse.redirect(authPageUrl.toString())
}
