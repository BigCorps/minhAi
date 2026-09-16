// supabase/functions/meta-webhook/index.ts
// Orquestrador leve: recebe POST do Meta, deduplica no debounce, chama meta-debounce-processor

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN')
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') ?? ''

// PHASE5_META_SIGNATURE — valida X-Hub-Signature-256 sobre o corpo bruto.
async function validateMetaSignature(rawBody: string, signatureHeader: string | null) {
  if (!META_APP_SECRET || !signatureHeader?.startsWith('sha256=')) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(META_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody),
  ))
  const expected = 'sha256=' + Array.from(signature).map((b) => b.toString(16).padStart(2, '0')).join('')
  if (expected.length !== signatureHeader.length) return false

  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i)
  }
  return diff === 0
}

serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  // GET: verificação do webhook
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode')
    const token     = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verificado')
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // POST: receber mensagens — retorno 200 imediato obrigatório
  if (req.method === 'POST') {
    const rawBody = await req.text()
    const signatureOk = await validateMetaSignature(rawBody, req.headers.get('x-hub-signature-256'))
    if (!signatureOk) {
      console.warn('🚫 Meta webhook com assinatura inválida ou META_APP_SECRET ausente')
      return new Response('Unauthorized', { status: 401 })
    }

    let body: any
    try { body = JSON.parse(rawBody) } catch { return new Response('Invalid JSON', { status: 400 }) }

    console.log(`\n${'='.repeat(50)}`)
    console.log(`📥 POST recebido - object: ${body.object}`)
    console.log(`   entries: ${body.entry?.length || 0}`)
    if (body.entry?.[0]) {
      const e = body.entry[0]
      const tipoVindo = e.messaging ? 'Messenger/IG' : (e.changes ? 'WhatsApp/Feed' : 'Desconhecido')
      console.log(`   Tipo de Payload Detectado: ${tipoVindo}`)
    }

    const response = new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    })

declare const EdgeRuntime: { waitUntil: (promise: Promise<any>) => void }

if (['page', 'instagram', 'whatsapp_business_account'].includes(body.object)) {
      EdgeRuntime.waitUntil(
        processWebhookData(body).catch((err) =>
          console.error('❌ Erro no processamento do webhook:', err.message)
        )
      )
    } else {
      console.log(`⚠️ body.object desconhecido: "${body.object}" — ignorado`)
    }

    return response
  }

  return new Response('Method not allowed', { status: 405 })
})

// ─── Rotear eventos ────────────────────────────────────────────────────────
async function processWebhookData(body: any) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  for (const entry of body.entry || []) {

    // ── Facebook / Instagram DMs ───────────────────────────────────────
    if (entry.messaging) {
      console.log(`📨 entry.messaging - object: ${body.object}, entry: ${entry.id}`)
      for (const event of entry.messaging) {
        console.log(`  event keys: ${Object.keys(event).join(', ')}`)
        if (event.message && !event.message.is_echo) {
          const platform    = body.object === 'instagram' ? 'instagram' : 'facebook'
          const messageText = event.message.text || '[Mídia]'
          const messageId   = event.message.mid
          const fromId      = event.sender.id
          const pageId      = entry.id

          await upsertDebounce(supabase, {
            conversation_id: fromId,
            page_id:         pageId,
            platform,
            message_text:    messageText,
            message_id:      messageId,
            sender_name:     undefined,
            media_id:        undefined,
          })
        }
      }
    }

    // ── WhatsApp mensagens + comentários FB/IG ─────────────────────────
    if (entry.changes) {
      console.log(`📨 entry.changes - object: ${body.object}, fields: ${entry.changes.map((c: any) => c.field).join(', ')}`)
      for (const change of entry.changes) {

        // WhatsApp mensagens
        if (change.field === 'messages' && body.object === 'whatsapp_business_account') {

          // ── Callback de status de entrega (sent/delivered/read/failed) ──
          // A Meta usa o mesmo field "messages" para isso. Sem esse log,
          // o código ignorava silenciosamente — não dava pra saber se
          // a mensagem foi entregue ou falhou (e por quê).
          if (change.value.statuses?.length) {
            for (const st of change.value.statuses) {
              console.log(`📊 Status de entrega WhatsApp: ${st.status} | wamid: ${st.id} | destinatário: ${st.recipient_id}`)
              if (st.status === 'failed' && st.errors?.length) {
                for (const e of st.errors) {
                  console.error(`❌ Falha na entrega — código: ${e.code} | título: ${e.title} | detalhe: ${e.error_data?.details || e.message || 'sem detalhe'}`)
                }
                // Janela fechada (131047) → reenviar automaticamente via template
                if (st.errors.some((e: any) => e.code === 131047)) {
                  retryViaTemplate(st.id).catch((err) =>
                    console.error('❌ Erro no retry automático via template:', err.message)
                  )
                }
              }
            }
          }

          const contacts: any[] = change.value.contacts || []
          const phoneNumberId   = change.value.metadata?.phone_number_id || entry.id

          for (const msg of change.value.messages || []) {

            // ACEITA TEXTO, BOTÕES E INTERAÇÕES (Essencial para reativação)
            if (['text', 'button', 'interactive'].includes(msg.type)) {
              const textContent = msg.text?.body ||
                                  msg.button?.text ||
                                  msg.interactive?.button_reply?.title ||
                                  msg.interactive?.list_reply?.title ||
                                  '[Interação]'

              // ✅ IGNORAR TEMPLATES ENVIADOS PELO SISTEMA
const isPixTemplate = textContent.includes('Valor: R$') && 
                       textContent.includes('Seu saldo foi atualizado')

const isSystemTemplate = textContent.includes('minhAi - Uma IA pra chamar de sua!')

const isTemplateButton = textContent.includes('Clique e continue recebendo avisos!')

if (isPixTemplate || isSystemTemplate || isTemplateButton) {
  console.log(`🚫 Template de sistema detectado - ignorando: "${textContent.substring(0, 50)}..."`)
  continue
}

              const contact    = contacts.find((c: any) => c.wa_id === msg.from)
              const senderName = msg._sender_name || contact?.profile?.name || undefined

              // ── MCP WhatsApp: verificar se sender é usuário minhAi ────────────
              const { data: mcpUser } = await supabase
                .from('user_profiles')
                .select('user_id, mcp_whatsapp_company_id')
                .eq('mcp_whatsapp', msg.from)
                .eq('mcp_whatsapp_enabled', true)
                .maybeSingle()

              if (mcpUser?.mcp_whatsapp_company_id) {
                console.log(`🤖 MCP WhatsApp: usuário identificado ${msg.from} → company ${mcpUser.mcp_whatsapp_company_id}`)
                // Buscar access_token da conexão WhatsApp desta empresa
                const { data: conn } = await supabase
                  .from('meta_connections')
                  .select('encrypted_page_access_token, user_access_token')
                  .eq('company_id', mcpUser.mcp_whatsapp_company_id)
                  .not('whatsapp_number_id', 'is', null)
                  .maybeSingle()

                const accessToken = conn?.user_access_token || conn?.encrypted_page_access_token || ''

                fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/mcp-whatsapp-handler`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from:           msg.from,
                    message_text:   textContent,
                    phone_number_id: phoneNumberId,
                    company_id:     mcpUser.mcp_whatsapp_company_id,
                    user_id:        mcpUser.user_id,
                    access_token:   accessToken,
                  }),
                }).catch(err => console.error('⚠️ MCP WA handler error:', err.message))
                continue // pular fluxo normal
              }
              // ── Fim MCP WhatsApp ──────────────────────────────────────────────

              // ✅ Verificar se há mensagens pendentes de saída para processar
              const { data: hasPending } = await supabase
                .from('whatsapp_pending_messages')
                .select('id')
                .eq('conversation_id', msg.from)
                .eq('whatsapp_number_id', phoneNumberId)
                .eq('status', 'pending')
                .limit(1)
                .maybeSingle()

              if (hasPending) {
                console.log(`📬 Mensagens pendentes detectadas para ${msg.from}. Processando fila...`)
                fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/processar-fila-whatsapp`, {
                  method: 'POST',
                  headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  },
                  body: JSON.stringify({
                    conversation_id:    msg.from,
                    whatsapp_number_id: phoneNumberId,
                  }),
                }).catch(err => console.error('⚠️ Erro ao processar fila:', err))
              }

              await upsertDebounce(supabase, {
                conversation_id: msg.from,
                page_id:         phoneNumberId,
                platform:        'whatsapp',
                message_text:    textContent,
                message_id:      msg.id,
                sender_name:     senderName,
                media_id:        undefined,
              })
            }

            // ── Áudio: entra no debounce com media_id ──────────────────
            if (msg.type === 'audio') {
              const mediaId = msg.audio?.id
              if (!mediaId) {
                console.warn('⚠️ Áudio sem media_id — ignorando')
                continue
              }

              const contact    = contacts.find((c: any) => c.wa_id === msg.from)
              const senderName = contact?.profile?.name || undefined

              await upsertDebounce(supabase, {
                conversation_id: msg.from,
                page_id:         phoneNumberId,
                platform:        'whatsapp',
                message_text:    null,
                message_id:      msg.id,
                sender_name:     senderName,
                media_id:        mediaId,
                mime_type:       msg.audio?.mime_type || 'audio/ogg',
              })
            }

            // ── Imagem: entra no debounce com media_id e mime_type ─────
            if (msg.type === 'image') {
              const mediaId  = msg.image?.id
              const mimeType = msg.image?.mime_type || 'image/jpeg'
              if (!mediaId) {
                console.warn('⚠️ Imagem sem media_id — ignorando')
                continue
              }

              const contact    = contacts.find((c: any) => c.wa_id === msg.from)
              const senderName = contact?.profile?.name || undefined

              console.log(`🖼️ Imagem recebida de ${msg.from} — mediaId: ${mediaId} | mime: ${mimeType}`)

              await upsertDebounce(supabase, {
                conversation_id: msg.from,
                page_id:         phoneNumberId,
                platform:        'whatsapp',
                message_text:    '[Imagem]',
                message_id:      msg.id,
                sender_name:     senderName,
                media_id:        mediaId,
                mime_type:       mimeType,
              })
            }

            // ── Documento (PDF etc): entra no debounce com media_id ────
            if (msg.type === 'document') {
              const mediaId  = msg.document?.id
              const mimeType = msg.document?.mime_type || 'application/octet-stream'
              if (!mediaId) {
                console.warn('⚠️ Documento sem media_id — ignorando')
                continue
              }

              const contact    = contacts.find((c: any) => c.wa_id === msg.from)
              const senderName = contact?.profile?.name || undefined

              console.log(`📄 Documento recebido de ${msg.from} — mediaId: ${mediaId} | mime: ${mimeType}`)

              await upsertDebounce(supabase, {
                conversation_id: msg.from,
                page_id:         phoneNumberId,
                platform:        'whatsapp',
                message_text:    '[Documento]',
                message_id:      msg.id,
                sender_name:     senderName,
                media_id:        mediaId,
                mime_type:       mimeType,
              })
            }
          }
        }

        // Facebook comentários
        if (change.field === 'feed' && change.value?.item === 'comment') {
          const v = change.value
          if (v.verb === 'add' && v.comment_id && v.from?.id !== entry.id) {
            await processComment({
              platform:     'facebook',
              page_id:      entry.id,
              comment_id:   v.comment_id,
              post_id:      v.post_id,
              from_id:      v.from?.id || '',
              from_name:    v.from?.name || '',
              comment_text: v.message || '',
            })
          }
        }

        // Instagram comentários
        if (change.field === 'comments' && change.value?.id) {
          const v = change.value
          if (v.from?.id !== entry.id) {
            await processComment({
              platform:     'instagram',
              page_id:      entry.id,
              comment_id:   v.id,
              post_id:      v.media?.id || '',
              from_id:      v.from?.id || '',
              from_name:    v.from?.username || '',
              comment_text: v.text || '',
            })
          }
        }
      }
    }
  }
}

// ─── Debounce: upsert atômico via RPC + disparar processor ───────────────
async function upsertDebounce(supabase: any, params: {
  conversation_id: string
  page_id:         string
  platform:        string
  message_text:    string | null
  message_id:      string
  sender_name?:    string
  media_id?:       string
  mime_type?:      string
}) {
  const scheduledAt = new Date(Date.now() + 4000).toISOString()

  const { error } = await supabase.rpc('upsert_message_debounce', {
    p_conversation_id: params.conversation_id,
    p_page_id:         params.page_id,
    p_platform:        params.platform,
    p_message_text:    params.message_text ?? null,
    p_message_id:      params.message_id,
    p_sender_name:     params.sender_name ?? null,
    p_media_id:        params.media_id ?? null,
    p_mime_type:       params.mime_type ?? null,
    p_scheduled_at:    scheduledAt,
  })

  if (error) {
    console.error('❌ Erro no upsert_message_debounce RPC:', error.message)
    return
  }

  console.log(`⏱️ Debounce registrado para ${params.conversation_id} [${params.platform}] — scheduled_at: ${scheduledAt}`)

  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-debounce-processor`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      conversation_id: params.conversation_id,
      page_id:         params.page_id,
    }),
  }).catch(err => console.error('⚠️ Erro ao disparar debounce-processor:', err))
}

// ─── Retry automático: janela fechada (131047) → reenviar via template ───
async function retryViaTemplate(wamid: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: retryCtx } = await supabase
    .from('whatsapp_notification_retry')
    .select('*')
    .eq('wamid', wamid)
    .eq('retried', false)
    .maybeSingle()

  if (!retryCtx) {
    console.log(`ℹ️ Nenhum contexto de retry encontrado para wamid: ${wamid} (provavelmente não é uma notificação nossa, ou já foi reenviada)`)
    return
  }

  console.log(`🔁 Disparando retry via template para company_id: ${retryCtx.company_id}`)

  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enviar-whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      company_id: retryCtx.company_id,
      pix_data: retryCtx.pix_data,
      message: retryCtx.message,
      force_template: true,
    }),
  })

  const result = await res.json()

  await supabase
    .from('whatsapp_notification_retry')
    .update({ retried: true, retried_at: new Date().toISOString() })
    .eq('wamid', wamid)

  if (res.ok) {
    console.log(`✅ Retry via template enviado com sucesso para wamid original: ${wamid}`, result)
  } else {
    console.error(`❌ Retry via template falhou para wamid original: ${wamid}`, result)
  }
}

// ─── Processar comentário (Facebook feed / Instagram comments) ────────────
async function processComment(data: {
  platform:     string
  page_id:      string
  comment_id:   string
  post_id:      string
  from_id:      string
  from_name:    string
  comment_text: string
}) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: existingComment } = await supabase
    .from('processed_comments')
    .select('id')
    .eq('comment_id', data.comment_id)
    .maybeSingle()
  if (existingComment) { console.log('🚫 Comentário já processado (banco)'); return }

  try {
    const { error: insertErr } = await supabase.from('processed_comments').insert({
      comment_id: data.comment_id, platform: data.platform, page_id: data.page_id,
    })
    if (insertErr) { console.log('🚫 Comentário já sendo processado (concurrent):', insertErr.code); return }
  } catch (e: any) { console.log('🚫 Erro ao registrar comentário:', e.message); return }

  console.log(`\n💬 [${data.platform}:comment] "${data.comment_text.substring(0, 60)}" de ${data.from_name}`)

  try {
    let connection: any = null
    if (data.platform === 'instagram') {
      const { data: c } = await supabase.from('meta_connections').select('*').eq('instagram_account_id', data.page_id).maybeSingle()
      connection = c
    } else {
      const { data: c } = await supabase.from('meta_connections').select('*').eq('meta_page_id', data.page_id).maybeSingle()
      connection = c
    }

    if (!connection)                  { console.error('❌ Conexão não encontrada para comentário'); return }
    if (!connection.agent_enabled)    { console.log('🚫 Agente desabilitado'); return }
    if (!connection.comments_enabled) { console.log('🚫 Resposta a comentários desabilitada'); return }

    const company = await getCompany(supabase, connection.company_id)
    if (!company) return

    if (connection.comments_mode === 'keyword') {
      const keywords: string[] = (connection.comments_keywords || '')
        .split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean)
      const commentLower = data.comment_text.toLowerCase()
      const hasKeyword = keywords.some((kw) => commentLower.includes(kw))
      if (!hasKeyword) { console.log('🔕 Comentário sem palavra-chave — ignorado'); return }
    }

    const { data: userCredits } = await supabase
      .from('user_credits').select('available_credits').eq('user_id', company.user_id).single()
    if (!userCredits || userCredits.available_credits < 1) { console.log('⚠️ Créditos insuficientes para comentário'); return }

    const replyText = connection.comments_reply_text
    if (replyText) {
      await replyToComment(data.comment_id, replyText, connection.encrypted_page_access_token, data.platform)
      console.log('💬 Reply público enviado')
    }

    if (replyText && connection.comments_dm_text) {
      await new Promise((r) => setTimeout(r, 1000))
    }

    const dmText = connection.comments_dm_text
    if (dmText && data.from_id) {
      await sendMetaMessage(data.from_id, dmText, connection.encrypted_page_access_token, data.platform)
      console.log('📨 DM automático enviado')
    }

    const { error: rpcErr } = await supabase.rpc('register_function_usage', {
      p_company_id: connection.company_id, p_function_key: 'meta_comment', p_credits_consumed: 1,
    })
    if (rpcErr) {
      await supabase.from('assistant_function_logs').insert({
        company_id: connection.company_id, user_id: company.user_id,
        function_key: 'meta_comment', credits_consumed: 1,
        metadata: {
          platform:           data.platform,
          comment_id:         data.comment_id,
          source:             'meta_webhook',
          user_input:         data.comment_text,
          assistant_response: [replyText, dmText].filter(Boolean).join(' | ') || '',
        },
      })
    }

    try {
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({ company_id: connection.company_id, status: 'completed', total_messages: 2 })
        .select('id').single()
      if (!convErr && conv) {
        await supabase.from('messages').insert([
          { conversation_id: conv.id, role: 'user',      content: `[Comentário ${data.platform}] ${data.comment_text}` },
          { conversation_id: conv.id, role: 'assistant', content: `Comentário e DM enviados com sucesso` },
        ])
      }
    } catch (histErr: any) {
      console.warn('⚠️ Erro histórico comentário (não crítico):', histErr.message)
    }

    console.log('✅ Comentário processado com sucesso')

  } catch (err: any) {
    console.error('❌ Erro processComment:', err.message)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function getCompany(supabase: any, companyId: string) {
  const { data } = await supabase.from('companies')
    .select('id, user_id, name, system_prompt')
    .eq('id', companyId).maybeSingle()
  return data
}

async function replyToComment(commentId: string, message: string, pageAccessToken: string, platform: string): Promise<void> {
  const endpoint = platform === 'instagram'
    ? `https://graph.facebook.com/v19.0/${commentId}/replies`
    : `https://graph.facebook.com/v19.0/${commentId}/comments`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pageAccessToken}` },
    body: JSON.stringify({ message }),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(`Meta Reply Error: ${d.error?.message || 'Unknown'}`)
  console.log(`✅ replyToComment [${platform}] ok`)
}

async function sendMetaMessage(
  recipientId: string,
  message: string,
  pageAccessToken: string,
  platform: string,
  phoneNumberId?: string,
  userAccessToken?: string,
): Promise<void> {
  if (!recipientId) { console.error('❌ sendMetaMessage: recipientId vazio!'); return }
  if (!message)     { console.error('❌ sendMetaMessage: message vazio!'); return }

  let url: string
  let payload: any
  let headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (platform === 'whatsapp') {
    const waMsgPhoneId = phoneNumberId || recipientId
    url = `https://graph.facebook.com/v19.0/${waMsgPhoneId}/messages`
    headers['Authorization'] = `Bearer ${userAccessToken || pageAccessToken}`
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientId,
      type: 'text',
      text: { preview_url: false, body: message },
    }
  } else {
    url = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`
    payload = {
      recipient: { id: recipientId },
      message: { text: message },
      messaging_type: 'RESPONSE',
    }
  }

  console.log(`📤 sendMetaMessage [${platform}] → ${recipientId}`)
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
  const d = await res.json()
  if (!res.ok) throw new Error(`Meta API Error: ${d.error?.message || JSON.stringify(d)}`)
  console.log(`✅ sendMetaMessage [${platform}] ok`)
}