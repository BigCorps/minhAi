import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Usuário recusou a autorização
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integracoes-ia?ml=cancelled`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integracoes-ia?ml=error&reason=missing_params`
    )
  }

  // Decodifica state
  let companyId: string
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'))
    companyId = decoded.company_id
    userId = decoded.user_id
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integracoes-ia?ml=error&reason=invalid_state`
    )
  }

  // Troca code por tokens
  let tokenData: any
  try {
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ML_APP_ID!,
        client_secret: process.env.ML_APP_SECRET!,
        code,
        redirect_uri: process.env.ML_REDIRECT_URI!,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[ml/callback] token error:', err)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integracoes-ia?ml=error&reason=token_exchange`
      )
    }

    tokenData = await tokenRes.json()
  } catch (e) {
    console.error('[ml/callback] fetch error:', e)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integracoes-ia?ml=error&reason=network`
    )
  }

  // Busca dados do seller
  let sellerNickname = ''
  let sellerEmail = ''
  try {
    const userRes = await fetch(`https://api.mercadolibre.com/users/${tokenData.user_id}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (userRes.ok) {
      const sellerData = await userRes.json()
      sellerNickname = sellerData.nickname ?? ''
      sellerEmail = sellerData.email ?? ''
    }
  } catch {
    // não crítico — segue sem os dados do seller
  }

  // Salva/atualiza no Supabase
  const supabase = await createClient()
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  const { error: dbError } = await supabase
    .from('ml_connections')
    .upsert({
      company_id: companyId,
      user_id: userId,
      seller_id: String(tokenData.user_id),
      seller_nickname: sellerNickname,
      seller_email: sellerEmail,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      is_active: true,
      last_token_refresh: new Date().toISOString(),
    }, {
      onConflict: 'company_id',
    })

  if (dbError) {
    console.error('[ml/callback] db error:', dbError)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integracoes-ia?ml=error&reason=db`
    )
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integracoes-ia?ml=connected`
  )
}
