// app/api/dashboard/mcp/route.ts
// Proxy entre o widget do dashboard e o mcp-whatsapp-handler

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { message } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

    // Buscar configuração MCP do usuário
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('mcp_whatsapp_company_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Se não tem company MCP configurado, usar a primeira empresa Smart
    let companyId = profile?.mcp_whatsapp_company_id
    if (!companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .eq('assistant_type', 'smart')
        .order('created_at')
        .limit(1)
        .maybeSingle()
      companyId = company?.id
    }

    if (!companyId) {
      return NextResponse.json({ reply: '⚠️ Configure um assistente Smart em *Integrações IA → WhatsApp MCP* para usar este widget.' })
    }

    // Buscar access_token da conexão WhatsApp da empresa (para envio — não usado aqui, mas o handler precisa)
    // Como estamos no dashboard, não enviamos via WhatsApp — só precisamos da resposta
    const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const handlerRes = await fetch(`${SUPABASE_URL}/functions/v1/mcp-whatsapp-handler`, {
      method: 'POST',
      headers: {
        Authorization:   `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:            'dashboard',         // não vai pelo WhatsApp
        message_text:    message.trim(),
        phone_number_id: 'dashboard',         // ignorado no handler quando from=dashboard
        company_id:      companyId,
        user_id:         user.id,
        access_token:    '',                  // sem envio WhatsApp no modo dashboard
        dashboard_mode:  true,               // sinaliza que não deve enviar WhatsApp
      }),
    })

    if (!handlerRes.ok) {
      const err = await handlerRes.text()
      console.error('mcp-whatsapp-handler error:', err)
      return NextResponse.json({ reply: '❌ Erro ao processar. Tente novamente.' })
    }

    const result = await handlerRes.json()
    return NextResponse.json({ reply: result.reply ?? result.message ?? '✅ Concluído.' })

  } catch (e: any) {
    console.error('dashboard mcp route error:', e.message)
    return NextResponse.json({ reply: '❌ Erro interno.' })
  }
}