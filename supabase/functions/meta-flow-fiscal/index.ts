// supabase/functions/meta-flow-fiscal/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ItemNota {
  nome:           string
  quantidade:     number
  valor_unitario: number
  subtotal:       number
  unidade:        string
  ncm?:           string
  cfop?:          number
  origem_produto?: number
  produto_id?:    string
  ncm_sugerido?:  boolean
}

interface DadosNota {
  destinatario: {
    nome:       string
    cpf_cnpj?:  string
    email?:     string
    telefone?:  string
    cep?:       string
    logradouro?: string
    numero?:    string
    bairro?:    string
    cidade?:    string
    uf?:        string
  }
  itens: ItemNota[]
}

interface FiscalState {
  flow:       'fiscal'
  etapa:      'coletando' | 'confirmando'
  messages:   Array<{ role: 'user' | 'assistant'; content: string }>
  dados:      DadosNota
  started_at: string
}

interface FlowResult {
  responseText: string | string[]
  newState:     FiscalState | null
  functionKey:  string
  creditsUsed:  number
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { msg, companyId, state, company } = await req.json()

    if (!msg || !companyId) {
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: companyData } = await supabase
      .from('companies')
      .select('name, slug, nfe_plano, nfe_ativo, nfe_crt, nfe_cnae, brasilnfe_token')
      .eq('id', companyId)
      .single()

    if (!companyData?.nfe_ativo || !companyData?.brasilnfe_token) {
      return new Response(JSON.stringify({
        responseText: '❌ Emissão fiscal não está configurada para esta empresa.',
        newState: null,
        functionKey: 'emitir_nota',
        creditsUsed: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Buscar produtos com dados fiscais para contexto da IA
    const { data: produtos } = await supabase
      .from('produtos_venda')
      .select(`
        id, nome, preco_venda, unidade, ean,
        produtos_fiscal ( ncm, cfop, origem_produto )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    const result = await processFiscal({
      msg,
      companyId,
      state: state as FiscalState | null,
      company: { ...company, ...companyData },
      produtos: produtos ?? [],
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('❌ meta-flow-fiscal erro:', err.message)
    return new Response(JSON.stringify(null), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function processFiscal({
  msg, companyId, state, company, produtos,
}: {
  msg:       string
  companyId: string
  state:     FiscalState | null
  company:   any
  produtos:  any[]
}): Promise<FlowResult> {
  const lower = msg.toLowerCase().trim()
  console.log(`🧾 processFiscal — etapa: ${state?.etapa ?? 'início'}, msg: "${msg.substring(0, 60)}"`)

  // Cancelamento
  const CANCEL = ['cancelar', 'cancela', 'desistir', 'não quero', 'nao quero', 'esquece']
  if (state && CANCEL.some(t => lower.includes(t))) {
    return {
      responseText: '❌ Emissão cancelada. Quando precisar emitir uma nota, é só me avisar!',
      newState: null,
      functionKey: 'emitir_nota',
      creditsUsed: 0,
    }
  }

  // Etapa de confirmação
  if (state?.etapa === 'confirmando') {
    return await handleConfirmacao(lower, state, company, companyId)
  }

  const currentState: FiscalState = state ?? {
    flow:       'fiscal',
    etapa:      'coletando',
    messages:   [],
    dados:      { destinatario: { nome: '' }, itens: [] },
    started_at: new Date().toISOString(),
  }

  const messagesComNova = [
    ...currentState.messages,
    { role: 'user' as const, content: msg },
  ]

  const gptResult = await callFiscalGPT({
    company,
    produtos,
    messages:      messagesComNova,
    dados_context: currentState.dados,
  })

  if (!gptResult) {
    return {
      responseText: '❌ Erro ao processar. Pode repetir?',
      newState: currentState,
      functionKey: 'emitir_nota',
      creditsUsed: 0,
    }
  }

  const messagesAtualizadas = [
    ...messagesComNova,
    { role: 'assistant' as const, content: gptResult.resposta },
  ].slice(-20)

  const novosDados: DadosNota = gptResult.dados ?? currentState.dados

  if (gptResult.pronto) {
    const newState: FiscalState = {
      ...currentState,
      etapa:    'confirmando',
      messages: messagesAtualizadas,
      dados:    novosDados,
    }
    return {
      responseText: [
        gptResult.resposta,
        '',
        buildResumoDados(novosDados),
        '',
        'Responda *sim* para emitir ou diga o que deseja ajustar.',
      ].join('\n'),
      newState,
      functionKey: 'emitir_nota',
      creditsUsed: 1,
    }
  }

  return {
    responseText: gptResult.resposta,
    newState: {
      ...currentState,
      etapa:    'coletando',
      messages: messagesAtualizadas,
      dados:    novosDados,
    },
    functionKey: 'emitir_nota',
    creditsUsed: 1,
  }
}

async function handleConfirmacao(
  lower: string,
  state: FiscalState,
  company: any,
  companyId: string,
): Promise<FlowResult> {
  const SIM     = ['sim', 's', 'yes', 'confirma', 'pode', 'emitir', 'emite', 'ok', 'claro', 'vai', 'bora']
  const CORRECAO = ['corrigir', 'corrige', 'alterar', 'mudar', 'adicionar', 'remover', 'errado', 'errei', 'faltou', 'na verdade']

  if (CORRECAO.some(t => lower.includes(t))) {
    return {
      responseText: 'Claro! O que deseja ajustar na nota?',
      newState: { ...state, etapa: 'coletando' },
      functionKey: 'emitir_nota',
      creditsUsed: 0,
    }
  }

  if (!SIM.some(t => lower === t || lower.includes(t))) {
    return {
      responseText: [
        'Nota pronta para emissão! Deseja emitir agora?',
        '',
        buildResumoDados(state.dados),
        '',
        'Responda *sim* para emitir ou diga o que deseja ajustar.',
      ].join('\n'),
      newState: state,
      functionKey: 'emitir_nota',
      creditsUsed: 0,
    }
  }

  // Confirmar — emitir via edge emitir-nota
  console.log('🧾 Emitindo nota fiscal via edge...')
  try {
    const supabase = createClient(supabaseUrl, serviceKey)

    const { dados } = state
    const valorTotal = dados.itens.reduce((acc, i) => acc + i.subtotal, 0)

    const body: Record<string, unknown> = {
      company_id:      companyId,
      valor_total:     valorTotal,
      forma_pagamento: 'pix',
      enviar_email:    !!dados.destinatario.email,
      destinatario_nome:       dados.destinatario.nome      || undefined,
      destinatario_cpf_cnpj:   dados.destinatario.cpf_cnpj  || undefined,
      destinatario_email:      dados.destinatario.email     || undefined,
      destinatario_telefone:   dados.destinatario.telefone  || undefined,
      destinatario_cep:        dados.destinatario.cep       || undefined,
      destinatario_logradouro: dados.destinatario.logradouro || undefined,
      destinatario_numero:     dados.destinatario.numero    || undefined,
      destinatario_bairro:     dados.destinatario.bairro    || undefined,
      destinatario_cidade:     dados.destinatario.cidade    || undefined,
      destinatario_uf:         dados.destinatario.uf        || undefined,
    }

    // NFS-e usa descricao_servico; NF-e/NFC-e usa itens
    if (company.nfe_plano === 'nfse') {
      body.descricao_servico = dados.itens.map(i => i.nome).join(', ')
    } else {
      body.itens = dados.itens.map(i => ({
        nome:           i.nome,
        quantidade:     i.quantidade,
        valor_unitario: i.valor_unitario,
        valor_total:    i.subtotal,
        unidade:        i.unidade || 'UN',
        ncm:            i.ncm    || '00000000',
        cfop:           i.cfop   || 5102,
        origem_produto: i.origem_produto ?? 0,
        produto_id:     i.produto_id,
      }))
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/emitir-nota`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(body),
    })

    const result = await res.json()

    if (!result.success) {
      return {
        responseText: [
          '❌ Nota rejeitada pela SEFAZ:',
          result.detalhe_rejeicao ?? result.error ?? 'Erro desconhecido',
          '',
          'Deseja corrigir algum dado e tentar novamente?',
        ].join('\n'),
        newState: { ...state, etapa: 'coletando' },
        functionKey: 'emitir_nota',
        creditsUsed: 0,
      }
    }

    const numero = result.numero ?? result.numero_nfse ?? '—'
    const chave  = result.chave_acesso ?? result.cod_verificacao ?? '—'

    return {
      responseText: [
        '✅ *Nota fiscal emitida com sucesso!*',
        '',
        `📄 *Número:* ${numero}`,
        `🔑 *Chave:* ${chave.substring(0, 20)}...`,
        '',
        result.aguardando_processamento
          ? '⏳ A nota está sendo processada pela prefeitura. Você receberá a confirmação em breve.'
          : '🟢 Nota autorizada pela SEFAZ.',
      ].join('\n'),
      newState: null,
      functionKey: 'emitir_nota',
      creditsUsed: 0,
    }

  } catch (err: any) {
    console.error('❌ Erro ao emitir nota:', err.message)
    return {
      responseText: '❌ Erro ao emitir a nota. Tente novamente ou acesse o dashboard para emitir manualmente.',
      newState: { ...state, etapa: 'coletando' },
      functionKey: 'emitir_nota',
      creditsUsed: 0,
    }
  }
}

async function callFiscalGPT({
  company, produtos, messages, dados_context,
}: {
  company:       any
  produtos:      any[]
  messages:      Array<{ role: 'user' | 'assistant'; content: string }>
  dados_context: DadosNota
}): Promise<{ resposta: string; dados: DadosNota; pronto: boolean } | null> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')!

  const plano    = company.nfe_plano ?? 'nfe'
  const isNFSe   = plano === 'nfse'
  const tipoNota = isNFSe ? 'NFS-e (Nota Fiscal de Serviço)' : 'NF-e / NFC-e (Nota Fiscal de Produto)'

  const produtosContext = produtos.length
    ? '\n\nPRODUTOS/SERVIÇOS CADASTRADOS:\n' +
      produtos.map((p: any) => {
        const fiscal = Array.isArray(p.produtos_fiscal) ? p.produtos_fiscal[0] : null
        return `- ${p.nome} (R$ ${Number(p.preco_venda).toFixed(2)}/${p.unidade})` +
               (fiscal?.ncm ? ` [NCM: ${fiscal.ncm}, CFOP: ${fiscal.cfop}]` : ' [sem NCM cadastrado]')
      }).join('\n')
    : ''

  const systemPrompt = `Você é um assistente fiscal da empresa ${company.name} atendendo via WhatsApp.
Tipo de nota configurada: ${tipoNota}

MISSÃO: Coletar os dados necessários para emitir uma ${tipoNota} e confirmar com o cliente antes de emitir.

DADOS OBRIGATÓRIOS:
- Nome do destinatário
- CPF ou CNPJ (obrigatório para NF-e modelo 55)
${isNFSe
  ? '- Descrição do serviço prestado\n- Valor total'
  : '- Itens: nome, quantidade, valor unitário, unidade\n- NCM de cada produto (8 dígitos) — use os cadastrados acima quando disponível'
}

REGRAS:
- Seja conversacional e direto
- Quando tiver todos os dados obrigatórios, defina "pronto": true e peça confirmação
- Para NF-e: se produto não tiver NCM cadastrado, informe e peça ao cliente ou use '00000000' como placeholder
- Nunca invente CPF/CNPJ ou valores
- Acumule dados entre mensagens — nunca perca o que já foi informado${produtosContext}

FORMATO DE RESPOSTA — JSON válido:
{
  "resposta": "mensagem para o cliente",
  "pronto": false,
  "dados": {
    "destinatario": {
      "nome": "",
      "cpf_cnpj": "",
      "email": "",
      "telefone": "",
      "cep": "",
      "logradouro": "",
      "numero": "",
      "bairro": "",
      "cidade": "",
      "uf": ""
    },
    "itens": [
      {
        "nome": "",
        "quantidade": 1,
        "valor_unitario": 0,
        "subtotal": 0,
        "unidade": "UN",
        "ncm": "00000000",
        "cfop": 5102,
        "origem_produto": 0,
        "produto_id": null
      }
    ]
  }
}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model:           'gpt-4o',
        response_format: { type: 'json_object' },
        max_tokens:      800,
        temperature:     0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(dados_context.itens.length > 0 || dados_context.destinatario.nome
            ? [{ role: 'system' as const, content: `Dados já coletados: ${JSON.stringify(dados_context)}` }]
            : []),
          ...messages.slice(-12),
        ],
      }),
    })

    if (!res.ok) {
      console.error('❌ OpenAI error:', res.status, await res.text())
      return null
    }

    const data   = await res.json()
    const raw    = data.choices?.[0]?.message?.content || '{}'
    let resultado: any
    try { resultado = JSON.parse(raw) } catch { return null }

    if (!resultado.dados) {
      resultado.dados = { destinatario: { nome: '' }, itens: [] }
    }
    if (!resultado.dados.destinatario) resultado.dados.destinatario = { nome: '' }
    if (!Array.isArray(resultado.dados.itens)) resultado.dados.itens = []

    return {
      resposta: resultado.resposta || '',
      dados:    resultado.dados,
      pronto:   resultado.pronto === true,
    }
  } catch (err: any) {
    console.error('❌ callFiscalGPT erro:', err.message)
    return null
  }
}

function buildResumoDados(dados: DadosNota): string {
  const dest = dados.destinatario
  const destinatarioTexto = dest.nome
    ? `👤 *Destinatário:* ${dest.nome}${dest.cpf_cnpj ? ` — ${dest.cpf_cnpj}` : ''}`
    : ''

  const itensTexto = dados.itens.length > 0
    ? dados.itens.map(i =>
        `  • ${i.nome} x${i.quantidade} — R$ ${Number(i.subtotal).toFixed(2).replace('.', ',')}`
      ).join('\n')
    : '  (sem itens)'

  const total = dados.itens.reduce((acc, i) => acc + i.subtotal, 0)

  return [
    '🧾 *Resumo da Nota:*',
    '',
    destinatarioTexto,
    itensTexto,
    '',
    `💰 *Total: R$ ${total.toFixed(2).replace('.', ',')}*`,
  ].filter(Boolean).join('\n')
}