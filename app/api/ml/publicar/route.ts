import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const res = await supabase.functions.invoke('ml-publicar-produto', { body })

  if (res.error) {
    return NextResponse.json({ error: res.error.message ?? 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json(res.data)
}
