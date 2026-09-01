import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')

  if (!companyId) {
    return NextResponse.json({ error: 'company_id obrigatório' }, { status: 400 })
  }

  // Codifica company_id no state para recuperar no callback
  const state = Buffer.from(JSON.stringify({ company_id: companyId, user_id: user.id })).toString('base64')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ML_APP_ID!,
    redirect_uri: process.env.ML_REDIRECT_URI!,
    state,
  })

  const authUrl = `https://auth.mercadolivre.com.br/authorization?${params.toString()}`

  return NextResponse.redirect(authUrl)
}