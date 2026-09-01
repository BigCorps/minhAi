import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase admin — chamada server-side pelas notificações do Mercado Livre.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = JSON.parse(await req.text())
    const { resource, user_id, topic } = body

    // O Mercado Livre exige resposta rápida; o processamento é disparado depois.
    const response = NextResponse.json({ ok: true }, { status: 200 })

    if (topic !== 'questions' || !resource || !user_id) return response

    const questionId = resource.split('/').pop()
    if (!questionId) return response

    const { data: existing } = await supabase
      .from('ml_questions')
      .select('id')
      .eq('ml_question_id', questionId)
      .maybeSingle()

    if (existing) return response

    const { data: conn } = await supabase
      .from('ml_connections')
      .select('company_id,ml_reply_enabled,ml_auto_reply')
      .eq('seller_id', String(user_id))
      .eq('is_active', true)
      .maybeSingle()

    if (!conn || !conn.ml_reply_enabled) return response

    // Só muda o processador quando a empresa realmente é FuncionarIA.
    const { data: funcionaria } = await supabase
      .from('funcionaria_company_settings')
      .select('company_id')
      .eq('company_id', conn.company_id)
      .maybeSingle()

    let edge = 'ml-responder-pergunta'

    if (funcionaria) {
      const { data: skill } = await supabase
        .from('funcionaria_company_skills')
        .select('skill_key')
        .eq('company_id', conn.company_id)
        .eq('skill_key', 'mercado_livre')
        .eq('status', 'active')
        .maybeSingle()

      if (!skill) return response
      edge = 'funcionaria-ml-responder-pergunta'
    }

    supabase.functions.invoke(edge, {
      body: {
        question_id: questionId,
        company_id: conn.company_id,
        ml_auto_reply: conn.ml_auto_reply,
      },
    }).catch(e => console.error(`[ml/webhook] erro ao invocar ${edge}:`, e))

    return response
  } catch (e) {
    console.error('[ml/webhook] erro geral:', e)
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 })
}
