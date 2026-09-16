// supabase/functions/meta-message-router/index.ts
// Contém todo o routeMessage() — delega para edges especializadas

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CREDITS = {
  faq:         1,
  pix:         1,
  prompt:      2,
  contacts:    1,
  nossa_marca: 1,
  endereco:    1,
  orcamento:   1,
  meu_sistema: 0,
  gerar_senha: 1,
  cadastrar_produto: 0,
  cardapio:    1, 
}

// PHASE5_FUNCIONARIA_AI_RESERVATION — cobrança antecipada somente quando
// a chamada veio do funcionaria-meta-process. O fluxo legado minhAi fica intacto.
async function reserveFuncionarIAAi(companyId: string, usageContext: any, scope: string) {
  if (usageContext?.mode !== 'funcionaria') return null
  const supabase = createClient(supabaseUrl, serviceKey)
  const messageId = String(usageContext?.messageId || crypto.randomUUID())
  const { data, error } = await supabase.rpc('funcionaria_consume_usage', {
    p_company_id: companyId,
    p_usage_key: 'ai_generation',
    p_units: 1,
    p_source: `funcionaria_meta_${scope}`.slice(0, 80),
    p_channel: String(usageContext?.channel || 'meta').slice(0, 40),
    p_idempotency_key: `meta-ai:${messageId}:${scope}`.slice(0, 180),
    p_metadata: { phase: '5', billing_mode: 'prepaid_reservation', scope },
  })
  if (error) return { ok: false, reason: 'usage_reservation_failed', detail: error.message }
  return data
}

async function refundFuncionarIAAi(reservation: any, reason: string, metadata: Record<string, unknown> = {}) {
  if (!reservation?.usage_event_id) return
  const supabase = createClient(supabaseUrl, serviceKey)
  const { error } = await supabase.rpc('funcionaria_refund_usage', {
    p_usage_event_id: reservation.usage_event_id,
    p_reason: reason,
    p_metadata: metadata,
  })
  if (error) console.warn('[meta-message-router] estorno FuncionarIA:', error.message)
}

function aiInsufficientResult(reservation: any) {
  return {
    responseText: 'Essa ação usa IA e os créditos de uso estão insuficientes. Você pode continuar pelo atendimento da empresa ou pedir ajuda a um responsável.',
    functionKey: 'ai_without_balance',
    creditsUsed: 0,
    billing: { ai_reserved: false, reason: reservation?.reason || 'usage_reservation_failed' },
  } as any
}

function withAiBilling(result: any, reservation: any, scope: string) {
  if (!reservation?.ok) return result
  return {
    ...result,
    billing: {
      ...(result?.billing || {}),
      ai_reserved: true,
      usage_event_id: reservation.usage_event_id,
      credits_consumed: reservation.credits_consumed ?? 0,
      scope,
    },
  }
}

// ── Respostas textuais para funções de boas-vindas no Meta ───────────────────
const STARTUP_FUNCTION_RESPONSES: Record<string, (company: any) => string> = {
  modo_venda: (company) =>
    `🛍️ *Bem-vindo à loja ${company.name}!*\n\nPosso te ajudar a encontrar produtos, ver preços e finalizar sua compra.\n\nO que você está procurando hoje?`,

  minha_conta: (_company) =>
    `👤 *Área do Cliente*\n\nPara acessar sua conta, histórico de compras e benefícios, me informe seu *e-mail* ou *CPF* cadastrado.`,

  agendar_compromisso: (company) =>
    `📅 *Agendamento — ${company.name}*\n\nPosso verificar horários disponíveis e fazer seu agendamento agora!\n\nQual serviço você deseja agendar e para qual data?`,

  ver_agenda: (company) =>
    `📅 *Agenda — ${company.name}*\n\nPosso consultar os horários disponíveis para você.\n\nQual serviço e data você prefere?`,

  nossa_marca: (company) => {
    const parts = [`🏢 *${company.name}*`]
    if (company.brand_description) parts.push(`\n${company.brand_description}`)
    if (company.business_hours) parts.push(`\n⏰ *Horários:* ${company.business_hours}`)
    if (company.business_address) parts.push(`\n📍 *Endereço:* ${company.business_address}`)
    if (company.whatsapp_number) parts.push(`\n📱 *WhatsApp:* ${company.whatsapp_number}`)
    parts.push(`\n\nComo posso ajudar você hoje?`)
    return parts.join('')
  },

  chatgpt: (company) =>
    `👋 *Olá! Sou o assistente da ${company.name}.*\n\nEstou aqui para responder suas dúvidas e te ajudar. O que você precisa?`,

  meu_sistema: (_company) =>
    `🤖 *minhAi — Uma IA para chamar de sua!*\n\nSou um assistente com Inteligência Artificial. Posso ajudar com produtos, pagamentos, agendamentos e muito mais.\n\nComo posso te ajudar?`,
}

serve(async (req) => {
  // PHASE5_SERVICE_ROLE_ONLY — worker interno: somente service_role.
  if (req.method !== 'OPTIONS') {
    const expectedServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const receivedAuthorization = req.headers.get('authorization') ?? ''
    if (!expectedServiceRole || receivedAuthorization !== `Bearer ${expectedServiceRole}`) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const body = await req.json()
    const { data, connection, company, userId, companyId, isStartupFunction, startupFunctionKey, usageContext } = body

    // ── Função de boas-vindas: resposta textual direta ────────────────────────
    if (isStartupFunction && startupFunctionKey) {
      console.log(`🚀 Startup function: ${startupFunctionKey}`)
      const responseFn = STARTUP_FUNCTION_RESPONSES[startupFunctionKey]
      if (responseFn) {
        const responseText = responseFn(company)
        return Response.json({ responseText, functionKey: startupFunctionKey, creditsUsed: 0 })
      }
      console.log(`⚠️ Startup function sem mapeamento: ${startupFunctionKey}`)
      return Response.json(null)
    }

    const result = await routeMessage(data, connection, company, userId, companyId, usageContext)
    return Response.json(result)
  } catch (err: any) {
    console.error('❌ meta-message-router erro:', err.message)
    return Response.json(null)
  }
})

async function routeMessage(
  data: any,
  connection: any,
  company: any,
  userId: string,
  companyId: string,
  usageContext: any = null,
): Promise<{ responseText: string | string[]; functionKey: string; creditsUsed: number } | null> {

  const supabase = createClient(supabaseUrl, serviceKey)
  const msg      = data.message_text.trim()
  const msgLower = msg.toLowerCase()

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 1: FLUXOS CONVERSACIONAIS COMPLEXOS (PRIORIDADE MÁXIMA)
  // ══════════════════════════════════════════════════════════════════════════

  // ── FLUXO DE VENDA ──────────────────────────────────────────────────────
  if (connection.fazer_pedido_enabled === true) {
    const flowResult = await tryVendasFlow(supabase, companyId, data, connection, company)
    if (flowResult) return flowResult
  }

  // ── ORÇAMENTO ─────────────────────────────────────────────────────────
  if (connection.orcamento_enabled && company.orcamento_prompt) {
    const flowResult = await tryOrcamentoFlow(supabase, companyId, data, connection, company, usageContext)
    if (flowResult) return flowResult
  }

  // ── AGENDA ────────────────────────────────────────────────────────────
  if (connection.agendar_enabled) {
    const agendaResult = await tryAgendaFlow(supabase, companyId, data, connection, company, usageContext)
    if (agendaResult) return agendaResult
  }

  // ── CRIAR NOTA ────────────────────────────────────────────────────────
  if (connection.criar_nota_enabled === true) {
    const notaResult = await tryNotaFlow(supabase, companyId, data, connection, company)
    if (notaResult) return notaResult
  }

  // ── IDENTIFICAR FRAUDE ────────────────────────────────────────────────
  if (connection.identificar_fraude_enabled === true) {
    const fraudeResult = await tryFraudeFlow(supabase, companyId, data, connection, company, usageContext)
    if (fraudeResult) return fraudeResult
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 2: FUNCIONALIDADES PONTUAIS (PAGAMENTOS, CONTATOS, INFO)
  // ══════════════════════════════════════════════════════════════════════════

  const TRIGGERS_CADASTRAR_PRODUTO = [
    'cadastrar produto', 'cadastrar produtos', 'novo produto',
    'adicionar produto', 'adicionar ao cardápio', 'adicionar ao cardapio',
    'registrar produto', 'criar produto', 'incluir produto',
    'quero cadastrar', 'preciso cadastrar',
  ];
 
  // Detecta trigger de início OU estado ativo de fluxo em andamento
  const temEstadoCadastro = await (async () => {
    const key = `cadastro_produto:${companyId}:${data.from_id}`;
    const { data: kv } = await supabase
      .from('message_debounce')
      .select('payload')
      .eq('key', key)
      .maybeSingle();
    return !!kv?.payload;
  })();
 
  const isTriggerCadastro = TRIGGERS_CADASTRAR_PRODUTO.some(t => msgLower.includes(t));
 
  if (
    (isTriggerCadastro || temEstadoCadastro) &&
    (connection.cadastrar_produto_enabled ?? true)
  ) {
    console.log('📦 Rota: Cadastrar Produto');
    const { data: result, error } = await supabase.functions.invoke('meta-cadastrar-produto', {
      body: {
        company_id: companyId,
        company,
        from_id:    data.from_id,
        mensagem:   msg,
      },
    });
    if (error) throw error;
    return {
      responseText: result.resposta,
      functionKey:  'cadastrar_produto',
      creditsUsed:  0,
    };
  }

  // ── PIX ───────────────────────────────────────────────────────────────
  if (connection.pix_enabled === true || connection.pix_enabled === 'true') {

    const confirmTriggers = ['paguei','confirmei','pago','confirmar','ja paguei','já paguei','efetuei','realizei','fiz o pix','fiz pix']
    const hasConfirmTrigger = confirmTriggers.some((t) => msgLower.includes(t))
    const codeMatch = msg.match(/\b(\d{4})\b/)
    const confirmCode = codeMatch ? codeMatch[1] : null

    if (hasConfirmTrigger || (confirmCode && msgLower.length <= 10)) {
      console.log('💰 Rota: PIX confirmar')
      const result = await handlePixConfirm(supabase, companyId, data.from_id, confirmCode, data.platform)
      return { responseText: result, functionKey: 'pix_confirm', creditsUsed: CREDITS.pix }
    }

    const pixTriggers = ['pix','gerar pix','criar pix','cobrar','cobrança','cobranca','pagamento pix','quero cobrar']
    const hasPix = pixTriggers.some((t) => msgLower.includes(t))
    const valueMatch = msg.match(/R?\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|brl)?/i)
    if (hasPix && valueMatch) {
      const amountBrl = parseFloat(valueMatch[1].replace(',', '.'))
      if (amountBrl > 0 && amountBrl <= 50000) {
        console.log(`💰 Rota: PIX gerar R$${amountBrl}`)
        const result = await handlePixGenerate(supabase, companyId, company, amountBrl * 100, data.platform)
        return { responseText: result, functionKey: 'pix_generate', creditsUsed: 0 }
      }
    }

    if (['meu pix','ver pix','pix pendente','qual meu pix','código pix','codigo pix'].some((t) => msgLower.includes(t))) {
      console.log('💰 Rota: PIX pendente')
      const result = await handlePixPending(supabase, companyId, data.from_id, data.platform)
      return { responseText: result, functionKey: 'pix_check', creditsUsed: 0 }
    }
  }

  // ── LINK DE PAGAMENTO ─────────────────────────────────────────────────
  if (connection.link_pagamento_enabled === true) {
    const linkTriggers = [
      'link de pagamento','gerar link','link pagamento','quero pagar',
      'link pra pagar','me manda o link','link infinitepay','cobrar por link'
    ]
    const valueMatch = msg.match(/R?\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|brl)?/i)

    if (linkTriggers.some(t => msgLower.includes(t)) && valueMatch) {
      console.log('🔗 Rota: Link de Pagamento')
      try {
        const amountBrl = parseFloat(valueMatch[1].replace(',', '.'))
        if (amountBrl > 0 && amountBrl <= 50000) {
          const amountCents     = Math.round(amountBrl * 100)
          const linkUrl         = `https://minhai.app/pay/${company.slug}/${amountCents}`
          const amountFormatted = amountBrl.toFixed(2).replace('.', ',')
          return {
            responseText: [
              `🔗 *Link de Pagamento — R$ ${amountFormatted}*`,
              ``,
              `${linkUrl}`,
              ``,
              `⏰ Link válido por 30 minutos`,
              `💳 Aceita cartão e PIX via InfinitePay`,
            ].join('\n'),
            functionKey: 'link_pagamento',
            creditsUsed: 1
          }
        }
      } catch (e: any) {
        return { responseText: `❌ Não foi possível gerar o link: ${e.message}`, functionKey: 'link_pagamento', creditsUsed: 0 }
      }
    }

    if (linkTriggers.some(t => msgLower.includes(t))) {
      return {
        responseText: `🔗 Para gerar o link de pagamento, informe o valor:\n\nEx: *Link de pagamento R$ 150*`,
        functionKey: 'link_pagamento',
        creditsUsed: 0
      }
    }
  }

  // ── GERAR SENHA ───────────────────────────────────────────────────────────
  if (connection.gerar_senha_enabled === true || connection.gerar_senha_enabled === 'true') {
    const senhaTriggers = [
      'gerar senha', 'pegar senha', 'quero senha', 'retirar senha',
      'senha da fila', 'entrar na fila', 'tirar senha', 'pegar ficha', 'senha'
    ]
    if (senhaTriggers.some((t) => msgLower.includes(t))) {
      console.log('🎟️ Rota: Gerar Senha')
      const result = await handleGerarSenha(supabase, companyId, company)
      return { responseText: result, functionKey: 'gerar_senha', creditsUsed: 1 }
    }
  }

  // ── CONTATOS ──────────────────────────────────────────────────────────
  if (connection.contacts_enabled === true || connection.contacts_enabled === 'true') {
    const contactResult = tryContactMatch(msgLower, company)
    if (contactResult) {
      return { responseText: contactResult.text, functionKey: contactResult.key, creditsUsed: CREDITS.contacts }
    }
  }

  // ── CARDÁPIO ──────────────────────────────────────────────────────────
if (connection.cardapio_enabled === true) {
  const cardapioTriggers = ['cardápio','cardapio','menu','o que vocês têm','o que voces tem','o que tem pra comer','ver cardápio','ver cardapio']
  if (cardapioTriggers.some((t) => msgLower.includes(t))) {
    console.log('🍽️ Rota: Cardápio')
    return { responseText: handleCardapio(company), functionKey: 'cardapio', creditsUsed: CREDITS.cardapio }
  }
}

  // ── NOSSA MARCA ───────────────────────────────────────────────────────
  if (connection.nossa_marca_enabled === true || connection.nossa_marca_enabled === 'true') {
    const marcaTriggers = ['nossa marca','sobre a empresa','quem somos','horário','horario','funcionamento','atendimento','história','historia','empresa','marca']
    if (marcaTriggers.some((t) => msgLower.includes(t))) {
      console.log('🏢 Rota: Nossa Marca')
      return { responseText: handleNossaMarca(company), functionKey: 'nossa_marca', creditsUsed: CREDITS.nossa_marca }
    }
  }

  // ── ENDEREÇO ──────────────────────────────────────────────────────────
  if (connection.endereco_enabled === true || connection.endereco_enabled === 'true') {
    const endTriggers = ['endereço','endereco','onde fica','onde vocês ficam','onde voces ficam','localização','localizacao','como chegar','onde estão','onde estao','local','lugar','mapa','google maps']
    if (endTriggers.some((t) => msgLower.includes(t))) {
      console.log('📍 Rota: Endereço')
      return { responseText: handleEndereco(company), functionKey: 'endereco', creditsUsed: CREDITS.endereco }
    }
  }

  // ── MEU SISTEMA ───────────────────────────────────────────────────────
  const sistemaTriggers = ['meu sistema','sobre o sistema','como funciona','o que é isso','o que é este sistema','que sistema é esse','informações do sistema','sobre eai','sobre e a i','eai','e.a.i']
  if (sistemaTriggers.some((t) => msgLower.includes(t))) {
    console.log('🤖 Rota: Meu Sistema')
    return { responseText: handleMeuSistema(), functionKey: 'meu_sistema', creditsUsed: CREDITS.meu_sistema }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 3: CONSULTAS E SERVIÇOS (EDGES ESPECIALIZADAS)
  // ══════════════════════════════════════════════════════════════════════════

  // ── CONSULTAS (meta-consultas) ─────────────────────────────────────────
  const hasConsultas = [
    connection.consultar_cep_enabled, connection.consultar_cnpj_enabled,
    connection.consultar_cambio_enabled, connection.consultar_cpf_enabled,
    connection.consultar_placa_enabled, connection.restricoes_cpf_enabled,
    connection.restricoes_cnpj_enabled, connection.consultar_leilao_enabled,
    connection.consultar_ddd_enabled, connection.consultar_feriados_enabled,
  ].some(v => v === true)

  if (hasConsultas) {
    const consultaResult = await tryEdge('meta-consultas', { msg, msgLower, connection, companyId, usageContext })
    if (consultaResult) return consultaResult
  }

  // ── SERVIÇOS (meta-servicos) ───────────────────────────────────────────
  const hasServicos = [
    connection.clima_tempo_enabled, connection.ver_noticias_enabled,
    connection.rastreio_enabled, connection.traduzir_enabled,
    connection.chamar_gerente_enabled, connection.gerar_qrcode_enabled,
  ].some(v => v === true)

  if (hasServicos) {
    const servicoResult = await tryEdge('meta-servicos', { msg, msgLower, connection, companyId, company, usageContext })
    if (servicoResult) return servicoResult
  }

  // ── AGENDA (meta-agenda) ───────────────────────────────────────────────
  const hasAgenda = [
    connection.ver_agenda_enabled, connection.agendar_enabled, connection.email_enabled,
  ].some(v => v === true)

  if (hasAgenda) {
    const agendaResult = await tryEdge('meta-agenda', { msg, msgLower, connection, companyId, company })
    if (agendaResult) return agendaResult
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 4: FAQ E FALLBACK (ÚLTIMA CAMADA)
  // ══════════════════════════════════════════════════════════════════════════

  // ── FAQ ───────────────────────────────────────────────────────────────
  if (connection.faq_enabled) {
    const faqResult = await tryFaqMatch(supabase, companyId, msg)
    if (faqResult) {
      console.log('📋 Rota: FAQ')
      return { responseText: faqResult.text, functionKey: 'faq', creditsUsed: CREDITS.faq }
    }
  }

  // ── FALLBACK: Prompt IA ───────────────────────────────────────────────
  if (connection.prompt_enabled === false) {
    console.log('🔕 Modo só-funções: mensagem sem intenção reconhecida ignorada')
    return null
  }

  console.log('🤖 Rota: Prompt IA (fallback)')
  const systemPrompt = connection.agent_prompt || company.system_prompt ||
    'Você é um assistente virtual prestativo. Responda de forma clara e objetiva.'
  const aiReservation = await reserveFuncionarIAAi(companyId, usageContext, 'fallback')
  if (aiReservation && !aiReservation.ok) return aiInsufficientResult(aiReservation)
  try {
    const aiResponse = await callOpenAI(systemPrompt, msg)
    return withAiBilling({ responseText: aiResponse, functionKey: 'meta_reply', creditsUsed: CREDITS.prompt }, aiReservation, 'fallback')
  } catch (error: any) {
    await refundFuncionarIAAi(aiReservation, 'openai_fallback_failed', { message: String(error?.message || error).slice(0, 160) })
    throw error
  }
}

// ══════════════════════════════════════════════════════════════════════════
// EDGE HELPER
// ══════════════════════════════════════════════════════════════════════════

async function tryEdge(edgeName: string, payload: any) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${supabaseUrl}/functions/v1/${edgeName}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`⚠️ ${edgeName} retornou ${res.status}`)
      return null
    }
    const result = await res.json()
    if (result) console.log(`✅ ${edgeName} tratou a mensagem: ${result.functionKey}`)
    return result
  } catch (err: any) {
    console.warn(`⚠️ ${edgeName} erro/timeout:`, err.message)
    return null
  }
}

// ══════════════════════════════════════════════════════════════════════════
// FLUXOS CONVERSACIONAIS
// ══════════════════════════════════════════════════════════════════════════

async function tryVendasFlow(
  supabase: any, companyId: string, data: any, connection: any, company: any,
): Promise<{ responseText: string | string[]; functionKey: string; creditsUsed: number } | null> {

  const msg    = data.message_text?.trim() ?? ''
  const lower  = msg.toLowerCase()
  const fromId = data.from_id
  const pageId = data.page_id ?? data.from_id

  console.log(`🛒 tryVendasFlow chamado — msg: "${msg.substring(0, 60)}"`)

  const { data: ctrl } = await supabase
    .from('conversation_ai_control')
    .select('meta_flow_state')
    .eq('conversation_id', fromId)
    .eq('page_id', pageId)
    .maybeSingle()

  const currentState = ctrl?.meta_flow_state ?? null
  if (currentState?.flow === 'orcamento') return null
  if (currentState?.flow === 'agenda')    return null
  if (currentState?.flow === 'nota')      return null
  if (currentState?.flow === 'fraude')    return null

  // Guard antecipado: mensagem claramente sobre nota não deve ativar vendas
  const NOTA_KEYWORDS = ['criar nota', 'cria nota', 'nova nota', 'anotar', 'anotação', 'anotacao', 'salvar nota']
  if (!currentState && NOTA_KEYWORDS.some(k => lower.includes(k))) return null

  const PEDIDO_TRIGGERS = [
    'quero comprar', 'quero pedir', 'quero um', 'quero uma', 'quero dois', 'quero duas',
    'me dá', 'me da', 'me manda', 'fazer pedido', 'pedir', 'comprar',
    'quero o', 'quero a', 'quero os', 'quero as',
    'quero pagar', 'pagar no pix', 'pagar com pix', 'pagar por pix',
    'quero o produto', 'quero a produto', 'me vende', 'vende',
  ]

  if (currentState) {
    console.log(`🛒 Fluxo ativo (etapa: ${currentState.etapa}) — processando sem checar trigger`)
  } else {
    const { data: produtos } = await supabase
      .from('produtos_venda')
      .select('nome')
      .eq('company_id', companyId)
      .eq('is_active', true)

    const nomeProdutoDetectado = (produtos ?? []).some((p: any) =>
      lower.includes(p.nome.toLowerCase()) ||
      p.nome.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3)
        .some((w: string) => lower.includes(w))
    )

    const hasTrigger = PEDIDO_TRIGGERS.some(t => lower.includes(t)) || nomeProdutoDetectado
    if (!hasTrigger) return null
    console.log(`🛒 Trigger detectado — chamando meta-flow-vendas`)
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(`${supabaseUrl}/functions/v1/meta-flow-vendas`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg, companyId, conversationId: fromId, pageId, platform: data.platform, state: currentState, connection }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) { console.warn('⚠️ meta-flow-vendas retornou', res.status); return null }

    const result = await res.json()
    if (!result) return null

    const { responseText, newState, functionKey, creditsUsed } = result

    await supabase.from('conversation_ai_control').upsert({
      conversation_id: fromId, page_id: pageId, company_id: companyId,
      platform: data.platform ?? 'whatsapp', ai_enabled: true, is_paused: false,
      meta_flow_state: newState, updated_at: new Date().toISOString(),
    }, { onConflict: 'conversation_id,page_id' })

    console.log(`🛒 meta-flow-vendas: etapa=${newState?.etapa ?? 'encerrado'}`)
    return { responseText, functionKey, creditsUsed, meta_flow_state: newState }

  } catch (err: any) {
    console.warn('⚠️ meta-flow-vendas erro/timeout:', err.message)
    return null
  }
}

async function tryOrcamentoFlow(
  supabase: any, companyId: string, data: any, connection: any, company: any, usageContext: any = null,
): Promise<{ responseText: string | string[]; functionKey: string; creditsUsed: number } | null> {

  const msg    = data.message_text?.trim() ?? ''
  const lower  = msg.toLowerCase()
  const fromId = data.from_id
  const pageId = data.page_id ?? data.from_id

  const { data: ctrl } = await supabase
    .from('conversation_ai_control')
    .select('meta_flow_state')
    .eq('conversation_id', fromId)
    .eq('page_id', pageId)
    .maybeSingle()

  const currentState = ctrl?.meta_flow_state ?? null
  if (currentState?.flow === 'pedido')  return null
  if (currentState?.flow === 'agenda')  return null
  if (currentState?.flow === 'nota')    return null
  if (currentState?.flow === 'fraude')  return null

  const ORCAMENTO_TRIGGERS = [
    'orçamento', 'orcamento', 'fazer orçamento', 'quanto custa', 'quanto fica',
    'preço', 'preco', 'valor', 'cotação', 'cotacao', 'preciso de um orçamento',
    'me passa um orçamento', 'quero um orçamento', 'solicitar orçamento',
  ]

  if (currentState?.flow === 'orcamento') {
    console.log(`📋 Fluxo orçamento ativo (etapa: ${currentState.etapa}) — processando`)
  } else {
    const hasTrigger  = ORCAMENTO_TRIGGERS.some(t => lower.includes(t))
    const CORRECAO_TRIGGERS = [
      'corrigir', 'corrige', 'alterar', 'altera', 'mudar', 'muda',
      'adicionar', 'adiciona', 'incluir', 'inclui', 'remover', 'remove',
      'na verdade eram', 'na verdade era', 'esqueci', 'faltou', 'errei',
      'novo pdf', 'gerar novo', 'refazer', 'atualizar orçamento',
    ]
    const hasCorrecao = CORRECAO_TRIGGERS.some(t => lower.includes(t))

    if (!hasTrigger && !hasCorrecao) return null

    if (hasCorrecao && !hasTrigger) {
      const { data: ultimoDownload } = await supabase
        .from('companion_downloads')
        .select('token, created_at')
        .eq('company_id', companyId)
        .like('file_name', 'orcamento-%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const recente = ultimoDownload &&
        (Date.now() - new Date(ultimoDownload.created_at).getTime()) < 30 * 60 * 1000

      if (!recente) return null
      console.log(`📋 Correção de orçamento recente detectada — reativando fluxo`)
    } else {
      console.log(`📋 Trigger orçamento detectado — chamando meta-flow-orcamento`)
    }
  }

  const shouldReserveAi = usageContext?.mode === 'funcionaria' &&
    (!currentState || currentState?.flow !== 'orcamento' || currentState?.etapa === 'coletando')
  let aiReservation = shouldReserveAi ? await reserveFuncionarIAAi(companyId, usageContext, 'orcamento') : null
  if (aiReservation && !aiReservation.ok) return aiInsufficientResult(aiReservation)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(`${supabaseUrl}/functions/v1/meta-flow-orcamento`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg, companyId, state: currentState, company }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) { console.warn('⚠️ meta-flow-orcamento retornou', res.status); await refundFuncionarIAAi(aiReservation, 'meta_flow_orcamento_http_error', { status: res.status }); return null }

    const result = await res.json()
    if (!result) { await refundFuncionarIAAi(aiReservation, 'meta_flow_orcamento_empty'); return null }

    const { responseText, newState, functionKey, creditsUsed } = result
    if (aiReservation?.ok && Number(creditsUsed || 0) <= 0) {
      await refundFuncionarIAAi(aiReservation, 'meta_flow_orcamento_no_ai_usage')
      aiReservation = null
    }

    await supabase.from('conversation_ai_control').upsert({
      conversation_id: fromId, page_id: pageId, company_id: companyId,
      platform: data.platform ?? 'whatsapp', ai_enabled: true, is_paused: false,
      meta_flow_state: newState, updated_at: new Date().toISOString(),
    }, { onConflict: 'conversation_id,page_id' })

    console.log(`📋 meta-flow-orcamento: etapa=${newState?.etapa ?? 'encerrado'}`)
    return withAiBilling({ responseText, functionKey, creditsUsed, meta_flow_state: newState }, aiReservation, 'orcamento') as any

  } catch (err: any) {
    await refundFuncionarIAAi(aiReservation, 'meta_flow_orcamento_exception', { message: String(err?.message || err).slice(0, 160) })
    console.warn('⚠️ meta-flow-orcamento erro/timeout:', err.message)
    return null
  }
}

async function tryAgendaFlow(
  supabase: any, companyId: string, data: any, connection: any, company: any, usageContext: any = null,
): Promise<{ responseText: string | string[]; functionKey: string; creditsUsed: number } | null> {

  const msg    = data.message_text?.trim() ?? ''
  const lower  = msg.toLowerCase()
  const fromId = data.from_id
  const pageId = data.page_id ?? data.from_id

  const { data: ctrl } = await supabase
    .from('conversation_ai_control')
    .select('meta_flow_state')
    .eq('conversation_id', fromId)
    .eq('page_id', pageId)
    .maybeSingle()

  const currentState = ctrl?.meta_flow_state ?? null
  if (currentState?.flow === 'pedido')    return null
  if (currentState?.flow === 'orcamento') return null
  if (currentState?.flow === 'nota')      return null
  if (currentState?.flow === 'fraude')    return null

  const AGENDA_TRIGGERS = [
    'agendar', 'agendamento', 'marcar horário', 'marcar horario',
    'marcar consulta', 'quero agendar', 'preciso agendar',
    'reservar horário', 'reservar horario', 'fazer agendamento',
    'marcar um horário', 'marcar um horario', 'quero marcar',
    'tem horário', 'tem horario', 'horário disponível', 'horario disponivel',
    'disponibilidade', 'agenda', 'consulta', 'sessão', 'sessao',
  ]

  if (currentState?.flow === 'agenda') {
    console.log(`📅 Fluxo agenda ativo (etapa: ${currentState.etapa}) — processando`)
  } else {
    const hasTrigger = AGENDA_TRIGGERS.some(t => lower.includes(t))
    if (!hasTrigger) return null
    console.log(`📅 Trigger agenda detectado — chamando meta-flow-agenda`)
  }

  const shouldReserveAi = usageContext?.mode === 'funcionaria' &&
    (!currentState || currentState?.flow !== 'agenda' || currentState?.etapa === 'coletando')
  let aiReservation = shouldReserveAi ? await reserveFuncionarIAAi(companyId, usageContext, 'agenda') : null
  if (aiReservation && !aiReservation.ok) return aiInsufficientResult(aiReservation)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(`${supabaseUrl}/functions/v1/meta-flow-agenda`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg, companyId, state: currentState, company }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) { console.warn('⚠️ meta-flow-agenda retornou', res.status); await refundFuncionarIAAi(aiReservation, 'meta_flow_agenda_http_error', { status: res.status }); return null }

    const result = await res.json()
    if (!result) { await refundFuncionarIAAi(aiReservation, 'meta_flow_agenda_empty'); return null }

    const { responseText, newState, functionKey, creditsUsed } = result
    if (aiReservation?.ok && Number(creditsUsed || 0) <= 0) {
      await refundFuncionarIAAi(aiReservation, 'meta_flow_agenda_no_ai_usage')
      aiReservation = null
    }

    await supabase.from('conversation_ai_control').upsert({
      conversation_id: fromId, page_id: pageId, company_id: companyId,
      platform: data.platform ?? 'whatsapp', ai_enabled: true, is_paused: false,
      meta_flow_state: newState, updated_at: new Date().toISOString(),
    }, { onConflict: 'conversation_id,page_id' })

    console.log(`📅 meta-flow-agenda: etapa=${newState?.etapa ?? 'encerrado'}`)
    return withAiBilling({ responseText, functionKey, creditsUsed, meta_flow_state: newState }, aiReservation, 'agenda') as any

  } catch (err: any) {
    await refundFuncionarIAAi(aiReservation, 'meta_flow_agenda_exception', { message: String(err?.message || err).slice(0, 160) })
    console.warn('⚠️ meta-flow-agenda erro/timeout:', err.message)
    return null
  }
}

async function tryNotaFlow(
  supabase: any, companyId: string, data: any, connection: any, company: any,
): Promise<{ responseText: string | string[]; functionKey: string; creditsUsed: number } | null> {

  const msg    = data.message_text?.trim() ?? ''
  const lower  = msg.toLowerCase()
  const fromId = data.from_id
  const pageId = data.page_id ?? data.from_id

  const { data: ctrl } = await supabase
    .from('conversation_ai_control')
    .select('meta_flow_state')
    .eq('conversation_id', fromId)
    .eq('page_id', pageId)
    .maybeSingle()

  const currentState = ctrl?.meta_flow_state ?? null
  if (currentState?.flow === 'pedido')    return null
  if (currentState?.flow === 'orcamento') return null
  if (currentState?.flow === 'agenda')    return null
  if (currentState?.flow === 'fraude')    return null

  const NOTA_TRIGGERS = [
    'criar nota', 'cria nota', 'cria uma nota', 'criar uma nota',
    'nova nota', 'fazer uma nota', 'faz uma nota',
    'anotar', 'fazer anotação', 'fazer anotacao',
    'faça uma anotação', 'faz uma anotação', 'faz anotação',
    'salvar nota', 'escrever nota', 'escreve uma nota',
    'quero anotar', 'quero criar uma nota', 'preciso anotar',
  ]

  const CANCEL_TRIGGERS = ['cancelar', 'cancela', 'desistir', 'não quero', 'nao quero', 'sair']

  // ── Flow ativo: etapa aguardando_conteudo ──────────────────────────────
  if (currentState?.flow === 'nota' && currentState?.etapa === 'aguardando_conteudo') {

    if (CANCEL_TRIGGERS.some(t => lower.includes(t))) {
      await supabase.from('conversation_ai_control').upsert({
        conversation_id: fromId, page_id: pageId, company_id: companyId,
        platform: data.platform ?? 'whatsapp', ai_enabled: true, is_paused: false,
        meta_flow_state: null, updated_at: new Date().toISOString(),
      }, { onConflict: 'conversation_id,page_id' })
      return { responseText: '❌ Criação de nota cancelada.', functionKey: 'criar_nota', creditsUsed: 0 }
    }

    if (!msg || msg.length < 2) {
      return { responseText: 'Digite o conteúdo da nota para salvar.', functionKey: 'criar_nota', creditsUsed: 0 }
    }

    try {
      const { error } = await supabase.from('notas').insert({ company_id: companyId, titulo: null, conteudo: msg })
      if (error) throw error
    } catch (e: any) {
      return { responseText: `❌ Não foi possível salvar a nota: ${e.message}`, functionKey: 'criar_nota', creditsUsed: 0 }
    }

    await supabase.from('conversation_ai_control').upsert({
      conversation_id: fromId, page_id: pageId, company_id: companyId,
      platform: data.platform ?? 'whatsapp', ai_enabled: true, is_paused: false,
      meta_flow_state: null, updated_at: new Date().toISOString(),
    }, { onConflict: 'conversation_id,page_id' })

    return {
      responseText: [`📝 *Nota salva!*`, ``, `📋 ${msg.length > 120 ? msg.slice(0, 117) + '...' : msg}`, ``, `_Para criar outra nota, é só me avisar._`].join('\n'),
      functionKey: 'criar_nota',
      creditsUsed: 1,
    }
  }

  // ── Sem flow ativo: verificar trigger ─────────────────────────────────
  const hasTrigger = NOTA_TRIGGERS.some(t => lower.includes(t))
  if (!hasTrigger) return null

  const conteudoExtraido = msg
    .replace(/criar?\s*(uma\s*)?nota|cria\s*(uma\s*)?nota|nova\s*nota|fazer?\s*(uma\s*)?nota|faz\s*(uma\s*)?nota|anotar|fazer?\s*anotação|fazer?\s*anotacao|faça\s*uma\s*anotação|faz\s*(uma\s*)?anotação|salvar\s*nota|escrever?\s*nota|quero\s*anotar|quero\s*criar\s*uma\s*nota|preciso\s*anotar/gi, '')
    .replace(/^(sobre|de|:|,)\s*/i, '')
    .trim()

  // Modo express: tem conteúdo na mesma mensagem → salvar direto
  if (conteudoExtraido && conteudoExtraido.length >= 3) {
    try {
      const { error } = await supabase.from('notas').insert({ company_id: companyId, titulo: null, conteudo: conteudoExtraido })
      if (error) throw error
    } catch (e: any) {
      return { responseText: `❌ Não foi possível salvar a nota: ${e.message}`, functionKey: 'criar_nota', creditsUsed: 0 }
    }
    return {
      responseText: [`📝 *Nota salva!*`, ``, `📋 ${conteudoExtraido}`, ``, `_Para criar outra nota, é só me avisar._`].join('\n'),
      functionKey: 'criar_nota',
      creditsUsed: 1,
    }
  }

  // Modo conversacional: sem conteúdo → pedir e salvar estado
  await supabase.from('conversation_ai_control').upsert({
    conversation_id: fromId, page_id: pageId, company_id: companyId,
    platform: data.platform ?? 'whatsapp', ai_enabled: true, is_paused: false,
    meta_flow_state: { flow: 'nota', etapa: 'aguardando_conteudo' },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'conversation_id,page_id' })

  return {
    responseText: [`📝 *Criar Nota*`, ``, `Digite o conteúdo da nota que deseja salvar:`, ``, `_Ou envie *cancelar* para desistir._`].join('\n'),
    functionKey: 'criar_nota',
    creditsUsed: 0,
  }
}

async function tryFraudeFlow(
  supabase: any, companyId: string, data: any, connection: any, company: any, usageContext: any = null,
): Promise<{ responseText: string | string[]; functionKey: string; creditsUsed: number } | null> {

  const msg    = data.message_text?.trim() ?? ''
  const lower  = msg.toLowerCase()
  const fromId = data.from_id
  const pageId = data.page_id ?? data.from_id

  const { data: ctrl } = await supabase
    .from('conversation_ai_control')
    .select('meta_flow_state')
    .eq('conversation_id', fromId)
    .eq('page_id', pageId)
    .maybeSingle()

  const currentState = ctrl?.meta_flow_state ?? null
  if (currentState?.flow === 'pedido')    return null
  if (currentState?.flow === 'orcamento') return null
  if (currentState?.flow === 'agenda')    return null
  if (currentState?.flow === 'nota')      return null

  const FRAUDE_TRIGGERS = [
    'fraude', 'golpe', 'suspeito', 'verificar boleto', 'checar boleto',
    'boleto falso', 'site falso', 'phishing', 'verificar link', 'checar link',
    'link suspeito', 'site suspeito', 'identificar fraude', 'analisar fraude',
    'verificar fraude', 'esse boleto', 'esse link', 'essa cobrança',
    'é golpe', 'e golpe', 'é fraude', 'e fraude', 'é verdadeiro', 'e verdadeiro',
    'é confiável', 'e confiavel', 'posso pagar', 'devo pagar',
  ]

  const hasActiveFlow = currentState?.flow === 'fraude'

  if (!hasActiveFlow) {
    const hasTrigger = FRAUDE_TRIGGERS.some(t => lower.includes(t))
    if (!hasTrigger) return null
  }

  console.log(`🔍 tryFraudeFlow — ativando | hasActiveFlow: ${hasActiveFlow}`)

  const fraudeDigits = msg.replace(/[\s.\-]/g, '')
  const hasFraudePayload = !!data.media_id || /^\d{47,48}$/.test(fraudeDigits) ||
    !!msg.match(/https?:\/\/[^\s]+/i) || !!msg.match(/[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*/i)
  let aiReservation = usageContext?.mode === 'funcionaria' && hasFraudePayload
    ? await reserveFuncionarIAAi(companyId, usageContext, 'fraude')
    : null
  if (aiReservation && !aiReservation.ok) return aiInsufficientResult(aiReservation)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 35000)

    const res = await fetch(`${supabaseUrl}/functions/v1/meta-flow-fraude`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg,
        companyId,
        state:     currentState,
        mediaId:   data.media_id  ?? null,
        mimeType:  data.mime_type ?? null,
        authToken: connection.user_access_token || connection.encrypted_page_access_token,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) { console.warn('⚠️ meta-flow-fraude retornou', res.status); await refundFuncionarIAAi(aiReservation, 'meta_flow_fraude_http_error', { status: res.status }); return null }

    const result = await res.json()
    if (!result) { await refundFuncionarIAAi(aiReservation, 'meta_flow_fraude_empty'); return null }

    const { responseText, newState, functionKey, creditsUsed } = result
    if (aiReservation?.ok && Number(creditsUsed || 0) <= 0) {
      await refundFuncionarIAAi(aiReservation, 'meta_flow_fraude_no_ai_usage')
      aiReservation = null
    }

    await supabase.from('conversation_ai_control').upsert({
      conversation_id: fromId, page_id: pageId, company_id: companyId,
      platform: data.platform ?? 'whatsapp', ai_enabled: true, is_paused: false,
      meta_flow_state: newState, updated_at: new Date().toISOString(),
    }, { onConflict: 'conversation_id,page_id' })

    console.log(`🔍 meta-flow-fraude: etapa=${newState?.etapa ?? 'encerrado'}`)
    return withAiBilling({ responseText, functionKey, creditsUsed, meta_flow_state: newState }, aiReservation, 'fraude') as any

  } catch (err: any) {
    await refundFuncionarIAAi(aiReservation, 'meta_flow_fraude_exception', { message: String(err?.message || err).slice(0, 160) })
    console.warn('⚠️ meta-flow-fraude erro/timeout:', err.message)
    return null
  }
}

// ══════════════════════════════════════════════════════════════════════════
// HANDLERS PONTUAIS
// ══════════════════════════════════════════════════════════════════════════

function tryContactMatch(msgLower: string, company: any): { text: string; key: string } | null {
  const keyMap: Record<string, string> = {
    whatsapp_number: 'qrcode_whatsapp', instagram_username: 'qrcode_instagram',
    facebook: 'qrcode_facebook', email_contato: 'qrcode_email',
    website: 'qrcode_website', telefone_fixo: 'qrcode_telefone',
    linkedin: 'qrcode_linkedin', tiktok: 'qrcode_tiktok', twitter: 'qrcode_twitter',
  }
  const checks = [
    { triggers: ['whatsapp','whats','zap','wpp'],                    field: 'whatsapp_number',    label: 'WhatsApp',  prefix: 'https://wa.me/' },
    { triggers: ['instagram','insta','arroba'],                       field: 'instagram_username', label: 'Instagram', prefix: 'https://instagram.com/' },
    { triggers: ['facebook','face','fb'],                             field: 'facebook',           label: 'Facebook',  prefix: '' },
    { triggers: ['email','e-mail','correio'],                         field: 'email_contato',      label: 'E-mail',    prefix: 'mailto:' },
    { triggers: ['site','website','página','pagina','url'],           field: 'website',            label: 'Site',      prefix: '' },
    { triggers: ['telefone','fixo','ligar','número','numero','fone'], field: 'telefone_fixo',      label: 'Telefone',  prefix: 'tel:' },
    { triggers: ['linkedin','linked'],                                field: 'linkedin',           label: 'LinkedIn',  prefix: '' },
    { triggers: ['tiktok','tik tok'],                                 field: 'tiktok',             label: 'TikTok',    prefix: '' },
    { triggers: ['twitter','x'],                                      field: 'twitter',            label: 'Twitter/X', prefix: '' },
  ]
  for (const c of checks) {
    if (c.triggers.some((t) => msgLower.includes(t))) {
      const value = company[c.field]
      if (!value) continue
      const link = c.field === 'whatsapp_number'    ? `${c.prefix}${value.replace(/\D/g, '')}`
                 : c.field === 'instagram_username' ? `${c.prefix}${value.replace('@', '')}`
                 : c.field === 'tiktok'             ? `https://tiktok.com/@${value.replace('@', '')}`
                 : c.field === 'twitter'            ? `https://twitter.com/${value.replace('@', '')}`
                 : c.prefix ? `${c.prefix}${value}` : value
      return { text: `📲 *${c.label}*\n${link}`, key: keyMap[c.field] || 'qrcode_website' }
    }
  }
  return null
}

function handleNossaMarca(company: any): string {
  const parts = [`*${company.name}*`, ``]
  if (company.brand_description) parts.push(company.brand_description, ``)
  if (company.business_hours)    parts.push(`🕐 *Horário:* ${company.business_hours}`)
  if (company.business_address)  parts.push(`📍 *Endereço:* ${company.business_address}`)
  return parts.join('\n')
}

function handleEndereco(company: any): string {
  if (!company.business_address) return '📍 Endereço não cadastrado.'
  const lines = [`📍 *Endereço:*`, ``, company.business_address]
  if (company.cidade || company.estado) lines.push([company.cidade, company.estado].filter(Boolean).join(' - '))
  if (company.cep) lines.push(`CEP: ${company.cep}`)
  return lines.join('\n')
}

function handleCardapio(company: any): string {
  if (!company.cardapio_url && !company.cardapio_description) {
    return '🍽️ Cardápio não disponível no momento.'
  }
  const lines = [`🍽️ *Cardápio — ${company.name}*`, ``]
  if (company.cardapio_description) lines.push(company.cardapio_description, ``)
  if (company.cardapio_url) lines.push(`📄 Confira aqui: ${company.cardapio_url}`)
  return lines.join('\n')
}

function handleMeuSistema(): string {
  return [
    `🔵 *minhAi — Assistente Inteligente*`, ``,
    `O minhAi é uma plataforma de atendimento inteligente que conecta empresas aos seus clientes através de assistentes de IA personalizados.`, ``,
    `🟢 *O que o minhAi faz:*`,
    `• Atendimento automático via WhatsApp, Instagram e Messenger`,
    `• Respostas baseadas no perfil e FAQ da empresa`,
    `• Geração de PIX e confirmação de pagamentos`,
    `• Consultas (CEP, CNPJ, câmbio e muito mais)`,
    `• Agendamentos via Google Calendar`, ``,
    `🌐 Saiba mais: https://minhai.app`,
  ].join('\n')
}

async function handleGerarSenha(supabase: any, companyId: string, company: any): Promise<string> {
  try {
    const { data: config, error: configError } = await supabase
      .from('fila_configs')
      .select('id, fila_ativa, mensagem_fila_pausada, prefixo_senha, ultimo_numero_gerado, tempo_medio_atendimento')
      .eq('company_id', companyId).eq('fila_ativa', true).maybeSingle()

    if (configError || !config) return '❌ Fila não disponível no momento.'
    if (!config.fila_ativa) return config.mensagem_fila_pausada || '⏸️ A fila está pausada no momento.'

    const proximoNumero = config.ultimo_numero_gerado + 1
    const senhaCompleta = `${config.prefixo_senha}${proximoNumero.toString().padStart(3, '0')}`

    const { data: novaSenha, error: senhaError } = await supabase
      .from('fila_senhas')
      .insert({ company_id: companyId, fila_config_id: config.id, senha_completa: senhaCompleta, numero: proximoNumero, prefixo: config.prefixo_senha, status: 'aguardando' })
      .select().single()

    if (senhaError || !novaSenha) return '❌ Erro ao gerar senha. Tente novamente.'

    await supabase.from('fila_configs').update({ ultimo_numero_gerado: proximoNumero }).eq('id', config.id)

    const { count: posicao } = await supabase
      .from('fila_senhas').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('status', 'aguardando').lt('gerada_em', novaSenha.gerada_em)

    const posicaoNaFila = (posicao || 0) + 1
    const tempoEstimado = posicaoNaFila * (config.tempo_medio_atendimento || 5)
    const linkAcompanhamento = company.slug ? `https://minhai.app/fila-acompanhamento/${novaSenha.id}` : null

    const lines = [
      `🎟️ *Senha gerada com sucesso!*`, ``,
      `📋 *Sua senha:* ${senhaCompleta}`,
      `📍 *Posição na fila:* ${posicaoNaFila}º`,
      `⏱️ *Tempo estimado:* ${tempoEstimado} minutos`, ``,
      `Aguarde ser chamado. Você receberá uma notificação quando chegar sua vez.`,
    ]
    if (linkAcompanhamento) lines.push(``, `🔗 *Acompanhe sua posição:*`, linkAcompanhamento)
    return lines.join('\n')

  } catch (err: any) {
    console.error('❌ handleGerarSenha erro:', err.message)
    return '❌ Erro ao gerar senha. Tente novamente.'
  }
}

// ══════════════════════════════════════════════════════════════════════════
// FAQ E HELPERS
// ══════════════════════════════════════════════════════════════════════════

function levenshteinSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  if (longer.length === 0) return 1.0
  const dp: number[] = Array.from({ length: shorter.length + 1 }, (_, i) => i)
  for (let i = 1; i <= longer.length; i++) {
    let prev = i
    for (let j = 1; j <= shorter.length; j++) {
      const val = longer[i-1] === shorter[j-1] ? dp[j-1] : Math.min(dp[j-1], dp[j], prev) + 1
      dp[j-1] = prev; prev = val
    }
    dp[shorter.length] = prev
  }
  return (longer.length - dp[shorter.length]) / longer.length
}

async function tryFaqMatch(supabase: any, companyId: string, userMessage: string): Promise<{ text: string; functionKey?: string; functionParams?: any } | null> {
  try {
    const { data: faqs } = await supabase
      .from('faq_entries')
      .select('id, question, answer, variations, usage_count, function_key, function_params')
      .eq('company_id', companyId).eq('is_active', true)

    if (!faqs || faqs.length === 0) return null

    const msgNorm = normalize(userMessage)
    let bestFaq: any = null
    let bestScore = 0

    for (const faq of faqs) {
      const questionNorm = normalize(faq.question)
      if (msgNorm === questionNorm) { bestFaq = faq; bestScore = 1.0; break }
      const levScore = levenshteinSimilarity(msgNorm, questionNorm)
      if (levScore > bestScore && levScore >= 0.85) { bestScore = levScore; bestFaq = faq }
      for (const v of (faq.variations || [])) {
        const vNorm = normalize(v)
        if (msgNorm === vNorm) { bestScore = 1.0; bestFaq = faq; break }
        const vLev = levenshteinSimilarity(msgNorm, vNorm)
        if (vLev > bestScore && vLev >= 0.85) { bestScore = vLev; bestFaq = faq }
      }
      if (bestScore === 1.0) break
    }

    if (!bestFaq || bestScore < 0.85) {
      const msgWords = new Set(msgNorm.split(/\s+/).filter((w) => w.length > 3))
      if (msgWords.size > 0) {
        for (const faq of faqs) {
          const faqWords = new Set(normalize(faq.question).split(/\s+/).filter((w: string) => w.length > 3))
          let matches = 0
          for (const w of msgWords) { if (faqWords.has(w)) matches++ }
          const score = matches / Math.max(msgWords.size, faqWords.size)
          if (score > bestScore) { bestScore = score; bestFaq = faq }
        }
      }
    }

    if (bestFaq && bestScore >= 0.6) {
      await supabase.from('faq_entries').update({ usage_count: (bestFaq.usage_count || 0) + 1, last_used_at: new Date().toISOString() }).eq('id', bestFaq.id)
      return { text: bestFaq.answer, functionKey: bestFaq.function_key || undefined, functionParams: bestFaq.function_params || undefined }
    }
    return null
  } catch (err: any) {
    console.warn('⚠️ Erro ao buscar FAQ:', err.message)
    return null
  }
}

async function handlePixGenerate(supabase: any, companyId: string, company: any, amountCents: number, platform: string): Promise<string[]> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/gerar-pix-assistente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ company_id: companyId, amount_cents: amountCents }),
    })
    const result = await res.json()
    if (!result.success) return [`❌ Não foi possível gerar o PIX: ${result.error}`]

    const amountBrl   = (amountCents / 100).toFixed(2).replace('.', ',')
    const confirmCode = String(Math.floor(1000 + Math.random() * 9000))
    await supabase.from('pix_transactions').update({ notes: `confirm_code:${confirmCode}` }).eq('id', result.transaction_id)

    return [
      result.pix_code,
      [`💰 *PIX de R$ ${amountBrl}*`, `🟢 Intermediações de Pagamentos BigCorps`, `🏢 para ${result.company_name}`, `🏦 Banco Inter`, `⏰ Válido por 30 minutos`, ``, `✅ Após confirmar o pagamento, digite *PAGO* ou o código *${confirmCode}*`].join('\n'),
    ]
  } catch { return ['❌ Erro ao gerar PIX. Tente novamente ou entre em contato diretamente.'] }
}

async function handlePixConfirm(supabase: any, companyId: string, fromId: string, confirmCode: string | null, platform: string): Promise<string> {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    let transactionId: string | null = null

    if (confirmCode) {
      const { data: txByCode } = await supabase.from('pix_transactions').select('id, amount_cents, status')
        .eq('company_id', companyId).eq('status', 'pending').ilike('notes', `%confirm_code:${confirmCode}%`)
        .gte('created_at', since).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (txByCode) { transactionId = txByCode.id }
      else return `❌ Código *${confirmCode}* não encontrado. Verifique o código enviado.`
    } else {
      const { data: lastTx } = await supabase.from('pix_transactions').select('id, amount_cents, status')
        .eq('company_id', companyId).eq('status', 'pending')
        .gte('created_at', since).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!lastTx) return `📋 Não encontrei nenhum PIX pendente na última hora.`
      transactionId = lastTx.id
    }

    const res    = await fetch(`${supabaseUrl}/functions/v1/confirmar-pix-assistente`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` }, body: JSON.stringify({ transaction_id: transactionId }) })
    const result = await res.json()

    if (result.already_confirmed) return `✅ Este PIX já havia sido confirmado anteriormente.`
    if (!result.success) {
      if (result.error?.includes('não foi pago') || result.status) return `⏳ Pagamento ainda não identificado. Verifique se concluiu o pagamento e tente novamente.`
      return `❌ Não foi possível confirmar: ${result.error}`
    }
    const amountBrl = result.amount_received?.toFixed(2).replace('.', ',') ?? '0,00'
    return [`✅ *Pagamento confirmado!*`, ``, `💵 Valor recebido: R$ ${amountBrl}`, `🏦 Status: Pago com sucesso`, ``, `Obrigado! 🎉`].join('\n')
  } catch { return '❌ Erro ao confirmar pagamento. Tente novamente.' }
}

async function handlePixPending(supabase: any, companyId: string, fromId: string, platform: string): Promise<string> {
  try {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: tx } = await supabase.from('pix_transactions').select('id, amount_cents, pix_code, expires_at, status, notes')
      .eq('company_id', companyId).eq('status', 'pending').gte('created_at', since).order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (!tx) return '📋 Não encontrei nenhum PIX pendente nos últimos 30 minutos.'
    const amountBrl         = (tx.amount_cents / 100).toFixed(2).replace('.', ',')
    const codeFromNotes     = tx.notes?.match(/confirm_code:(\d{4})/)?.[1]
    const confirmInstruction = codeFromNotes ? `✅ Após pagar, responda apenas: *${codeFromNotes}*` : `✅ Após pagar, responda: *paguei*`
    return [`📋 *Seu PIX pendente:*`, ``, `💵 Valor: R$ ${amountBrl}`, ``, `*Código Copia e Cola:*`, tx.pix_code, ``, confirmInstruction].join('\n')
  } catch { return '❌ Erro ao consultar PIX. Tente novamente.' }
}

function normalize(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) throw new Error('OPENAI_API_KEY não configurada')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], temperature: 0.7, max_tokens: 500 }),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(`OpenAI Error: ${d.error?.message || 'Unknown'}`)
  return d.choices[0].message.content
}
