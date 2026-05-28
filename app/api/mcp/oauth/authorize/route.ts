// app/api/mcp/oauth/authorize/route.ts
// Passo 1 do OAuth 2.0 — redireciona para tela de login/autorização minhAi
// Claude e ChatGPT chamam esta URL quando o usuário adiciona o connector

import { NextRequest, NextResponse } from 'next/server'

const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://minhai.app'
const CLIENT_ID = process.env.MCP_CLIENT_ID ?? ''

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

  // Aceitar qualquer client_id quando CLIENT_ID não está configurado (fallback)
  // Ou validar normalmente quando está configurado
  if (CLIENT_ID && clientId !== CLIENT_ID) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
  }

  if (!redirectUri) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri obrigatório' }, { status: 400 })
  }

  // Redireciona para a página de autorização minhAi
  // Passa TODOS os parâmetros OAuth incluindo PKCE (code_challenge)
  const authPageUrl = new URL(`${APP_URL}/mcp/authorize`)
  authPageUrl.searchParams.set('redirect_uri',  redirectUri)
  authPageUrl.searchParams.set('state',         state ?? '')
  authPageUrl.searchParams.set('client_id',     clientId ?? '')
  authPageUrl.searchParams.set('response_type', 'code')

  // Repassar parâmetros PKCE — obrigatório para Claude e ChatGPT
  if (codeChallenge)       authPageUrl.searchParams.set('code_challenge',        codeChallenge)
  if (codeChallengeMethod) authPageUrl.searchParams.set('code_challenge_method', codeChallengeMethod)

  return NextResponse.redirect(authPageUrl.toString())
}
