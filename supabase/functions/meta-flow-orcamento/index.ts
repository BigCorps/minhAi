// supabase/functions/meta-flow-orcamento/index.ts
// Máquina de estados para fluxo de orçamento conversacional no Meta
// Mantém contexto acumulativo entre mensagens via meta_flow_state

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ItemOrcamento {
  descricao:      string
  qtd:            number
  valor_unitario: number
  subtotal:       number
}

interface OrcamentoData {
  cliente:   { nome: string; contato: string }
  itens:     ItemOrcamento[]
  total:     number
  condicoes: string
}

interface OrcamentoState {
  flow:       'orcamento'
  etapa:      'coletando' | 'confirmando'
  messages:   Array<{ role: 'user' | 'assistant'; content: string }>
  orcamento:  OrcamentoData
  started_at: string
}

interface FlowResult {
  responseText: string | string[]
  newState:     OrcamentoState | null
  functionKey:  string
  creditsUsed:  number
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
    const { msg, companyId, state, company } = await req.json()

    if (!msg || !companyId) {
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Busca empresa se não veio no payload
    const { data: companyData } = await supabase
      .from('companies')
      .select('name, slug, orcamento_prompt, logo_url, webapp_theme_color')
      .eq('id', companyId)
      .single()

    const companyInfo = {
      ...(company ?? {}),
      ...companyData,  // dados da edge sobrescrevem os do payload
    }

    if (!companyInfo?.orcamento_prompt) {
      return new Response(JSON.stringify({
        responseText: '❌ Orçamento não configurado para esta empresa.',
        newState: null,
        functionKey: 'orcamento',
        creditsUsed: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Busca produtos para contexto de preços
    const { data: produtos } = await supabase
      .from('produtos_venda')
      .select('nome, preco_venda, unidade, categoria, descricao')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    const result = await processOrcamento({
      msg,
      companyId,
      state: state as OrcamentoState | null,
      company: companyInfo,
      produtos: produtos ?? [],
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('❌ meta-flow-orcamento erro:', err.message)
    return new Response(JSON.stringify(null), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── Processador principal ────────────────────────────────────────────────────

async function processOrcamento({
  msg, companyId, state, company, produtos,
}: {
  msg:      string
  companyId: string
  state:    OrcamentoState | null
  company:  any
  produtos: any[]
}): Promise<FlowResult> {

  const lower = msg.toLowerCase().trim()
  console.log(`📋 processOrcamento — etapa: ${state?.etapa ?? 'início'}, msg: "${msg.substring(0, 60)}"`)

  // Cancelamento explícito
  const CANCEL = ['cancelar', 'cancela', 'desistir', 'não quero', 'nao quero', 'esquece', 'deixa pra lá']
  if (state && CANCEL.some(t => lower.includes(t))) {
    return {
      responseText: '❌ Orçamento cancelado. Quando precisar de um novo, é só me avisar!',
      newState: null,
      functionKey: 'orcamento',
      creditsUsed: 0,
    }
  }

  // Etapa de confirmação — cliente respondeu sim ou não para gerar PDF
  if (state?.etapa === 'confirmando') {
    return await handleConfirmacao(lower, msg, state, company, companyId)
  }

  // Inicializa estado se não existe
  const currentState: OrcamentoState = state ?? {
    flow:      'orcamento',
    etapa:     'coletando',
    messages:  [],
    orcamento: { cliente: { nome: '', contato: '' }, itens: [], total: 0, condicoes: '' },
    started_at: new Date().toISOString(),
  }

  // Acumula a mensagem do usuário no histórico
  const messagesComNova = [
    ...currentState.messages,
    { role: 'user' as const, content: msg },
  ]

  // Chama GPT-4o com JSON mode para processar o orçamento
  const gptResult = await callOrcamentoGPT({
    company,
    produtos,
    messages:          messagesComNova,
    orcamento_context: currentState.orcamento,
  })

  if (!gptResult) {
    return {
      responseText: '❌ Erro ao processar orçamento. Pode repetir?',
      newState: currentState,
      functionKey: 'orcamento',
      creditsUsed: 0,
    }
  }

  // Acumula resposta do assistente no histórico (últimas 20 mensagens)
  const messagesAtualizadas = [
    ...messagesComNova,
    { role: 'assistant' as const, content: gptResult.resposta },
  ].slice(-20)

  const novoOrcamento: OrcamentoData = gptResult.orcamento ?? currentState.orcamento

  // Se orçamento completo → muda para etapa de confirmação
  if (gptResult.completo) {
    const newState: OrcamentoState = {
      ...currentState,
      etapa:     'confirmando',
      messages:  messagesAtualizadas,
      orcamento: novoOrcamento,
    }

  // Gera PDF via API route e salva em companion_downloads
  const linkPdf = await gerarPdfEObterLink(companyId, company, novoOrcamento)

    return {
      responseText: buildRespostaCompleto(gptResult.resposta, novoOrcamento, linkPdf),
      newState,
      functionKey: 'orcamento',
      creditsUsed: 1,
    }
  }

  // Continua coletando
  const newState: OrcamentoState = {
    ...currentState,
    etapa:     'coletando',
    messages:  messagesAtualizadas,
    orcamento: novoOrcamento,
  }

  return {
    responseText: gptResult.resposta,
    newState,
    functionKey: 'orcamento',
    creditsUsed: 1,
  }
}

// ─── Etapa: confirmação (PDF) ─────────────────────────────────────────────────

async function handleConfirmacao(lower: string, msg: string, state: OrcamentoState, company: any, companyId: string): Promise<FlowResult> {
  const SIM = ['sim', 's', 'yes', 'quero', 'pode', 'confirma', 'salvar', 'gerar', 'ok', 'claro', 'vai', 'bora', 'gera']
  const NAO = ['não', 'nao', 'n', 'no', 'agora não', 'agora nao', 'depois', 'cancelar']
  const CORRECAO = ['corrigir', 'corrige', 'alterar', 'altera', 'mudar', 'muda', 'adicionar',
    'adiciona', 'incluir', 'inclui', 'remover', 'remove', 'tirar', 'tira', 'errado',
    'errei', 'esqueci', 'faltou', 'falta', 'na verdade', 'espera', 'perai', 'não não']

  if (SIM.some(t => lower === t || lower.includes(t))) {
    const linkPdf = await gerarPdfEObterLink(state.orcamento.total > 0 ? company.id ?? '' : '', company, state.orcamento)
    return {
      responseText: [
        `📄 *Orçamento gerado!*`,
        ``,
        buildResumoOrcamento(state.orcamento),
        ``,
        `🔗 *Baixe seu orçamento em PDF:*`,
        linkPdf,
        ``,
        `O PDF já inclui o QR Code PIX para pagamento. Qualquer dúvida, pode perguntar!`,
      ].join('\n'),
      newState: null,
      functionKey: 'orcamento',
      creditsUsed: 1,
    }
  }

  if (NAO.some(t => lower === t || lower.includes(t)) || CORRECAO.some(t => lower.includes(t))) {
    return {
      responseText: 'Claro! O que deseja ajustar no orçamento?',
      newState: { ...state, etapa: 'coletando' },
      functionKey: 'orcamento',
      creditsUsed: 0,
    }
  }

  // Não reconheceu — reapresenta resumo sem gerar PDF ainda
  return {
    responseText: [
      `Orçamento finalizado! Deseja salvar em PDF?`,
      ``,
      buildResumoOrcamento(state.orcamento),
      ``,
      `Responda *sim* para gerar ou diga o que deseja ajustar.`,
    ].join('\n'),
    newState: state,
    functionKey: 'orcamento',
    creditsUsed: 0,
  }
}

// ─── GPT-4o com JSON mode ─────────────────────────────────────────────────────

async function callOrcamentoGPT({
  company, produtos, messages, orcamento_context,
}: {
  company:          any
  produtos:         any[]
  messages:         Array<{ role: 'user' | 'assistant'; content: string }>
  orcamento_context: OrcamentoData
}): Promise<{ resposta: string; orcamento: OrcamentoData; completo: boolean } | null> {

  const openaiKey = Deno.env.get('OPENAI_API_KEY')!

  const produtosContext = produtos.length
    ? `\n\nPRODUTOS/SERVIÇOS DISPONÍVEIS:\n` +
      produtos.map((p: any) =>
        `- ${p.nome}${p.categoria ? ` (${p.categoria})` : ''}: R$ ${Number(p.preco_venda).toFixed(2)}/${p.unidade}${p.descricao ? ` — ${p.descricao}` : ''}`
      ).join('\n')
    : ''

const systemPrompt = `Você é um especialista em orçamentos da empresa ${company.name} atendendo via WhatsApp.

${company.orcamento_prompt}${produtosContext}

INSTRUÇÕES:
- Responda SEMPRE em JSON válido com esta estrutura exata:
{
  "resposta": "sua mensagem profissional para o cliente",
  "orcamento": {
    "cliente": { "nome": "", "contato": "" },
    "itens": [{ "descricao": "", "qtd": 1, "valor_unitario": 0, "subtotal": 0 }],
    "total": 0,
    "condicoes": ""
  },
  "completo": false
}
- Use os preços reais dos produtos listados acima quando disponíveis
- Acumule TODOS os itens conforme a conversa avança — nunca perca itens anteriores
- Recalcule o total a cada mensagem
- Seja profissional e detalhado como um vendedor experiente:
  * Faça perguntas para entender melhor a necessidade (dimensões, quantidade, prazo, finalidade)
  * Quando tiver informações e medidas, SEMPRE apresente o valor calculado com detalhes (ex: "Banner 100x50cm = 0,5m² × R$100/m² = R$50,00") e SEMPRE informe que já pode gerar o PDF do orçamento com o Pix, se o cliente desejar.
  * Ao finalizar um item, pergunte se deseja adicionar mais itens ou alterar algo.
  * Só peça os dados do cliente se pedirem no prompt, se não estiver explicito, pode concluir sem informações de contato antes de fechar
  * Use linguagem cordial e comercial
- Quando o orçamento estiver completo e o cliente confirmar que está tudo certo, defina "completo": true
- Quando "completo": true, a "resposta" deve perguntar: "Orçamento finalizado! ✅\\n\\nDeseja receber o PDF com o QR Code PIX para pagamento? Responda *sim* para gerar ou *adicionar* para incluir mais itens."
- NUNCA invente informações
- NUNCA invente informações sobre o pagamento, se no prompt não tiver nenhuma informação sobre pagamento, o pdf gerado já possui o PIX para pagamento automaticamente.
- NUNCA inclua texto fora do JSON`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          // Injeta estado atual do orçamento se já tem itens
          ...(orcamento_context.itens.length > 0
            ? [{ role: 'system' as const, content: `Estado atual: ${JSON.stringify(orcamento_context)}` }]
            : []),
          // Últimas 12 mensagens do histórico
          ...messages.slice(-12),
        ],
      }),
    })

    if (!res.ok) {
      console.error('❌ OpenAI error:', res.status, await res.text())
      return null
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || '{}'

    let resultado: any
    try { resultado = JSON.parse(raw) } catch { return null }

    // Garante estrutura mínima
    if (!resultado.orcamento) {
      resultado.orcamento = { cliente: { nome: '', contato: '' }, itens: [], total: 0, condicoes: '' }
    }
    if (!resultado.orcamento.cliente) resultado.orcamento.cliente = { nome: '', contato: '' }
    if (!Array.isArray(resultado.orcamento.itens)) resultado.orcamento.itens = []

    return {
      resposta:  resultado.resposta || '',
      orcamento: resultado.orcamento,
      completo:  resultado.completo === true,
    }
  } catch (err: any) {
    console.error('❌ callOrcamentoGPT erro:', err.message)
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function gerarPdfEObterLink(
  companyId: string,
  company: any,
  orcamento: OrcamentoData,
): Promise<string> {
  try {
    const res = await fetch('https://minhai.app/api/orcamento/gerar-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, company, orcamento }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { token } = await res.json()
    return `https://minhai.app/download/${token}`
  } catch (err: any) {
    console.error('❌ gerarPdfEObterLink erro:', err.message)
    // Fallback: link direto sem PDF (cliente acessa pelo assistente)
    return `https://minhai.app/ia/${company.slug}`
  }
}

function buildResumoOrcamento(orcamento: OrcamentoData): string {
  const itensTexto = orcamento.itens.length > 0
    ? orcamento.itens
        .map(i => `  • ${i.descricao} x${i.qtd} — R$ ${Number(i.subtotal).toFixed(2).replace('.', ',')}`)
        .join('\n')
    : '  (sem itens)'

  const clienteTexto = orcamento.cliente.nome
    ? `👤 *Cliente:* ${orcamento.cliente.nome}${orcamento.cliente.contato ? ` — ${orcamento.cliente.contato}` : ''}\n`
    : ''

  return [
    `📋 *Resumo do Orçamento:*`,
    ``,
    clienteTexto + itensTexto,
    ``,
    `💰 *Total: R$ ${Number(orcamento.total).toFixed(2).replace('.', ',')}*`,
    orcamento.condicoes ? `\n📝 ${orcamento.condicoes}` : '',
  ].filter(Boolean).join('\n')
}

function buildRespostaCompleto(resposta: string, orcamento: OrcamentoData, linkPdf: string): string {
  return [
    resposta,
    ``,
    buildResumoOrcamento(orcamento),
    ``,
    `📄 *Preview do PDF:*`,
    linkPdf,
  ].join('\n')
}