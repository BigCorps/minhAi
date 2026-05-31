// app/api/mcp/oauth/code/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const { user_id, company_id, client_name, scopes, code_challenge, code_challenge_method } = await req.json()

    if (!user_id || !company_id) {
      return NextResponse.json({ error: 'user_id e company_id obrigatórios' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Verificar que o user_id é dono da company_id
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .eq('user_id', user_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 403 })
    }

    // Gerar code único
    const code = `mcp_code_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`

    // CORREÇÃO: expires_at obrigatório — token/route.ts filtra por .gt('expires_at', now)
    // Sem isso o insert falha se a coluna for NOT NULL, ou o code nunca é encontrado
    await supabase.from('mcp_pending_codes').insert({
      code,
      user_id,
      company_id,
      client_name:           client_name ?? 'unknown',
      scopes:                scopes ?? ['tools'],
      code_challenge:        code_challenge ?? null,
      code_challenge_method: code_challenge_method ?? 'S256',
      expires_at:            new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
      used:                  false,
    })

    return NextResponse.json({ code })

  } catch (err: any) {
    console.error('❌ MCP code error:', err.message)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
