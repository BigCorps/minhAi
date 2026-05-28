// app/api/mcp/oauth/token/route.ts
// Passo 2 do OAuth 2.0 — troca authorization_code por access_token
// Também processa grant_type=refresh_token

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLIENT_ID         = process.env.MCP_CLIENT_ID!
const CLIENT_SECRET     = process.env.MCP_CLIENT_SECRET!
const MCP_JWT_SECRET    = process.env.MCP_JWT_SECRET!

const TOKEN_TTL_SECONDS = 60 * 60 * 24       // 24 horas
const REFRESH_TTL_DAYS  = 90                  // 90 dias

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const grantType    = params.get('grant_type')
    const clientId     = params.get('client_id')
    const clientSecret = params.get('client_secret')
    const codeVerifier = params.get('code_verifier')

    // Validar client credentials
    // Suporta dois modos:
    // 1. Confidential client: client_id + client_secret (ex: ChatGPT)
    // 2. Public client com PKCE: apenas client_id + code_verifier (ex: Claude)
    const isConfidential = clientSecret && clientId === CLIENT_ID && clientSecret === CLIENT_SECRET
    const isPublicPKCE   = !clientSecret && clientId === CLIENT_ID
    const isAnyClient    = !CLIENT_ID // fallback se env var não estiver configurada

    if (!isConfidential && !isPublicPKCE && !isAnyClient) {
      return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // ── grant_type: authorization_code ──────────────────────────────────────
    if (grantType === 'authorization_code') {
      const code       = params.get('code')
      const redirectUri = params.get('redirect_uri')

      if (!code) {
        return NextResponse.json({ error: 'invalid_request', error_description: 'code obrigatório' }, { status: 400 })
      }

      // Buscar o pending_code gerado na página /mcp/authorize
      const { data: pending, error: pendingErr } = await supabase
        .from('mcp_pending_codes')
        .select('*')
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (pendingErr || !pending) {
        return NextResponse.json({ error: 'invalid_grant', error_description: 'Código inválido ou expirado' }, { status: 400 })
      }

      // ── Verificar PKCE se o challenge foi salvo ─────────────────────────────────
      const codeVerifier = params.get('code_verifier')
      if (pending.code_challenge) {
        if (!codeVerifier) {
          return NextResponse.json({ error: 'invalid_grant', error_description: 'code_verifier obrigatório' }, { status: 400 })
        }
        let challengeOk = false
        if (pending.code_challenge_method === 'plain') {
          challengeOk = codeVerifier === pending.code_challenge
        } else {
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
          const b64url = btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
          challengeOk = b64url === pending.code_challenge
        }
        if (!challengeOk) {
          return NextResponse.json({ error: 'invalid_grant', error_description: 'code_verifier inválido' }, { status: 400 })
        }
      }
      // ── Fim PKCE ──────────────────────────────────────────────────────────────────────────

      // Marcar code como usado
      await supabase
        .from('mcp_pending_codes')
        .update({ used: true })
        .eq('code', code)

      // Gerar tokens
      const { accessToken, refreshToken, expiresAt } = generateTokens(
        pending.user_id,
        pending.company_id,
      )

      // Salvar conexão
      await supabase.from('mcp_connections').upsert({
        user_id:         pending.user_id,
        company_id:      pending.company_id,
        access_token:    accessToken,
        refresh_token:   refreshToken,
        token_expires_at: expiresAt.toISOString(),
        client_name:     pending.client_name ?? 'unknown',
        client_id:       clientId,
        scopes:          pending.scopes ?? ['tools'],
        is_active:       true,
        last_used_at:    new Date().toISOString(),
      }, { onConflict: 'user_id,company_id,client_id' })

      return NextResponse.json({
        access_token:  accessToken,
        refresh_token: refreshToken,
        token_type:    'Bearer',
        expires_in:    TOKEN_TTL_SECONDS,
      })
    }

    // ── grant_type: refresh_token ───────────────────────────────────────────
    if (grantType === 'refresh_token') {
      const refreshToken = params.get('refresh_token')

      if (!refreshToken) {
        return NextResponse.json({ error: 'invalid_request', error_description: 'refresh_token obrigatório' }, { status: 400 })
      }

      const { data: conn, error: connErr } = await supabase
        .from('mcp_connections')
        .select('*')
        .eq('refresh_token', refreshToken)
        .eq('is_active', true)
        .single()

      if (connErr || !conn) {
        return NextResponse.json({ error: 'invalid_grant', error_description: 'refresh_token inválido' }, { status: 400 })
      }

      // Gerar novo access_token (mantém o refresh_token)
      const { accessToken, expiresAt } = generateTokens(conn.user_id, conn.company_id)

      await supabase
        .from('mcp_connections')
        .update({
          access_token:     accessToken,
          token_expires_at: expiresAt.toISOString(),
          last_used_at:     new Date().toISOString(),
        })
        .eq('id', conn.id)

      return NextResponse.json({
        access_token:  accessToken,
        refresh_token: refreshToken,
        token_type:    'Bearer',
        expires_in:    TOKEN_TTL_SECONDS,
      })
    }

    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })

  } catch (err: any) {
    console.error('❌ MCP token error:', err.message)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// ── Gerar tokens simples (assinados com MCP_JWT_SECRET via base64) ────────────
// Nota: em produção considere usar jose ou similar para JWT real.
// Aqui usamos um token opaco seguro armazenado no banco — sem decode necessário.

function generateTokens(userId: string, companyId: string) {
  const rand = () => crypto.randomUUID().replace(/-/g, '')
  const accessToken  = `mcp_at_${rand()}${rand()}`
  const refreshToken = `mcp_rt_${rand()}${rand()}`
  const expiresAt    = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000)
  return { accessToken, refreshToken, expiresAt }
}
