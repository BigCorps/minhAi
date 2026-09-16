// supabase/functions/meta-flow-vendas/index.ts
// v4 — vendedor completo: delivery + frete Lalamove + notificações multi-canal
//      (WhatsApp canal, SMS, email) + prompt de vendedor aprimorado

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CREDIT_PER_FLOW_STEP = 1

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ItemCarrinho {
  produto_id:     string
  nome:           string
  preco_cents:    number
  quantidade:     number
  subtotal_cents: number
}

interface FlowState {
  flow:                 'pedido'
  etapa:                'produto' | 'quantidade' | 'mais_itens' | 'entrega' | 'endereco' | 'pagamento' | 'aguardando_pix'
  produto_id:           string | null
  produto_nome:         string | null
  produto_preco:        number | null   // centavos
  quantidade:           number | null
  itens:                ItemCarrinho[]
  tipo_entrega:         'retirada' | 'delivery' | 'mesa' | null
  endereco:             string | null
  numero_mesa:          string | null
  metodo:               string | null
  pedido_id:            string | null
  pix_txn_id:           string | null
  total_cents:          number          // total final (inclui frete se cliente paga)
  subtotal_cents:       number          // total só dos produtos
  frete_cents:          number          // frete com markup
  frete_original_cents: number          // frete bruto da Lalamove
  quotation_id:         string | null
  delivery_enabled:     boolean
  delivery_who_pays:    'cliente' | 'empresa'
  cliente_nome:         string | null
  cliente_telefone:     string | null
  cliente_email:        string | null
  started_at:           string
}

interface FlowResult {
  responseText: string | string[]
  newState:     FlowState | null
  functionKey:  string
  creditsUsed:  number
}

function emptyFlowState(deliveryEnabled = false, deliveryWhoPays = 'cliente'): FlowState {
  return {
    flow: 'pedido', etapa: 'produto',
    produto_id: null, produto_nome: null, produto_preco: null,
    quantidade: null, itens: [],
    tipo_entrega: null, endereco: null, numero_mesa: null,
    metodo: null, pedido_id: null, pix_txn_id: null,
    total_cents: 0, subtotal_cents: 0,
    frete_cents: 0, frete_original_cents: 0,
    quotation_id: null,
    delivery_enabled: deliveryEnabled,
    delivery_who_pays: deliveryWhoPays as 'cliente' | 'empresa',
    cliente_nome: null, cliente_telefone: null, cliente_email: null,
    started_at: new Date().toISOString(),
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const {
      msg, companyId, conversationId, pageId, platform,
      state, connection,
    } = await req.json()

    if (!msg || !companyId) {
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Telefone do cliente extraído da conversa Meta
    const clienteTelefone: string | null = (() => {
      const raw = connection?.customer_phone ?? connection?.phone ?? conversationId ?? null
      if (!raw) return null
      const digits = String(raw).replace(/\D/g, '')
      return digits.length >= 8 ? digits : null
    })()

    // Produtos ativos
    const { data: produtos } = await supabase
      .from('produtos_venda')
      .select('id, nome, descricao, preco_venda, categoria, imagem_url, controla_estoque, estoque_atual, is_favorito')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    // Métodos de pagamento ativos
    const { data: metodosSettings } = await supabase
      .from('company_function_settings')
      .select('function_key, is_enabled')
      .eq('company_id', companyId)
      .in('function_key', ['pix_generate', 'link_pagamento', 'nfc_debito', 'nfc_credito', 'tef_debito', 'tef_credito', 'dinheiro'])

    const metodos: string[] = (metodosSettings ?? [])
      .filter((m: any) => m.is_enabled)
      .map((m: any) => m.function_key)
    const metodosAtivos = metodos.length > 0 ? metodos : ['pix_generate']

    // Config de delivery
    const { data: companyData } = await supabase
      .from('companies')
      .select('delivery_enabled, delivery_who_pays, name')
      .eq('id', companyId)
      .maybeSingle()

    const deliveryEnabled  = !!companyData?.delivery_enabled
    const deliveryWhoPays  = (companyData?.delivery_who_pays ?? 'cliente') as 'cliente' | 'empresa'

    const result = await processFlow({
      msg, companyId, conversationId, pageId, platform,
      state: state as FlowState | null,
      produtos: produtos ?? [],
      metodos: metodosAtivos,
      deliveryEnabled,
      deliveryWhoPays,
      clienteTelefone,
      supabase, connection,
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('❌ meta-flow-vendas erro:', err.message)
    return new Response(JSON.stringify(null), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── Máquina de estados ───────────────────────────────────────────────────────

async function processFlow({
  msg, companyId, conversationId, pageId, platform,
  state, produtos, metodos, deliveryEnabled, deliveryWhoPays,
  clienteTelefone, supabase, connection,
}: {
  msg:              string
  companyId:        string
  conversationId:   string
  pageId:           string
  platform:         string
  state:            FlowState | null
  produtos:         any[]
  metodos:          string[]
  deliveryEnabled:  boolean
  deliveryWhoPays:  'cliente' | 'empresa'
  clienteTelefone:  string | null
  supabase:         any
  connection:       any
}): Promise<FlowResult> {

  const lower = msg.toLowerCase().trim()
  console.log(`🛒 processFlow — etapa: ${state?.etapa ?? 'início'}, msg: "${msg.substring(0, 60)}"`)

  // Cancelamento explícito em qualquer etapa
  const CANCEL = ['cancelar', 'cancela', 'desistir', 'deixa pra lá', 'não quero mais', 'nao quero mais', 'esquece']
  if (state && CANCEL.some(t => lower.includes(t))) {
    return {
      responseText: '❌ Pedido cancelado. Sempre que quiser fazer um novo pedido é só me chamar! 😊',
      newState: null,
      functionKey: 'fazer_pedido',
      creditsUsed: 0,
    }
  }

  // Sync: injetar telefone e config de delivery no estado existente
  if (state) {
    if (!state.cliente_telefone && clienteTelefone) state = { ...state, cliente_telefone: clienteTelefone }
    if (state.delivery_enabled === undefined) state = { ...state, delivery_enabled: deliveryEnabled, delivery_who_pays: deliveryWhoPays }
  }

  // Sem estado ativo ou etapa produto → detectar/buscar produto
  if (!state || state.etapa === 'produto') {
    return handleInicio(lower, msg, companyId, produtos, metodos, deliveryEnabled, deliveryWhoPays, clienteTelefone, supabase)
  }

  // Roteamento por etapa
  switch (state.etapa) {
    case 'quantidade':
      return handleQuantidade(lower, msg, state, produtos)
    case 'mais_itens':
      return handleMaisItens(lower, msg, state, produtos, metodos)
    case 'entrega':
      return handleEntrega(lower, msg, state, metodos)
    case 'endereco':
      return await handleEndereco(lower, msg, state, metodos, companyId)
    case 'pagamento':
      return await handlePagamento(lower, msg, state, companyId, metodos, supabase, conversationId, platform)
    case 'aguardando_pix':
      return await handleAguardandoPix(lower, msg, state, companyId, supabase, conversationId, platform)
    default:
      return {
        responseText: 'Desculpe, não entendi. Pode repetir?',
        newState: state,
        functionKey: 'fazer_pedido',
        creditsUsed: 0,
      }
  }
}

// ─── Etapa: início / busca de produto ────────────────────────────────────────

async function handleInicio(
  lower: string, msg: string, companyId: string,
  produtos: any[], metodos: string[],
  deliveryEnabled: boolean, deliveryWhoPays: 'cliente' | 'empresa',
  clienteTelefone: string | null,
  supabase: any,
): Promise<FlowResult> {

  const produto = buscarProduto(lower, produtos)

  if (!produto) {
    // Verifica se é uma saudação sem pedido — responde de forma acolhedora
    const SAUDACOES = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi', 'opa', 'eai', 'e aí']
    const ehSaudacao = SAUDACOES.some(s => lower === s || lower.startsWith(s + ' '))

    const favoritos = produtos.filter((p: any) => p.is_favorito).slice(0, 3)
    const destaques = favoritos.length > 0 ? favoritos : produtos.slice(0, 4)
    const listaDestaques = destaques
      .map((p: any) => `⭐ *${p.nome}* — ${formatPreco(Math.round(p.preco_venda * 100))}${p.descricao ? `\n   _${p.descricao}_` : ''}`)
      .join('\n\n')

    const listaTodos = produtos
      .slice(0, 10)
      .map((p: any) => `• ${p.nome} — ${formatPreco(Math.round(p.preco_venda * 100))}`)
      .join('\n')

    if (ehSaudacao) {
      return {
        responseText: [
          `Olá! Tudo bem? 😊 Seja bem-vindo(a)!`,
          ``,
          produtos.length > 0
            ? `Temos produtos incríveis para você. ${destaques.length > 0 ? 'Alguns destaques:\n\n' + listaDestaques : ''}${produtos.length > destaques.length ? `\n\nPara ver o cardápio completo, diga *cardápio*.\n\nO que vai querer hoje?` : '\n\nO que vai querer hoje?'}`
            : `Ainda não temos produtos cadastrados no momento. 😔`,
        ].filter(Boolean).join('\n'),
        newState: emptyFlowState(deliveryEnabled, deliveryWhoPays),
        functionKey: 'fazer_pedido',
        creditsUsed: 0,
      }
    }

    // Pedido de cardápio completo
    if (lower.includes('cardápio') || lower.includes('cardapio') || lower.includes('menu') || lower.includes('produtos') || lower.includes('tem?') || lower.includes('o que tem')) {
      const { data: companySlug } = await supabase
        .from('companies')
        .select('slug')
        .eq('id', companyId)
        .maybeSingle()
      const slug = companySlug?.slug ?? ''
      const linkCardapio = slug ? `https://minhai.app/ia/${slug}` : null

      return {
        responseText: linkCardapio
          ? `📋 *Veja nosso cardápio completo aqui:*\n\n👉 ${linkCardapio}\n\nEncontre o que preferir e me diga o que vai querer! 😊`
          : produtos.length > 0
            ? `📋 *Cardápio completo:*\n\n${listaTodos}\n\nQual desses você deseja? 😊`
            : '❌ Não há produtos cadastrados no momento.',
        newState: emptyFlowState(deliveryEnabled, deliveryWhoPays),
        functionKey: 'fazer_pedido',
        creditsUsed: 0,
      }
    }

    // Produto não encontrado — sugere alternativas
    return {
      responseText: produtos.length > 0
        ? `Hmm, não encontrei esse produto específico. 🤔\n\nAqui estão nossas opções:\n\n${listaTodos}\n\nQual desses você prefere?`
        : '❌ Não há produtos cadastrados no momento.',
      newState: emptyFlowState(deliveryEnabled, deliveryWhoPays),
      functionKey: 'fazer_pedido',
      creditsUsed: 0,
    }
  }

  // Produto sem estoque
  if (produto.controla_estoque && produto.estoque_atual <= 0) {
    // Sugere produto similar da mesma categoria
    const similar = produtos.find((p: any) =>
      p.id !== produto.id &&
      p.is_active &&
      (!p.controla_estoque || p.estoque_atual > 0) &&
      p.categoria === produto.categoria,
    )
    return {
      responseText: similar
        ? `😔 *${produto.nome}* está sem estoque no momento.\n\nQue tal *${similar.nome}* por ${formatPreco(Math.round(similar.preco_venda * 100))}? É uma ótima opção! 😊`
        : `😔 *${produto.nome}* está sem estoque no momento. Posso te ajudar com outro produto?`,
      newState: emptyFlowState(deliveryEnabled, deliveryWhoPays),
      functionKey: 'fazer_pedido',
      creditsUsed: 0,
    }
  }

  const preco_cents = Math.round(produto.preco_venda * 100)

  const newState: FlowState = {
    ...emptyFlowState(deliveryEnabled, deliveryWhoPays),
    etapa:         'quantidade',
    produto_id:    produto.id,
    produto_nome:  produto.nome,
    produto_preco: preco_cents,
    cliente_telefone: clienteTelefone,
  }

  // Tenta extrair quantidade já da mensagem inicial ("quero 2 cafés", "me dá 3 pães")
  const qtyNaMsg = extrairNumero(lower)
  if (qtyNaMsg && qtyNaMsg > 0 && qtyNaMsg <= 999) {
    const subtotal = preco_cents * qtyNaMsg
    const item: ItemCarrinho = {
      produto_id: produto.id, nome: produto.nome,
      preco_cents, quantidade: qtyNaMsg, subtotal_cents: subtotal,
    }
    const itens = [item]
    const subtotal_cents = subtotal
    const newStateComQty: FlowState = {
      ...newState,
      etapa: 'mais_itens',
      itens, subtotal_cents, total_cents: subtotal_cents,
      produto_id: null, produto_nome: null, produto_preco: null,
      quantidade: qtyNaMsg,
    }
    return {
      responseText: `✅ *${qtyNaMsg}x ${produto.nome}* adicionado ao carrinho!\n\n📋 *Carrinho:*\n  • ${produto.nome} x${qtyNaMsg} — ${formatPreco(subtotal)}\n\n💰 *Total: ${formatPreco(subtotal_cents)}*\n\nDeseja adicionar mais algum item? Responda *sim* ou *não* 😊`,
      newState: newStateComQty,
      functionKey: 'fazer_pedido',
      creditsUsed: CREDIT_PER_FLOW_STEP,
    }
  }

  // Produto encontrado, perguntar quantidade com entusiasmo
  const estoque = produto.controla_estoque ? ` _(${produto.estoque_atual} disponíveis)_` : ''
  return {
    responseText: `🛍️ *${produto.nome}*\n💰 ${formatPreco(preco_cents)}${estoque}${produto.descricao ? `\n\n${produto.descricao}` : ''}\n\nQuantas unidades você deseja?`,
    newState,
    functionKey: 'fazer_pedido',
    creditsUsed: CREDIT_PER_FLOW_STEP,
  }
}

// ─── Etapa: quantidade ────────────────────────────────────────────────────────

function handleQuantidade(lower: string, msg: string, state: FlowState, produtos: any[]): FlowResult {
  const qty = extrairNumero(lower)

  if (!qty || qty <= 0 || qty > 999) {
    return {
      responseText: `Informe a quantidade de *${state.produto_nome}* que deseja:`,
      newState: state,
      functionKey: 'fazer_pedido',
      creditsUsed: 0,
    }
  }

  // Verifica estoque
  if (state.produto_id) {
    const produto = produtos.find((p: any) => p.id === state.produto_id)
    if (produto?.controla_estoque && qty > produto.estoque_atual) {
      return {
        responseText: `⚠️ Temos apenas *${produto.estoque_atual} unidades* disponíveis de *${state.produto_nome}*.\n\nQuantas deseja? (máximo ${produto.estoque_atual})`,
        newState: state,
        functionKey: 'fazer_pedido',
        creditsUsed: 0,
      }
    }
  }

  const subtotal = (state.produto_preco ?? 0) * qty
  const item: ItemCarrinho = {
    produto_id:     state.produto_id!,
    nome:           state.produto_nome!,
    preco_cents:    state.produto_preco!,
    quantidade:     qty,
    subtotal_cents: subtotal,
  }

  const itens = [...state.itens, item]
  const subtotal_cents = itens.reduce((acc, i) => acc + i.subtotal_cents, 0)
  const resumoItens = itens.map(i => `  • ${i.nome} x${i.quantidade} — ${formatPreco(i.subtotal_cents)}`).join('\n')

  const newState: FlowState = {
    ...state,
    etapa:         'mais_itens',
    itens,
    subtotal_cents,
    total_cents:   subtotal_cents,
    produto_id:    null,
    produto_nome:  null,
    produto_preco: null,
    quantidade:    qty,
  }

  return {
    responseText: `✅ *${qty}x ${item.nome}* adicionado!\n\n📋 *Carrinho:*\n${resumoItens}\n\n💰 *Total: ${formatPreco(subtotal_cents)}*\n\nDeseja adicionar mais algum item? Responda *sim* ou *não* 😊`,
    newState,
    functionKey: 'fazer_pedido',
    creditsUsed: CREDIT_PER_FLOW_STEP,
  }
}

// ─── Etapa: mais itens ────────────────────────────────────────────────────────

function handleMaisItens(lower: string, msg: string, state: FlowState, produtos: any[], metodos: string[]): FlowResult {
  const SIM = ['sim', 's', 'yes', 'quero', 'pode', 'também', 'tambem', 'adicionar', 'mais', 'quero mais', 'tem mais']
  const NAO = ['não', 'nao', 'n', 'no', 'só isso', 'so isso', 'chega', 'finalizar', 'pagar', 'continuar', 'pronto', 'pode ir', 'isso mesmo', 'tá bom', 'ta bom', 'feito']

  // Tenta detectar produto diretamente no texto
  const produto = buscarProduto(lower, produtos)
  const ultimoId = state.itens[state.itens.length - 1]?.produto_id
  if (produto && produto.id !== ultimoId) {
    if (produto.controla_estoque && produto.estoque_atual <= 0) {
      return {
        responseText: `😔 *${produto.nome}* está sem estoque. Deseja outro item?`,
        newState: state,
        functionKey: 'fazer_pedido',
        creditsUsed: 0,
      }
    }
    const preco_cents = Math.round(produto.preco_venda * 100)
    return {
      responseText: `🛍️ *${produto.nome}* — ${formatPreco(preco_cents)}\nQuantas unidades?`,
      newState: { ...state, etapa: 'quantidade', produto_id: produto.id, produto_nome: produto.nome, produto_preco: preco_cents },
      functionKey: 'fazer_pedido',
      creditsUsed: 0,
    }
  }

  if (SIM.some(t => lower === t || lower.startsWith(t + ' '))) {
    return {
      responseText: 'Claro! Qual produto deseja adicionar? 😊',
      newState: { ...state, etapa: 'produto' },
      functionKey: 'fazer_pedido',
      creditsUsed: 0,
    }
  }

  if (NAO.some(t => lower === t || lower.includes(t))) {
    // Monta opções de entrega com base na configuração da empresa
    const opcoesEntrega = buildOpcoesEntrega(state.delivery_enabled)
    return {
      responseText: `Ótimo! 🎉\n\nComo prefere receber seu pedido?\n\n${opcoesEntrega}`,
      newState: { ...state, etapa: 'entrega' },
      functionKey: 'fazer_pedido',
      creditsUsed: CREDIT_PER_FLOW_STEP,
    }
  }

  return {
    responseText: 'Deseja adicionar mais algum item? Responda *sim* para continuar ou *não* para finalizar. 😊',
    newState: state,
    functionKey: 'fazer_pedido',
    creditsUsed: 0,
  }
}

// ─── Etapa: tipo de entrega ───────────────────────────────────────────────────

function handleEntrega(lower: string, msg: string, state: FlowState, metodos: string[]): FlowResult {
  const RETIRADA = ['1', 'retirada', 'retir', 'balcão', 'balcao', 'buscar', 'busco', 'vou buscar', 'local', 'pego']
  const DELIVERY = ['2', 'delivery', 'entrega', 'entregar', 'minha casa', 'endereço', 'endereco', 'manda', 'mandar']
  const MESA     = ['3', 'mesa', 'comanda']

  if (RETIRADA.some(t => lower === t || lower.includes(t))) {
    return buildPagamentoResponse({ ...state, etapa: 'pagamento', tipo_entrega: 'retirada' }, metodos)
  }

  if (state.delivery_enabled && DELIVERY.some(t => lower.includes(t))) {
    return {
      responseText: '📍 Ótimo! Qual é o endereço de entrega?\n\nInforme rua, número, bairro e cidade:',
      newState: { ...state, etapa: 'endereco', tipo_entrega: 'delivery' },
      functionKey: 'fazer_pedido',
      creditsUsed: 0,
    }
  }

  if (MESA.some(t => lower.includes(t))) {
    const numMesa = lower.match(/mesa\s*(\d+)/i)?.[1] || lower.match(/comanda\s*(\d+)/i)?.[1]
    if (numMesa) {
      return buildPagamentoResponse({ ...state, etapa: 'pagamento', tipo_entrega: 'mesa', numero_mesa: numMesa }, metodos)
    }
    return {
      responseText: '🪑 Qual o número da mesa ou comanda?',
      newState: { ...state, etapa: 'endereco', tipo_entrega: 'mesa' },
      functionKey: 'fazer_pedido',
      creditsUsed: 0,
    }
  }

  const opcoesEntrega = buildOpcoesEntrega(state.delivery_enabled)
  return {
    responseText: `Por favor, escolha como prefere receber:\n\n${opcoesEntrega}`,
    newState: state,
    functionKey: 'fazer_pedido',
    creditsUsed: 0,
  }
}

// ─── Etapa: endereço / número de mesa ────────────────────────────────────────

async function handleEndereco(
  lower: string, msg: string, state: FlowState,
  metodos: string[], companyId: string,
): Promise<FlowResult> {

  if (msg.trim().length < 3) {
    const prompt = state.tipo_entrega === 'mesa'
      ? '🪑 Informe o número da mesa ou comanda:'
      : '📍 Informe o endereço completo (rua, número, bairro e cidade):'
    return { responseText: prompt, newState: state, functionKey: 'fazer_pedido', creditsUsed: 0 }
  }

  if (state.tipo_entrega === 'mesa') {
    const numMesa = msg.match(/(\d+)/)?.[1] || msg.trim()
    return buildPagamentoResponse({ ...state, etapa: 'pagamento', numero_mesa: numMesa }, metodos)
  }

  // Delivery — calcular frete via Lalamove
  const endereco = msg.trim()
  try {
    const freteRes = await fetch(`${supabaseUrl}/functions/v1/lalamove-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        action: 'quote',
        company_id: companyId,
        delivery_address: endereco,
        order_total_cents: state.subtotal_cents,
      }),
    })
    const freteData = await freteRes.json()

    if (freteData.success) {
      const frete_cents = freteData.price_cents
      const frete_original_cents = freteData.price_original_cents
      const eta = freteData.eta_minutes ? ` (~${freteData.eta_minutes} min)` : ''

      const totalFinal = state.subtotal_cents + (state.delivery_who_pays === 'cliente' ? frete_cents : 0)

      const freteTexto = state.delivery_who_pays === 'empresa'
        ? `🎁 *Frete grátis!* (custeado pela loja)`
        : `🛵 *Frete: ${formatPreco(frete_cents)}*${eta}`

      const stateComFrete: FlowState = {
        ...state,
        etapa:                'pagamento',
        endereco,
        frete_cents,
        frete_original_cents,
        quotation_id:         freteData.quotation_id,
        total_cents:          totalFinal,
      }

      // Exibe resumo + opções de pagamento já juntos para agilizar
      const pagamentoResp = buildPagamentoResponse(stateComFrete, metodos)

      return {
        responseText: [
          `✅ *Endereço confirmado!*\n📍 ${endereco}`,
          ``,
          freteTexto,
          state.delivery_who_pays === 'cliente'
            ? `💰 *Total com frete: ${formatPreco(totalFinal)}*`
            : `💰 *Total: ${formatPreco(totalFinal)}*`,
          ``,
          pagamentoResp.responseText as string,
        ].join('\n'),
        newState: stateComFrete,
        functionKey: 'fazer_pedido',
        creditsUsed: CREDIT_PER_FLOW_STEP,
      }
    }

    // Erro da Lalamove — pede endereço novamente com orientação
    return {
      responseText: `❌ ${freteData.error ?? 'Não foi possível calcular o frete para esse endereço.'}\n\nVerifique o endereço e tente novamente.\n\n_Exemplo: Rua das Flores, 123, Jardim América, São Paulo_`,
      newState: { ...state, tipo_entrega: 'delivery' },
      functionKey: 'fazer_pedido',
      creditsUsed: 0,
    }

  } catch (e: any) {
    console.error('Erro ao calcular frete:', e.message)
    // Fallback: segue sem frete (empresa arca internamente)
    return buildPagamentoResponse({ ...state, etapa: 'pagamento', endereco }, metodos)
  }
}

// ─── Etapa: pagamento ─────────────────────────────────────────────────────────

async function handlePagamento(
  lower: string, msg: string, state: FlowState,
  companyId: string, metodos: string[], supabase: any,
  conversationId: string, platform: string,
): Promise<FlowResult> {

  // Detecta método por palavra-chave
  let metodoDef: string | null = null
  if (lower.includes('pix'))                                                                       metodoDef = 'pix_generate'
  else if (lower.includes('link'))                                                                 metodoDef = 'link_pagamento'
  else if (lower.includes('dinheiro') || lower.includes('espécie') || lower.includes('especie'))  metodoDef = 'dinheiro'
  else if (lower.includes('tef') && (lower.includes('débito') || lower.includes('debito')))        metodoDef = 'tef_debito'
  else if (lower.includes('tef') && (lower.includes('crédito') || lower.includes('credito')))      metodoDef = 'tef_credito'
  else if (lower.includes('débito') || lower.includes('debito'))                                   metodoDef = metodos.includes('tef_debito') ? 'tef_debito' : 'nfc_debito'
  else if (lower.includes('crédito') || lower.includes('credito'))                                metodoDef = metodos.includes('tef_credito') ? 'tef_credito' : 'nfc_credito'

  // Seleção por número
  if (!metodoDef && /^\d$/.test(lower.trim())) {
    const idx = parseInt(lower.trim()) - 1
    metodoDef = metodos[idx] ?? null
  }

  if (!metodoDef || !metodos.includes(metodoDef)) {
    return buildPagamentoResponse(state, metodos)
  }

  // ── Dinheiro ───────────────────────────────────────────────────────────────
  if (metodoDef === 'dinheiro') {
    const pedidoId = await criarPedido(supabase, companyId, state, 'dinheiro', 'pago', conversationId, platform)
    return {
      responseText: [
        `✅ *Pedido confirmado!*`,
        ``,
        buildResumo(state),
        ``,
        `💵 Pagamento: Dinheiro`,
        ``,
        `Obrigado pela compra! Preparamos tudo com carinho para você. 🎉`,
      ].join('\n'),
      newState: null,
      functionKey: 'fazer_pedido',
      creditsUsed: CREDIT_PER_FLOW_STEP,
    }
  }

  // ── Link de pagamento ──────────────────────────────────────────────────────
  if (metodoDef === 'link_pagamento') {
    const pedidoId = await criarPedido(supabase, companyId, state, 'nfc', 'aguardando_pagamento', conversationId, platform)
    const { data: company } = await supabase.from('companies').select('slug').eq('id', companyId).single()
    const slug = company?.slug ?? ''
    const linkUrl = slug
      ? `https://minhai.app/pay/${slug}/${state.total_cents}`
      : `https://minhai.app/pay/${state.total_cents}`

    return {
      responseText: [
        `🔗 *Link de Pagamento — ${formatPreco(state.total_cents)}*`,
        ``,
        buildResumo(state),
        ``,
        `👇 Clique para pagar:`,
        linkUrl,
        ``,
        `⏰ Válido por 30 minutos`,
        `💳 Aceita cartão de crédito, débito e PIX`,
        ``,
        `Após o pagamento, me avise com *PAGO* 😊`,
      ].join('\n'),
      newState: {
        ...state,
        etapa:    'aguardando_pix',
        metodo:   'link_pagamento',
        pedido_id: pedidoId,
      },
      functionKey: 'fazer_pedido',
      creditsUsed: CREDIT_PER_FLOW_STEP,
    }
  }

  // ── PIX ────────────────────────────────────────────────────────────────────
  if (metodoDef === 'pix_generate') {
    const pedidoId = await criarPedido(supabase, companyId, state, 'pix', 'aguardando_pagamento', conversationId, platform)

    const pixRes = await fetch(`${supabaseUrl}/functions/v1/gerar-pix-assistente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ company_id: companyId, amount_cents: state.total_cents }),
    })
    const pixData = await pixRes.json()

    if (!pixData.success) {
      return {
        responseText: `❌ Não foi possível gerar o PIX: ${pixData.error ?? 'erro desconhecido'}. Tente outro método de pagamento.`,
        newState: { ...state, metodo: 'pix_generate', pedido_id: pedidoId },
        functionKey: 'fazer_pedido',
        creditsUsed: 0,
      }
    }

    if (pedidoId) {
      await supabase.from('pix_transactions')
        .update({ pedido_id: pedidoId })
        .eq('id', pixData.transaction_id)
    }

    const confirmCode = String(Math.floor(1000 + Math.random() * 9000))
    await supabase.from('pix_transactions')
      .update({ notes: `confirm_code:${confirmCode}` })
      .eq('id', pixData.transaction_id)

    return {
      responseText: [
        pixData.pix_code,
        [
          `💰 *PIX — ${formatPreco(state.total_cents)}*`,
          ``,
          buildResumo(state),
          ``,
          `🏦 Banco Inter`,
          `⏰ Válido por 30 minutos`,
          ``,
          `*Passo a passo:*`,
          `1️⃣ Copie o código acima`,
          `2️⃣ Abra seu banco e escolha PIX Copia e Cola`,
          `3️⃣ Cole o código e confirme`,
          ``,
          `✅ Após pagar, responda *PAGO* ou o código *${confirmCode}*`,
        ].join('\n'),
      ],
      newState: {
        ...state,
        etapa:      'aguardando_pix',
        metodo:     'pix_generate',
        pedido_id:  pedidoId,
        pix_txn_id: pixData.transaction_id,
      },
      functionKey: 'fazer_pedido',
      creditsUsed: CREDIT_PER_FLOW_STEP,
    }
  }

  // ── TEF / NFC ──────────────────────────────────────────────────────────────
  const metodoLabel = metodoDef.includes('debito') ? 'Débito' : 'Crédito'
  const tipoLabel   = metodoDef.startsWith('tef') ? 'maquininha' : 'NFC (aproximação)'
  const metodoPgto  = metodoDef.startsWith('tef') ? 'tef' : 'nfc'
  const pedidoId    = await criarPedido(supabase, companyId, state, metodoPgto, 'aguardando_pagamento', conversationId, platform)

  return {
    responseText: [
      `💳 *${tipoLabel} — ${metodoLabel}*`,
      ``,
      buildResumo(state),
      ``,
      `Realize o pagamento de *${formatPreco(state.total_cents)}* com o atendente.`,
      ``,
      `Após concluir, me avise com *PAGO* ✅`,
    ].join('\n'),
    newState: {
      ...state,
      etapa:     'aguardando_pix',
      metodo:    metodoDef,
      pedido_id: pedidoId,
    },
    functionKey: 'fazer_pedido',
    creditsUsed: CREDIT_PER_FLOW_STEP,
  }
}

// ─── Etapa: aguardando confirmação ────────────────────────────────────────────

async function handleAguardandoPix(
  lower: string, msg: string, state: FlowState,
  companyId: string, supabase: any,
  conversationId: string, platform: string,
): Promise<FlowResult> {

  const CONFIRM   = ['pago', 'paguei', 'confirmei', 'feito', 'já paguei', 'ja paguei', 'ok pago', 'fiz o pix', 'fiz pix', 'transferi']
  const codeMatch = msg.match(/\b(\d{4})\b/)
  const isConfirm = CONFIRM.some(t => lower.includes(t)) || codeMatch

  if (!isConfirm) {
    // Reagir a mensagens de impaciência / dúvida
    if (lower.includes('cadê') || lower.includes('cade') || lower.includes('quando') || lower.includes('demor')) {
      return {
        responseText: `⏳ Estamos verificando seu pagamento! Após pagar, é só responder *PAGO* que confirmamos na hora. 😊`,
        newState: state,
        functionKey: 'fazer_pedido',
        creditsUsed: 0,
      }
    }
    return {
      responseText: `⏳ Aguardando confirmação do pagamento.\n\nApós pagar, responda *PAGO* ou envie o código de 4 dígitos. 😊`,
      newState: state,
      functionKey: 'fazer_pedido',
      creditsUsed: 0,
    }
  }

  // Confirmação real via PIX
  if (state.pix_txn_id && (state.metodo === 'pix_generate')) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/confirmar-pix-assistente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ transaction_id: state.pix_txn_id }),
      })
      const result = await res.json()

      if (!result.success && !result.already_confirmed) {
        return {
          responseText: `⏳ Pagamento ainda não identificado no sistema. Aguarde alguns segundos e tente novamente com *PAGO*.\n\n_Se já realizou o pagamento, pode levar até 1 minuto para aparecer._`,
          newState: state,
          functionKey: 'fazer_pedido',
          creditsUsed: 0,
        }
      }
    } catch {
      // Erro na edge — aceita confirmação manual (melhor UX)
    }
  } else {
    // TEF/NFC/Link — confirma manualmente
    if (state.pedido_id) {
      await supabase.from('pedidos')
        .update({ status: 'pago', paid_at: new Date().toISOString() })
        .eq('id', state.pedido_id)
    }
  }

  // Despachar entregador se foi delivery com frete calculado
  let shareLink: string | null = null
  if (state.tipo_entrega === 'delivery' && state.quotation_id && state.endereco && state.pedido_id) {
    try {
      const orderRes = await fetch(`${supabaseUrl}/functions/v1/lalamove-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          action:               'order',
          company_id:           companyId,
          pedido_id:            state.pedido_id,
          quotation_id:         state.quotation_id,
          delivery_address:     state.endereco,
          cliente_nome:         state.cliente_nome,
          cliente_telefone:     state.cliente_telefone,
          price_cents:          state.frete_cents,
          price_original_cents: state.frete_original_cents,
        }),
      })
      const orderData = await orderRes.json()
      if (orderData.success) shareLink = orderData.share_link
    } catch (e: any) {
      console.error('Erro ao despachar entregador:', e.message)
    }

    // Notificar cliente pelo canal + SMS + email (fire-and-forget)
    if (shareLink) {
      fetch(`${supabaseUrl}/functions/v1/notificar-entrega-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          pedido_id:        state.pedido_id,
          share_link:       shareLink,
          company_id:       companyId,
          cliente_nome:     state.cliente_nome,
          cliente_telefone: state.cliente_telefone,
          cliente_email:    state.cliente_email,
          platform,
          conversation_id:  conversationId,
        }),
      }).catch(() => {})
    }
  }

  // Resposta final
  const entregaFinalTexto = state.tipo_entrega === 'delivery'
    ? shareLink
      ? `\n\n🛵 Seu entregador foi chamado!\n👉 Acompanhe: ${shareLink}`
      : `\n\n🛵 Seu entregador está sendo chamado! Você receberá o link de rastreio em breve.`
    : state.tipo_entrega === 'mesa'
    ? `\n\n🪑 Seu pedido está sendo preparado para a mesa *${state.numero_mesa}*!`
    : `\n\n🏪 Seu pedido estará pronto para retirada em breve!`

  return {
    responseText: [
      `✅ *Pagamento confirmado!*`,
      ``,
      buildResumo(state),
      ``,
      `💵 Total pago: *${formatPreco(state.total_cents)}*`,
      entregaFinalTexto,
      ``,
      `Obrigado pela compra! 🎉 Volte sempre! 😊`,
    ].join('\n'),
    newState: null,
    functionKey: 'fazer_pedido',
    creditsUsed: CREDIT_PER_FLOW_STEP,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildOpcoesEntrega(deliveryEnabled: boolean): string {
  const opcoes = [
    `1️⃣ Retirada no local`,
    deliveryEnabled ? `2️⃣ Delivery (entrega no endereço)` : null,
    `3️⃣ Mesa / Comanda`,
  ].filter(Boolean)
  return opcoes.join('\n')
}

function buscarProduto(lower: string, produtos: any[]): any | null {
  if (!produtos.length) return null

  // Match exato por nome completo
  for (const p of produtos) {
    if (lower.includes(p.nome.toLowerCase())) return p
  }

  // Match por categoria
  for (const p of produtos) {
    if (p.categoria && lower.includes(p.categoria.toLowerCase())) return p
  }

  // Match parcial — palavras com 3+ chars
  for (const p of produtos) {
    const palavras = p.nome.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3)
    if (palavras.some((w: string) => lower.includes(w))) return p
  }

  // Match por descrição
  for (const p of produtos) {
    if (p.descricao) {
      const palavrasDesc = p.descricao.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 4)
      if (palavrasDesc.some((w: string) => lower.includes(w))) return p
    }
  }

  return null
}

function extrairNumero(lower: string): number | null {
  const digitMatch = lower.match(/\b(\d+)\b/)
  if (digitMatch) return parseInt(digitMatch[1])

  const extenso: Record<string, number> = {
    'um': 1, 'uma': 1, 'hum': 1,
    'dois': 2, 'duas': 2,
    'três': 3, 'tres': 3,
    'quatro': 4,
    'cinco': 5,
    'seis': 6,
    'sete': 7,
    'oito': 8,
    'nove': 9,
    'dez': 10,
    'onze': 11, 'doze': 12, 'treze': 13,
    'catorze': 14, 'quatorze': 14,
    'quinze': 15, 'vinte': 20,
  }

  const palavras = lower.split(/\s+/)
  for (const palavra of palavras) {
    const limpa = palavra.replace(/[^a-záéíóúàâêôãõç]/g, '')
    if (extenso[limpa] !== undefined) return extenso[limpa]
  }

  return null
}

function formatPreco(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

function buildPagamentoResponse(state: FlowState, metodos: string[]): FlowResult {
  const LABELS: Record<string, string> = {
    pix_generate:   'PIX (copia e cola)',
    link_pagamento: 'Link de Pagamento',
    nfc_debito:     'Débito (NFC/aproximação)',
    nfc_credito:    'Crédito (NFC/aproximação)',
    tef_debito:     'Débito (maquininha)',
    tef_credito:    'Crédito (maquininha)',
    dinheiro:       'Dinheiro',
  }

  const opcoesTexto = metodos
    .filter(m => LABELS[m])
    .map((m, i) => `${i + 1}️⃣ ${LABELS[m]}`)
    .join('\n')

  return {
    responseText: [
      buildResumo(state),
      ``,
      `💳 Como prefere pagar?`,
      ``,
      opcoesTexto || `1️⃣ PIX (copia e cola)`,
      ``,
      `Responda com o nome ou número da opção. 😊`,
    ].join('\n'),
    newState: { ...state, etapa: 'pagamento' },
    functionKey: 'fazer_pedido',
    creditsUsed: CREDIT_PER_FLOW_STEP,
  }
}

function buildResumo(state: FlowState): string {
  const itensTexto = state.itens.length > 0
    ? state.itens.map(i => `  • ${i.nome} x${i.quantidade} — ${formatPreco(i.subtotal_cents)}`).join('\n')
    : state.produto_nome
    ? `  • ${state.produto_nome} — ${formatPreco(state.total_cents)}`
    : ''

  const entregaTexto = state.tipo_entrega === 'delivery'
    ? `🛵 Delivery: ${state.endereco}`
    : state.tipo_entrega === 'mesa'
    ? `🪑 Mesa/Comanda: ${state.numero_mesa}`
    : state.tipo_entrega === 'retirada'
    ? `🏪 Retirada no local`
    : ''

  const freteTexto = state.tipo_entrega === 'delivery' && state.frete_cents > 0
    ? state.delivery_who_pays === 'empresa'
      ? `🎁 Frete: Grátis`
      : `🛵 Frete: ${formatPreco(state.frete_cents)}`
    : ''

  return [
    `📋 *Resumo do pedido:*`,
    itensTexto,
    freteTexto,
    ``,
    `💰 *Total: ${formatPreco(state.total_cents)}*`,
    entregaTexto,
  ].filter(Boolean).join('\n')
}

async function criarPedido(
  supabase: any,
  companyId: string,
  state: FlowState,
  metodoPgto: string,
  status: string,
  conversationId: string,
  platform: string,
): Promise<string | null> {
  try {
    const observacoes = state.tipo_entrega === 'delivery'
      ? `Delivery: ${state.endereco}`
      : state.tipo_entrega === 'mesa'
      ? `Mesa/Comanda: ${state.numero_mesa}`
      : 'Retirada no local'

    const subtotalSemFrete = state.subtotal_cents > 0 ? state.subtotal_cents : state.total_cents

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert({
        company_id:                  companyId,
        subtotal:                    subtotalSemFrete / 100,
        desconto:                    0,
        total:                       state.total_cents / 100,
        metodo_pagamento:            metodoPgto,
        status,
        observacoes,
        session_id:                  `meta_flow_${Date.now()}`,
        cliente_nome:                state.cliente_nome ?? null,
        cliente_telefone:            state.cliente_telefone ?? null,
        cliente_email:               state.cliente_email ?? null,
        // Campos de delivery
        delivery_requested:          state.tipo_entrega === 'delivery',
        delivery_address:            state.tipo_entrega === 'delivery' ? state.endereco : null,
        delivery_fee_cents:          state.frete_cents > 0 ? state.frete_cents : null,
        delivery_fee_original_cents: state.frete_original_cents > 0 ? state.frete_original_cents : null,
        // Canal Meta para notificações
        platform:                    platform ?? null,
        conversation_id:             conversationId ?? null,
      })
      .select('id')
      .single()

    if (error || !pedido) {
      console.error('❌ Erro ao criar pedido:', error?.message)
      return null
    }

    if (state.itens.length > 0) {
      const itensInsert = state.itens.map(i => ({
        pedido_id:      pedido.id,
        produto_id:     i.produto_id,
        nome_snapshot:  i.nome,
        preco_unitario: i.preco_cents / 100,
        quantidade:     i.quantidade,
        subtotal:       i.subtotal_cents / 100,
      }))
      await supabase.from('pedido_itens').insert(itensInsert)
    }

    // Notifica dono (fire-and-forget)
    fetch(`${supabaseUrl}/functions/v1/notificar-pedido-pago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ pedido_id: pedido.id }),
    }).catch(() => {})

    return pedido.id
  } catch (err: any) {
    console.error('❌ criarPedido erro:', err.message)
    return null
  }
}