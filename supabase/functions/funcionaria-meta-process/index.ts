// FuncionarIA — processador específico de WhatsApp, Instagram e Facebook.
// Mantém a infraestrutura Meta da minhAi, mas separa a política de créditos:
// FAQ/funções determinísticas são grátis; custos variáveis usam a carteira única.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

type Platform = 'whatsapp' | 'instagram' | 'facebook'

type Incoming = {
  platform: Platform
  page_id: string
  from_id: string
  message_id?: string
  message_text?: string
  sender_name?: string
  media_id?: string
  mime_type?: string
}

type UsageContext = {
  supabase: any
  companyId: string
  idempotencyKey: string
  source: string
}

const PAID_LOOKUP_KEYS = new Set([
  'consultar_cep', 'consultar_cnpj', 'consultar_cambio', 'consultar_cpf', 'consultar_placa',
  'restricoes_cpf', 'restricoes_cnpj', 'consultar_leilao', 'consultar_ddd', 'consultar_feriados',
  'clima_tempo', 'rastreio', 'traduzir_texto', 'ver_noticias', 'procurar_produto',
])

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: cors })

  try {
    const body = await req.json().catch(() => ({}))
    const data = body?.data as Incoming
    if (!data?.platform || !data?.page_id || !data?.from_id) {
      return Response.json({ error: 'invalid_payload' }, { status: 400, headers: cors })
    }

    const result = await processMessage(data)
    return Response.json(result, { headers: cors })
  } catch (error: any) {
    console.error('[funcionaria-meta-process]', error?.message || error)
    return Response.json({ error: 'internal_error' }, { status: 500, headers: cors })
  }
})

async function processMessage(data: Incoming) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const connection = await findConnection(supabase, data.platform, data.page_id)
  if (!connection?.company_id || connection.agent_enabled === false) return { handled: false, reason: 'connection_unavailable' }

  const [{ data: settings }, { data: company }, { data: entitlements }] = await Promise.all([
    supabase.from('funcionaria_company_settings').select('*').eq('company_id', connection.company_id).maybeSingle(),
    supabase.from('companies').select('*').eq('id', connection.company_id).maybeSingle(),
    supabase.rpc('funcionaria_active_entitlements', { p_company_id: connection.company_id }),
  ])

  if (!settings || !company) return { handled: false, reason: 'not_funcionaria' }

  const skillKeys: string[] = Array.isArray(entitlements?.skill_keys) ? entitlements.skill_keys : []
  const functionKeys: string[] = Array.isArray(entitlements?.function_keys) ? entitlements.function_keys : []

  if (!channelIsEntitled(data.platform, skillKeys)) {
    console.log(`[FuncionarIA Meta] canal sem entitlement: ${data.platform}`)
    return { handled: true, skipped: true, reason: 'channel_not_entitled' }
  }

  // Deduplicação própria antes de qualquer chamada cobrada.
  if (data.message_id) {
    const { data: existing } = await supabase.from('processed_webhook_messages').select('message_id').eq('message_id', data.message_id).maybeSingle()
    if (existing) return { handled: true, skipped: true, reason: 'duplicate' }
    const { error: dedupeError } = await supabase.from('processed_webhook_messages').insert({
      message_id: data.message_id,
      message_type: data.media_id ? 'media' : 'text',
    })
    if (dedupeError?.code === '23505') return { handled: true, skipped: true, reason: 'duplicate' }
  }

  const baseMessageId = data.message_id || crypto.randomUUID()
  let text = String(data.message_text || '').trim()

  // Áudio do WhatsApp/Meta: transcreve aqui para entrar na mesma política de créditos FuncionarIA.
  if (data.media_id && String(data.mime_type || '').startsWith('audio/')) {
    if (!settings.voice_input_enabled) {
      const sent = await sendMetaMessage(
        data.from_id,
        'Para continuar, envie sua mensagem por texto. O atendimento por voz não está ativado nesta FuncionarIA.',
        connection,
        data.platform,
        { supabase, companyId: connection.company_id, idempotencyKey: `wa:${baseMessageId}:voice-disabled`, source: 'voice_disabled' },
      )
      return { handled: true, source: 'voice_disabled', sent: sent.sent, reason: sent.reason }
    }

    const allowance = await checkUsage(supabase, connection.company_id, 'stt_minute', 1)
    if (!allowance?.ok) return { handled: true, skipped: true, reason: allowance?.reason || 'insufficient_credits', usage_key: 'stt_minute' }

    const transcription = await transcribeMetaAudio(data.media_id, connection)
    if (!transcription?.text) return { handled: true, skipped: true, reason: 'audio_not_understood' }

    const sttUnits = Math.max(1, Math.ceil(Number(transcription.durationSeconds || 1) / 60))
    const finalAllowance = sttUnits === 1 ? allowance : await checkUsage(supabase, connection.company_id, 'stt_minute', sttUnits)
    if (!finalAllowance?.ok) return { handled: true, skipped: true, reason: finalAllowance?.reason || 'insufficient_credits', usage_key: 'stt_minute' }

    const debit = await consumeUsage(supabase, connection.company_id, 'stt_minute', sttUnits, {
      source: 'funcionaria_meta_voice',
      channel: data.platform,
      idempotencyKey: `meta-stt:${baseMessageId}`,
      metadata: { mime_type: data.mime_type || null, media_id: data.media_id, duration_seconds: transcription.durationSeconds, actual_provider: 'OpenAI Whisper' },
    })
    if (!debit?.ok) return { handled: true, skipped: true, reason: debit?.reason || 'usage_debit_failed', usage_key: 'stt_minute' }
    text = transcription.text
    data.message_text = transcription.text
  }

  if (!text || text === '[AUDIO]') return { handled: true, skipped: true, reason: 'empty_message' }

  const control = await loadConversationControl(supabase, data)
  if (control?.is_paused && (!control.paused_until || new Date(control.paused_until).getTime() > Date.now())) {
    return { handled: true, skipped: true, reason: 'human_paused' }
  }

  if (matchesPauseKeyword(text, connection.pause_keywords) || matchesHumanRequest(text)) {
    await pauseConversation(supabase, connection.company_id, data)
    const notified = await notifyResponsible(supabase, connection.company_id, company, text, baseMessageId)
    const pauseMessage = notified
      ? 'Certo. Já avisei um responsável e pausei o atendimento automático para que ele possa continuar com você.'
      : (connection.pause_message || 'Certo. Vou pausar o atendimento automático para que um responsável continue com você.')
    const sent = await sendMetaMessage(data.from_id, pauseMessage, connection, data.platform, {
      supabase, companyId: connection.company_id, idempotencyKey: `wa:${baseMessageId}:pause`, source: 'human_pause',
    })
    if (!sent.sent) return { handled: true, skipped: true, reason: sent.reason }
    await saveHistory(supabase, connection.company_id, data, pauseMessage)
    return { handled: true, source: 'human_pause', responsible_notified: notified }
  }

  const rootUrl = `https://${company.slug}.funcionaria.net`
  const whatsappMode = String(settings.whatsapp_mode || 'hybrid')

  if (data.platform === 'whatsapp' && whatsappMode === 'redirect') {
    const last = control?.last_ai_response_at ? new Date(control.last_ai_response_at).getTime() : 0
    const alreadyRedirected = last > Date.now() - 24 * 60 * 60 * 1000
    if (alreadyRedirected) return { handled: true, skipped: true, reason: 'redirect_already_sent' }

    const responseText = `Olá! Sou a FuncionarIA da ${company.name}. 👋\n\nPara continuar seu atendimento com todos os recursos, acesse:\n${rootUrl}`
    const sent = await sendMetaMessage(data.from_id, responseText, connection, data.platform, {
      supabase, companyId: connection.company_id, idempotencyKey: `wa:${baseMessageId}:redirect`, source: 'whatsapp_redirect',
    })
    if (!sent.sent) return { handled: true, skipped: true, reason: sent.reason }
    await saveHistory(supabase, connection.company_id, data, responseText)
    await upsertConversationControl(supabase, connection.company_id, data)
    return { handled: true, source: 'whatsapp_redirect', platform_cost: true }
  }

  if (data.platform === 'whatsapp' && whatsappMode === 'hybrid') {
    const redirect = hybridRedirect(text, rootUrl, skillKeys)
    if (redirect) {
      const sent = await sendMetaMessage(data.from_id, redirect.text, connection, data.platform, {
        supabase, companyId: connection.company_id, idempotencyKey: `wa:${baseMessageId}:hybrid`, source: 'hybrid_redirect',
      })
      if (!sent.sent) return { handled: true, skipped: true, reason: sent.reason }
      await saveHistory(supabase, connection.company_id, data, redirect.text)
      await upsertConversationControl(supabase, connection.company_id, data)
      return { handled: true, source: 'hybrid_redirect', platform_cost: true, target: redirect.href }
    }
  }

  const aiAllowance = settings.ai_enabled ? await checkUsage(supabase, connection.company_id, 'ai_generation', 1) : null
  const effectiveConnection = buildEntitledConnection(connection, functionKeys, settings.ai_enabled === true && aiAllowance?.ok === true)

  const routerRes = await fetch(`${SUPABASE_URL}/functions/v1/meta-message-router`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: { ...data, message_text: text },
      connection: effectiveConnection,
      company,
      userId: company.user_id,
      companyId: connection.company_id,
    }),
  })

  if (!routerRes.ok) {
    console.warn('[FuncionarIA Meta] meta-message-router:', routerRes.status)
    return { handled: true, error: 'router_failed' }
  }

  const routeResult = await routerRes.json().catch(() => null)
  let response = routeResult?.responseText ?? null
  let source = String(routeResult?.functionKey || 'fallback')

  if (source === 'meta_reply') {
    const debit = await consumeUsage(supabase, connection.company_id, 'ai_generation', 1, {
      source: 'funcionaria_meta_ai',
      channel: data.platform,
      idempotencyKey: `meta-ai:${baseMessageId}`,
      metadata: { user_input: text, legacy_router: true, model: 'gpt-4o-mini' },
    })
    if (!debit?.ok) {
      response = `Não consegui usar a IA agora por falta de créditos de uso. Você pode continuar em ${rootUrl} ou pedir atendimento de um responsável.`
      source = 'ai_without_balance'
    }
  } else if (PAID_LOOKUP_KEYS.has(source)) {
    const debit = await consumeUsage(supabase, connection.company_id, 'paid_lookup', 1, {
      source: `funcionaria_meta_${source}`,
      channel: data.platform,
      idempotencyKey: `meta-lookup:${baseMessageId}:${source}`,
      metadata: { function_key: source },
    })
    if (!debit?.ok) {
      response = `Essa consulta usa um serviço externo e os créditos de uso estão insuficientes. Você pode pedir ajuda a um responsável.`
      source = 'paid_lookup_without_balance'
    }
  }

  if (!response) {
    response = settings.ai_enabled
      ? `Não encontrei uma resposta pronta para isso agora. Você pode continuar em ${rootUrl} ou pedir atendimento de um responsável.`
      : `Não encontrei essa informação nas respostas cadastradas. Você pode continuar em ${rootUrl} ou pedir atendimento de um responsável.`
    source = 'no_ai_fallback'
  }

  const messages = Array.isArray(response) ? response.filter(Boolean).map(String) : [String(response)]
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index]
    const sent = await sendMetaMessage(data.from_id, message, connection, data.platform, {
      supabase,
      companyId: connection.company_id,
      idempotencyKey: `wa:${baseMessageId}:reply:${index}`,
      source: `funcionaria_meta_${source}`,
    })
    if (!sent.sent) return { handled: true, skipped: true, reason: sent.reason, source }
  }

  await saveHistory(supabase, connection.company_id, data, messages.join('\n'))
  await upsertConversationControl(supabase, connection.company_id, data)

  return {
    handled: true,
    source,
    ai_used: source === 'meta_reply',
    platform_cost: data.platform === 'whatsapp',
    response_count: messages.length,
  }
}

async function findConnection(supabase: any, platform: Platform, pageId: string) {
  let query = supabase.from('meta_connections').select('*')
  if (platform === 'whatsapp') query = query.eq('whatsapp_number_id', pageId)
  else if (platform === 'instagram') query = query.eq('instagram_account_id', pageId)
  else query = query.eq('meta_page_id', pageId)
  const { data } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle()
  return data
}

function channelIsEntitled(platform: Platform, skillKeys: string[]) {
  return platform === 'whatsapp' ? skillKeys.includes('whatsapp_service') : skillKeys.includes('instagram_facebook')
}

function matchesPauseKeyword(message: string, keywords: unknown) {
  if (!Array.isArray(keywords)) return false
  const lower = message.toLowerCase()
  return keywords.some((k) => String(k || '').trim() && lower.includes(String(k).toLowerCase()))
}

function matchesHumanRequest(message: string) {
  const text = normalize(message)
  return [
    'chamar gerente', 'falar com gerente', 'quero o gerente', 'preciso do gerente',
    'atendimento humano', 'atendente humano', 'falar com humano', 'falar com responsavel',
    'quero falar com responsavel', 'preciso de um responsavel',
  ].some(term => text.includes(term))
}

async function notifyResponsible(supabase: any, companyId: string, company: any, reason: string, baseMessageId: string) {
  try {
    const [{ data: functionSettings }, { data: profile }] = await Promise.all([
      supabase.from('company_function_settings').select('config').eq('company_id', companyId).eq('function_key', 'chamar_gerente').maybeSingle(),
      supabase.from('company_profiles').select('nome,email,telefone').eq('company_id', companyId).eq('tipo', 'gerente').eq('is_active', true).limit(1).maybeSingle(),
    ])
    const config = functionSettings?.config || {}
    const managerName = profile?.nome || 'Responsável'
    const managerEmail = profile?.email || company?.email_contato || null
    const managerPhone = profile?.telefone || null
    const tasks: Promise<boolean>[] = []

    if (config.notificar_email !== false && managerEmail) {
      tasks.push(fetch(`${SUPABASE_URL}/functions/v1/enviar-email-google`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          to: managerEmail,
          subject: `🔔 Cliente aguardando — ${company?.name || 'FuncionarIA'}`,
          body: `Olá ${managerName},\n\nUm cliente solicitou atendimento humano pela FuncionarIA.\n\nMensagem: ${reason}\n\nPor favor, verifique o atendimento.`,
        }),
      }).then(r => r.ok).catch(() => false))
    }

    if (config.notificar_sms === true && managerPhone) {
      tasks.push(fetch(`${SUPABASE_URL}/functions/v1/send-sms-gerente`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          number: String(managerPhone).replace(/\D/g, ''),
          gerente_nome: managerName,
          motivo: reason,
          usage_idempotency_key: `funcionaria-meta-manager:${companyId}:${baseMessageId}`,
        }),
      }).then(r => r.ok).catch(() => false))
    }

    if (!tasks.length) return false
    const results = await Promise.all(tasks)
    return results.some(Boolean)
  } catch (error: any) {
    console.warn('[FuncionarIA Meta] responsável:', error?.message || error)
    return false
  }
}

async function loadConversationControl(supabase: any, data: Incoming) {
  const { data: control } = await supabase.from('conversation_ai_control')
    .select('*').eq('conversation_id', data.from_id).eq('page_id', data.page_id).maybeSingle()
  return control
}

async function pauseConversation(supabase: any, companyId: string, data: Incoming) {
  await supabase.from('conversation_ai_control').upsert({
    conversation_id: data.from_id,
    page_id: data.page_id,
    company_id: companyId,
    platform: data.platform,
    ai_enabled: false,
    is_paused: true,
    sender_name: data.sender_name || null,
    last_message_id: data.message_id || null,
    last_message_text: data.message_text || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'conversation_id,page_id' })
}

async function upsertConversationControl(supabase: any, companyId: string, data: Incoming) {
  await supabase.from('conversation_ai_control').upsert({
    conversation_id: data.from_id,
    page_id: data.page_id,
    company_id: companyId,
    platform: data.platform,
    ai_enabled: true,
    is_paused: false,
    sender_name: data.sender_name || null,
    last_message_id: data.message_id || null,
    last_message_text: data.message_text || null,
    last_ai_response_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'conversation_id,page_id' })
}

async function checkUsage(supabase: any, companyId: string, usageKey: string, units = 1) {
  const { data } = await supabase.rpc('funcionaria_check_usage', {
    p_company_id: companyId,
    p_usage_key: usageKey,
    p_units: units,
  })
  return data
}

async function consumeUsage(
  supabase: any,
  companyId: string,
  usageKey: string,
  units: number,
  input: { source: string; channel: string; idempotencyKey: string; metadata?: Record<string, unknown> },
) {
  const { data, error } = await supabase.rpc('funcionaria_consume_usage', {
    p_company_id: companyId,
    p_usage_key: usageKey,
    p_units: units,
    p_source: input.source,
    p_channel: input.channel,
    p_idempotency_key: input.idempotencyKey,
    p_metadata: input.metadata || {},
  })
  if (error) console.warn('[FuncionarIA Meta] consume usage:', error.message)
  return data
}

function buildEntitledConnection(connection: any, functionKeys: string[], aiAllowed: boolean) {
  const c = { ...connection }
  const featureFlags = [
    'faq_enabled','pix_enabled','prompt_enabled','contacts_enabled','nossa_marca_enabled','endereco_enabled','orcamento_enabled',
    'email_enabled','ver_agenda_enabled','agendar_enabled','attachment_processing_enabled','produto_lookup_enabled',
    'consultar_cep_enabled','consultar_cnpj_enabled','consultar_cambio_enabled','consultar_cpf_enabled','consultar_placa_enabled',
    'restricoes_cpf_enabled','restricoes_cnpj_enabled','consultar_leilao_enabled','consultar_ddd_enabled','consultar_feriados_enabled',
    'clima_tempo_enabled','traduzir_enabled','ver_noticias_enabled','rastreio_enabled','procurar_produto_enabled','segunda_via_enabled',
    'buscar_endereco_enabled','gerar_qrcode_enabled','gerar_codigo_barras_enabled','chamar_gerente_enabled','gerar_senha_enabled',
    'cadastro_enabled','ver_produtos_enabled','fazer_pedido_enabled','meu_cupom_enabled','transcrever_audio_enabled',
    'qrcode_whatsapp_enabled','qrcode_email_enabled','qrcode_facebook_enabled','qrcode_instagram_enabled','qrcode_twitter_enabled',
    'qrcode_tiktok_enabled','qrcode_linkedin_enabled','qrcode_website_enabled','qrcode_telefone_enabled','nosso_qrcode_enabled','wifi_qrcode_enabled',
    'ler_qrcode_enabled','ler_codigo_barras_enabled','tabela_em_texto_enabled','contrato_em_texto_enabled','imagem_em_texto_enabled',
    'identificar_fraude_enabled','meu_sistema_enabled','reagendar_compromisso_enabled','confirmar_presenca_enabled','cancelar_agendamento_enabled',
    'horarios_disponiveis_enabled','link_pagamento_enabled','criar_nota_enabled','criar_midia_enabled','cadastrar_produto_enabled','cardapio_enabled',
  ]
  for (const flag of featureFlags) c[flag] = false

  // Recepção básica: sempre disponível e sem crédito variável.
  c.faq_enabled = true
  c.contacts_enabled = true
  c.nossa_marca_enabled = true
  c.endereco_enabled = true
  c.chamar_gerente_enabled = false // Interceptado neste processador para aplicar política FuncionarIA/SMS.
  c.prompt_enabled = aiAllowed

  const has = (key: string) => functionKeys.includes(key)
  if (has('cadastro') || has('pre_atendimento')) c.cadastro_enabled = true
  if (has('gerar_senha') || has('fila_atendimento')) c.gerar_senha_enabled = true

  if (has('ver_agenda')) c.ver_agenda_enabled = true
  if (has('agendar_compromisso')) c.agendar_enabled = true
  if (has('reagendar_compromisso')) c.reagendar_compromisso_enabled = true
  if (has('cancelar_agendamento')) c.cancelar_agendamento_enabled = true
  if (has('confirmar_presenca')) c.confirmar_presenca_enabled = true
  if (has('horarios_disponiveis')) c.horarios_disponiveis_enabled = true

  if (has('ver_produtos')) { c.ver_produtos_enabled = true; c.produto_lookup_enabled = true }
  if (has('procurar_produto')) { c.procurar_produto_enabled = true; c.produto_lookup_enabled = true }
  if (has('fazer_pedido') || has('modo_venda')) c.fazer_pedido_enabled = true
  if (has('meu_cupom')) c.meu_cupom_enabled = true

  if (has('pix_generate')) c.pix_enabled = true
  if (has('link_pagamento')) c.link_pagamento_enabled = true

  // Consultas/serviços são ligados somente se a habilidade concedeu a função.
  for (const key of functionKeys) {
    const flag = `${key}_enabled`
    if (featureFlags.includes(flag)) c[flag] = true
  }

  return c
}

function hybridRedirect(message: string, rootUrl: string, skillKeys: string[]) {
  const t = normalize(message)
  const includesAny = (values: string[]) => values.some((v) => t.includes(v))

  if (skillKeys.includes('sales_orders') && includesAny(['quero comprar','fazer pedido','finalizar compra','abrir catalogo','ver catalogo','comprar agora'])) {
    return { href: `${rootUrl}/vendas`, text: `Claro! Para ver produtos e finalizar sua compra, continue aqui:\n${rootUrl}/vendas` }
  }
  if (skillKeys.includes('queue_service') && includesAny(['entrar na fila','retirar senha','tirar senha','pegar senha','fila de atendimento'])) {
    return { href: `${rootUrl}/fila`, text: `Você pode retirar e acompanhar sua senha aqui:\n${rootUrl}/fila` }
  }
  if (skillKeys.includes('schedule') && includesAny(['quero agendar','marcar horario','fazer agendamento','reservar horario','marcar consulta'])) {
    return { href: rootUrl, text: `Para concluir seu agendamento com todos os recursos da FuncionarIA, continue aqui:\n${rootUrl}` }
  }
  if (skillKeys.includes('checkout_payments') && includesAny(['quero pagar','fazer pagamento','pagar pedido','finalizar pagamento'])) {
    return { href: rootUrl, text: `Para continuar o pagamento com segurança, abra sua FuncionarIA:\n${rootUrl}` }
  }
  return null
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function sendMetaMessage(recipientId: string, message: string, connection: any, platform: Platform, usage: UsageContext) {
  if (!recipientId || !message) return { sent: false, reason: 'empty_outgoing_message' }
  let url = ''
  let payload: any
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (platform === 'whatsapp') {
    const allowance = await checkUsage(usage.supabase, usage.companyId, 'whatsapp_message', 1)
    if (!allowance?.ok) return { sent: false, reason: allowance?.reason || 'insufficient_credits' }

    url = `https://graph.facebook.com/v19.0/${connection.whatsapp_number_id}/messages`
    headers.Authorization = `Bearer ${connection.user_access_token || connection.encrypted_page_access_token}`
    payload = { messaging_product: 'whatsapp', recipient_type: 'individual', to: recipientId, type: 'text', text: { preview_url: true, body: message } }
  } else {
    url = `https://graph.facebook.com/v19.0/me/messages?access_token=${connection.encrypted_page_access_token}`
    payload = { recipient: { id: recipientId }, message: { text: message }, messaging_type: 'RESPONSE' }
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`meta_send_failed:${res.status}:${detail.slice(0,180)}`)
  }

  if (platform === 'whatsapp') {
    const debit = await consumeUsage(usage.supabase, usage.companyId, 'whatsapp_message', 1, {
      source: usage.source,
      channel: 'whatsapp',
      idempotencyKey: usage.idempotencyKey,
      metadata: { recipient_suffix: recipientId.slice(-4), message_length: message.length },
    })
    if (!debit?.ok) console.warn('[FuncionarIA Meta] WhatsApp enviado, mas débito não concluído:', debit)
  }

  return { sent: true }
}

async function transcribeMetaAudio(mediaId: string, connection: any): Promise<{ text: string; durationSeconds: number } | null> {
  const token = connection.user_access_token || connection.encrypted_page_access_token
  if (!token) return null
  const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!metaRes.ok) return null
  const media = await metaRes.json().catch(() => ({}))
  if (!media?.url) return null

  const audioRes = await fetch(media.url, { headers: { Authorization: `Bearer ${token}` } })
  if (!audioRes.ok) return null
  const blob = new Blob([await audioRes.arrayBuffer()], { type: media.mime_type || 'audio/ogg' })

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) return null
  const form = new FormData()
  form.append('file', blob, 'audio.ogg')
  form.append('model', 'whisper-1')
  form.append('language', 'pt')
  form.append('response_format', 'verbose_json')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  })
  if (!response.ok) return null
  const result = await response.json().catch(() => ({}))
  const text = String(result?.text || '').trim()
  if (!text) return null
  return { text, durationSeconds: Math.max(1, Number(result?.duration || 1)) }
}

async function saveHistory(supabase: any, companyId: string, data: Incoming, assistantResponse: string) {
  try {
    let { data: conversation } = await supabase.from('conversations')
      .select('id,total_messages').eq('company_id', companyId).eq('meta_from_id', data.from_id).eq('meta_page_id', data.page_id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (!conversation) {
      const created = await supabase.from('conversations').insert({
        company_id: companyId,
        status: 'active',
        total_messages: 0,
        meta_from_id: data.from_id,
        meta_page_id: data.page_id,
        meta_platform: data.platform,
      }).select('id,total_messages').single()
      conversation = created.data
    }

    if (!conversation?.id) return
    await supabase.from('messages').insert([
      { conversation_id: conversation.id, role: 'user', content: data.message_text || '[Mídia]' },
      { conversation_id: conversation.id, role: 'assistant', content: assistantResponse },
    ])
    await supabase.from('conversations').update({ total_messages: Number(conversation.total_messages || 0) + 2, updated_at: new Date().toISOString() }).eq('id', conversation.id)
  } catch (error: any) {
    console.warn('[FuncionarIA Meta] histórico não crítico:', error?.message || error)
  }
}
