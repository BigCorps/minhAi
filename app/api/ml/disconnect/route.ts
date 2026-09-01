import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { company_id } = await req.json()

  if (!company_id) {
    return NextResponse.json({ error: 'company_id obrigatório' }, { status: 400 })
  }

  // Busca o token para revogar no ML antes de deletar
  const { data: conn } = await supabase
    .from('ml_connections')
    .select('access_token')
    .eq('company_id', company_id)
    .single()

  // Tenta revogar no ML (best-effort — não bloqueia se falhar)
  if (conn?.access_token) {
    try {
      await fetch(
        `https://api.mercadolibre.com/users/me/applications/${process.env.ML_APP_ID}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${conn.access_token}` },
        }
      )
    } catch {
      // não crítico
    }
  }

  // Remove do banco
  const { error } = await supabase
    .from('ml_connections')
    .delete()
    .eq('company_id', company_id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}