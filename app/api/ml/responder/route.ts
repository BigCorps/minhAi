import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { company_id, question_id, resposta } = await req.json()

  if (!company_id || !question_id || !resposta) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  // Busca token ML
  const { data: conn } = await supabase
    .from('ml_connections')
    .select('access_token, expires_at, refresh_token')
    .eq('company_id', company_id)
    .eq('is_active', true)
    .single()

  if (!conn) return NextResponse.json({ error: 'Conta ML não conectada' }, { status: 401 })

  // Posta resposta no ML
  const answerRes = await fetch('https://api.mercadolibre.com/answers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${conn.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question_id: Number(question_id),
      text: resposta,
    }),
  })

  if (!answerRes.ok) {
    const err = await answerRes.json()
    return NextResponse.json({ error: err.message ?? 'Erro ao postar resposta' }, { status: 422 })
  }

  // Atualiza status no banco
  await supabase
    .from('ml_questions')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('ml_question_id', String(question_id))
    .eq('company_id', company_id)

  return NextResponse.json({ ok: true })
}
