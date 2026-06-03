import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase admin — não usa cookie/session, é chamada server-side por notificação do ML
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = JSON.parse(await req.text())

    // ML envia: { _id, resource, user_id, topic, application_id, attempts, sent, received }
    const { resource, user_id, topic, _id } = body

    // Retorna 200 imediatamente — ML exige resposta em menos de 500ms
    // O processamento acontece de forma assíncrona após o return
    const response = NextResponse.json({ ok: true }, { status: 200 })

    // Só processa perguntas
    if (topic !== 'questions' || !resource || !user_id) {
      return response
    }

    // Extrai question_id do resource — formato: /questions/123456789
    const questionId = resource.split('/').pop()
    if (!questionId) return response

    // Deduplicação — verifica se já processamos essa notificação
    const { data: existing } = await supabase
      .from('ml_questions')
      .select('id')
      .eq('ml_question_id', questionId)
      .maybeSingle()

    if (existing) return response

    // Busca company_id pelo seller_id
    const { data: conn } = await supabase
      .from('ml_connections')
      .select('company_id, ml_reply_enabled, ml_auto_reply, access_token, expires_at, refresh_token')
      .eq('seller_id', String(user_id))
      .eq('is_active', true)
      .maybeSingle()

    if (!conn || !conn.ml_reply_enabled) return response

    // Dispara edge de forma assíncrona — não aguarda resposta
    supabase.functions.invoke('ml-responder-pergunta', {
      body: {
        question_id: questionId,
        company_id: conn.company_id,
        ml_auto_reply: conn.ml_auto_reply,
      },
    }).catch(e => console.error('[ml/webhook] erro ao invocar edge:', e))

    return response

  } catch (e) {
    console.error('[ml/webhook] erro geral:', e)
    // Sempre retorna 200 para o ML não retentar indefinidamente
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}

// ML faz GET para validar a URL ao cadastrar
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 })
}