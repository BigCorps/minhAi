// supabase/functions/meta-debounce-processor/index.ts
// Mantém o debounce maduro da minhAi e seleciona o processador apenas no final:
// - empresas FuncionarIA -> funcionaria-meta-process
// - demais empresas      -> meta-webhook-process (comportamento atual intacto)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  const { conversation_id, page_id } = await req.json()

  if (!conversation_id || !page_id) {
    return new Response(JSON.stringify({ error: 'conversation_id e page_id obrigatórios' }), { status: 400 })
  }

  processDebounce(conversation_id, page_id).catch((err) =>
    console.error('❌ Erro no processDebounce:', err.message)
  )

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

async function processDebounce(conversation_id: string, page_id: string) {
  await new Promise((r) => setTimeout(r, 4000))

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  await new Promise((r) => setTimeout(r, 200))
  const claimTime = new Date().toISOString()

  const { data: claimed, error: claimErr } = await supabase
    .from('message_debounce')
    .update({ status: 'processing' })
    .eq('conversation_id', conversation_id)
    .eq('page_id', page_id)
    .eq('status', 'pending')
    .lte('scheduled_at', claimTime)
    .select()
    .maybeSingle()

  if (claimErr) {
    console.error('❌ Erro no claim atômico:', claimErr.message)
    return
  }

  if (!claimed) {
    console.log(`⏭️ Debounce descartado — timer resetado ou já processado [${conversation_id}]`)
    return
  }

  console.log(`✅ Claim obtido para conversa ${conversation_id} — ${(claimed.messages as any[]).length} mensagem(ns)`)

  try {
    const msgs = claimed.messages as string[]
    const textoFinal = msgs.filter(Boolean).join('\n').trim()

    if (!textoFinal && !claimed.media_id) {
      console.warn('⚠️ Lote vazio após concatenação — abortando')
      await marcarDone(supabase, conversation_id, page_id)
      return
    }

    const data = {
      platform:     claimed.platform,
      page_id:      claimed.page_id,
      from_id:      conversation_id,
      message_id:   claimed.last_message_id,
      message_text: textoFinal || '[AUDIO]',
      sender_name:  claimed.sender_name || undefined,
      media_id:     claimed.media_id || undefined,
      mime_type:    claimed.mime_type || undefined,
    }

    console.log(`🔀 Disparando processamento: "${data.message_text.substring(0, 80)}"`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const processor = await resolveProcessor(supabase, data.platform, data.page_id)

    console.log(`🧭 Processor selecionado: ${processor}`)

    const routerRes = await fetch(`${supabaseUrl}/functions/v1/${processor}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ data }),
    })

    if (!routerRes.ok) {
      console.error(`❌ ${processor} falhou:`, await routerRes.text())
    } else {
      console.log(`✅ ${processor} concluído com sucesso`)
    }

  } catch (err: any) {
    console.error('❌ Erro no processDebounce:', err.message)
  } finally {
    await marcarDone(supabase, conversation_id, page_id)
  }
}

async function resolveProcessor(supabase: any, platform: string, pageId: string): Promise<string> {
  try {
    let query = supabase.from('meta_connections').select('company_id')
    if (platform === 'whatsapp') query = query.eq('whatsapp_number_id', pageId)
    else if (platform === 'instagram') query = query.eq('instagram_account_id', pageId)
    else query = query.eq('meta_page_id', pageId)

    const { data: connection } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (!connection?.company_id) return 'meta-webhook-process'

    const { data: funcionaria } = await supabase
      .from('funcionaria_company_settings')
      .select('company_id')
      .eq('company_id', connection.company_id)
      .maybeSingle()

    return funcionaria ? 'funcionaria-meta-process' : 'meta-webhook-process'
  } catch (error: any) {
    console.warn('⚠️ resolveProcessor fallback:', error?.message || error)
    return 'meta-webhook-process'
  }
}

async function marcarDone(supabase: any, conversation_id: string, page_id: string) {
  await supabase
    .from('message_debounce')
    .update({ status: 'done' })
    .eq('conversation_id', conversation_id)
    .eq('page_id', page_id)
    .eq('status', 'processing')
}
