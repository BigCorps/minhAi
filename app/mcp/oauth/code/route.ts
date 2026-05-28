// app/api/mcp/oauth/code/route.ts
// Gera o authorization_code temporário após o usuário autorizar na página /mcp/authorize
// Chamado pelo cliente (browser do usuário), não pelo cliente MCP

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const { user_id, company_id, client_name, scopes } = await req.json()

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

    await supabase.from('mcp_pending_codes').insert({
      code,
      user_id,
      company_id,
      client_name: client_name ?? 'unknown',
      scopes:      scopes ?? ['tools'],
    })

    return NextResponse.json({ code })

  } catch (err: any) {
    console.error('❌ MCP code error:', err.message)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}