// app/api/mcp/oauth/authorize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const APP_URL          = process.env.NEXT_PUBLIC_APP_URL    ?? 'https://minhai.app'
const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const clientId            = searchParams.get('client_id')            ?? ''
  const redirectUri         = searchParams.get('redirect_uri')         ?? ''
  const state               = searchParams.get('state')                ?? ''
  const responseType        = searchParams.get('response_type')        ?? ''
  const codeChallenge       = searchParams.get('code_challenge')       ?? ''
  const codeChallengeMethod = searchParams.get('code_challenge_method')?? 'S256'

  if (responseType !== 'code') {
    return NextResponse.json({ error: 'unsupported_response_type' }, { status: 400 })
  }

  if (!redirectUri) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri obrigatório' }, { status: 400 })
  }

  // Aceita qualquer client_id:
  // - estático configurado no env (MCP_CLIENT_ID)
  // - dinâmico gerado pelo DCR (mcp_client_*)
  // - vazio (clientes que não enviam client_id)
  // NUNCA rejeitar aqui — a validação real acontece no /token
  const configuredClientId = (process.env.MCP_CLIENT_ID ?? '').trim()
  if (
    configuredClientId &&
    clientId &&
    clientId !== configuredClientId &&
    !clientId.startsWith('mcp_client_')
  ) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
  }

  // Busca o client_name real registrado no DCR para exibir na tela
  // ex: "ChatGPT", "Claude", "Cursor", "Manus"
  let clientDisplayName = ''
  if (clientId.startsWith('mcp_client_') && SUPABASE_URL && SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
      const { data } = await supabase
        .from('mcp_registered_clients')
        .select('client_name')
        .eq('client_id', clientId)
        .single()
      if (data?.client_name) clientDisplayName = data.client_name
    } catch (_e) { /* não bloqueia */ }
  }

  // Monta URL da tela de autorização
  const authPageUrl = new URL(`${APP_URL}/mcp/authorize`)
  authPageUrl.searchParams.set('redirect_uri',  redirectUri)
  authPageUrl.searchParams.set('state',         state)
  authPageUrl.searchParams.set('client_id',     clientId)
  authPageUrl.searchParams.set('response_type', 'code')
  if (codeChallenge)       authPageUrl.searchParams.set('code_challenge',        codeChallenge)
  if (codeChallengeMethod) authPageUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
  if (clientDisplayName)   authPageUrl.searchParams.set('client_name',           clientDisplayName)

  return NextResponse.redirect(authPageUrl.toString())
}
