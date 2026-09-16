// supabase/functions/meta-flow-agenda/index.ts
// Máquina de estados para agendamento conversacional no Meta
//
// v5 — 1 crédito por mensagem respondida (padrão original); fuso horário Brasília corrigido

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 1 crédito por mensagem respondida ao usuário
const CREDITS_POR_AGENDAMENTO = 1

// ─── Helpers de data (fuso São Paulo) ────────────────────────────────────────

function getHojeISO(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function getHojeBR(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatPreco(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

// ─── Extração proativa de data/hora do texto do usuário ──────────────────────

function extrairDataHoraDaMensagem(msg: string, hojeISO: string): { data: string | null; hora: string | null } {
  const lower = msg.toLowerCase()
  const hoje  = new Date(hojeISO + 'T12:00:00')

  let data: string | null = null
  let hora: string | null = null

  // Hora
  const horaMatch = lower.match(/(\d{1,2})[:h](\d{2})?/)
  if (horaMatch) {
    let h = parseInt(horaMatch[1])
    const m = horaMatch[2] ? parseInt(horaMatch[2]) : 0
    if (/da\s*tarde/i.test(msg) && h < 12) h += 12
    if (/da\s*noite/i.test(msg) && h < 12) h += 12
    if (h >= 0 && h < 24) hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  if (/meio[\s-]?dia/i.test(lower)) hora = '12:00'

  // Data
  if (/depois\s*de\s*amanh[ãa]/i.test(lower)) {
    const d = new Date(hoje); d.setDate(d.getDate() + 2)
    data = d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  } else if (/amanh[ãa]/i.test(lower)) {
    const d = new Date(hoje); d.setDate(d.getDate() + 1)
    data = d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  } else if (/\bhoje\b/i.test(lower)) {
    data = hojeISO
  }

  const diasSemana: Record<string, number> = {
    'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2,
    'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6,
  }
  if (!data) {
    for (const [nome, idx] of Object.entries(diasSemana)) {
      if (lower.includes(nome)) {
        const d = new Date(hoje)
        const diff = (idx - d.getDay() + 7) % 7 || 7
        d.setDate(d.getDate() + diff)
        data = d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
        break
      }
    }
  }

  if (!data) {
    const diaSlash = lower.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
    if (diaSlash) {
      const dia = parseInt(diaSlash[1])
      const mes = parseInt(diaSlash[2]) - 1
      const ano = diaSlash[3]
        ? parseInt(diaSlash[3].length === 2 ? '20' + diaSlash[3] : diaSlash[3])
        : hoje.getFullYear()
      const d = new Date(ano, mes, dia, 12, 0, 0)
      if (!isNaN(d.getTime())) data = d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    }
    const diaSo = lower.match(/\bdia\s+(\d{1,2})\b/)
    if (!data && diaSo) {
      const dia = parseInt(diaSo[1])
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), dia, 12, 0, 0)
      if (d < hoje) d.setMonth(d.getMonth() + 1)
      data = d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    }
  }

  return { data, hora }
}

// ─── Consulta proativa de disponibilidade ────────────────────────────────────

async function consultarDisponibilidadeProativa(
  companyId: string,
  dateStr: string,
  horaDesejada: string | null,
  supabase: any,
): Promise<{ horariosOcupados: string[]; contextoDisponibilidade: string }> {

  let horariosOcupados: string[] = []

  try {
    const { data: evResult } = await supabase.functions.invoke('listar-eventos-google', {
      body: {
        company_id: companyId,
        time_min: `${dateStr}T00:00:00`,
        time_max: `${dateStr}T23:59:59`,
      },
    })
    if (evResult?.events?.length) {
      horariosOcupados = (evResult.events as any[]).map((ev: any) => {
        const inicio = new Date(ev.start.dateTime || ev.start.date)
        return `${String(inicio.getHours()).padStart(2, '0')}:${String(inicio.getMinutes()).padStart(2, '0')}${ev.summary ? ` (${ev.summary})` : ''}`
      })
    }
  } catch (e: any) {
    console.warn('⚠️ consultarDisponibilidade erro:', e.message)
    return { horariosOcupados: [], contextoDisponibilidade: '' }
  }

  const todosSlots: string[] = []
  for (let h = 8; h < 18; h++) {
    todosSlots.push(`${String(h).padStart(2, '0')}:00`)
    todosSlots.push(`${String(h).padStart(2, '0')}:30`)
  }
  const slotsLivres = todosSlots.filter(s => !horariosOcupados.some(o => o.startsWith(s)))

  const dataFormatada = new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit',
  })

  let contexto = `\n\n📅 DISPONIBILIDADE JÁ CONSULTADA PARA ${dataFormatada.toUpperCase()}:\n`
  if (horaDesejada) {
    const ocupado = horariosOcupados.some(o => o.startsWith(horaDesejada))
    contexto += `- Horário ${horaDesejada} solicitado: ${ocupado ? '❌ OCUPADO' : '✅ DISPONÍVEL'}\n`
  }
  contexto += slotsLivres.length > 0
    ? `- Horários livres: ${slotsLivres.join(', ')}\n`
    : `- Nenhum horário disponível neste dia.\n`
  if (horariosOcupados.length > 0)
    contexto += `- Horários ocupados: ${horariosOcupados.join(', ')}\n`
  contexto += `⚠️ INSTRUÇÃO: Responda JÁ com esta informação. NÃO diga "vou verificar" — a consulta já foi feita.`

  console.log(`📅 Disponibilidade consultada para ${dateStr}:`, slotsLivres.length, 'livres,', horariosOcupados.length, 'ocupados')
  return { horariosOcupados, contextoDisponibilidade: contexto }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AgendaState {
  flow:      'agenda'
  // coletando  → GPT coletando dados
  // confirmando → aguarda sim/não do cliente
  // cobranca   → agendamento criado, aguarda escolha de pagamento (smart) ou já ofereceu (vendas)
  // aguardando_pix → PIX gerado, aguarda PAGO
  etapa:     'coletando' | 'confirmando' | 'cobranca' | 'aguardando_pix'
  messages:  Array<{ role: 'user' | 'assistant'; content: string }>
  dados: {
    servico:       string
    produto_id:    string | null
    produto_preco: number | null
    nome_cliente:  string
    email_cliente: string
    data:          string   // YYYY-MM-DD
    hora:          string   // HH:MM
    duracao:       number   // minutos
    observacoes:   string
  }
  // Preenchidos após evento criado
  pedido_id:  string | null
  pix_txn_id: string | null
  metodos:    string[]            // métodos ativos da empresa (apenas pix_generate, link_pagamento)
  started_at: string
}

interface FlowResult {
  responseText: string | string[]
  newState:     AgendaState | null
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

    // Dados da empresa (inclui assistant_type)
    const { data: companyData } = await supabase
      .from('companies')
      .select('name, slug, brand_description, business_hours, business_address, assistant_type')
      .eq('id', companyId)
      .single()

    const companyInfo = { ...(company ?? {}), ...companyData }

    // Produtos/serviços ativos
    const { data: produtos } = await supabase
      .from('produtos_venda')
      .select('id, nome, preco_venda, unidade, categoria, descricao')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    // Métodos de pagamento — apenas PIX e Link para o Meta
    const { data: metodosSettings } = await supabase
      .from('company_function_settings')
      .select('function_key, is_enabled')
      .eq('company_id', companyId)
      .in('function_key', ['pix_generate', 'link_pagamento'])

    const metodos: string[] = (metodosSettings ?? [])
      .filter((m: any) => m.is_enabled)
      .map((m: any) => m.function_key)
    const metodosAtivos = metodos.length > 0 ? metodos : ['pix_generate']

    const result = await processAgenda({
      msg,
      companyId,
      state: state as AgendaState | null,
      company: companyInfo,
      produtos: produtos ?? [],
      metodos: metodosAtivos,
      supabase,
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('❌ meta-flow-agenda erro:', err.message)
    return new Response(JSON.stringify(null), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── Processador principal ────────────────────────────────────────────────────

async function processAgenda({
  msg, companyId, state, company, produtos, metodos, supabase,
}: {
  msg:       string
  companyId: string
  state:     AgendaState | null
  company:   any
  produtos:  any[]
  metodos:   string[]
  supabase:  any
}): Promise<FlowResult> {

  const lower = msg.toLowerCase().trim()
  console.log(`📅 processAgenda — etapa: ${state?.etapa ?? 'início'}, msg: "${msg.substring(0, 60)}"`)

  // Cancelamento explícito em qualquer etapa
  const CANCEL = ['cancelar', 'cancela', 'desistir', 'não quero', 'nao quero', 'esquece', 'deixa pra lá']
  if (state && CANCEL.some(t => lower.includes(t))) {
    return {
      responseText: '❌ Agendamento cancelado. Quando quiser marcar, é só me chamar!',
      newState: null,
      functionKey: 'agendar_compromisso',
      creditsUsed: 0,
    }
  }

  // Roteamento por etapa
  if (state?.etapa === 'confirmando') {
    return await handleConfirmacao(lower, msg, state, company, companyId, metodos, supabase)
  }
  if (state?.etapa === 'cobranca') {
    return await handleCobranca(lower, msg, state, companyId, supabase)
  }
  if (state?.etapa === 'aguardando_pix') {
    return await handleAguardandoPix(lower, msg, state, supabase)
  }

  // ── Etapa coletando ───────────────────────────────────────────────────────

    const currentState: AgendaState = state ?? {
    flow:      'agenda',
    etapa:     'coletando',
    messages:  [],
    dados: {
      servico: '', produto_id: null, produto_preco: null,
      nome_cliente: '', email_cliente: '', data: '', hora: '',
      duracao: 60, observacoes: '',
    },
    pedido_id: null, pix_txn_id: null, metodos,
    started_at: new Date().toISOString(),
  }

  const messagesComNova = [
    ...currentState.messages,
    { role: 'user' as const, content: msg },
  ]

  // Pré-consulta proativa ao Calendar
  const hojeISO = getHojeISO()
  const { data: dataNaMensagem, hora: horaNaMensagem } = extrairDataHoraDaMensagem(msg, hojeISO)
  const dataParaConsultar = dataNaMensagem || currentState.dados.data || null
  const horaParaConsultar = horaNaMensagem || currentState.dados.hora || null

  let horariosOcupados: string[] = []
  let contextoDisponibilidade = ''

  if (dataParaConsultar) {
    const r = await consultarDisponibilidadeProativa(companyId, dataParaConsultar, horaParaConsultar, supabase)
    horariosOcupados       = r.horariosOcupados
    contextoDisponibilidade = r.contextoDisponibilidade
    if (dataNaMensagem && dataNaMensagem !== currentState.dados.data) currentState.dados.data = dataNaMensagem
    if (horaNaMensagem && horaNaMensagem !== currentState.dados.hora) currentState.dados.hora = horaNaMensagem
  }

  const gptResult = await callAgendaGPT({
    company, produtos, messages: messagesComNova,
    dados_context: currentState.dados,
    horarios_ocupados: horariosOcupados,
    contexto_disponibilidade: contextoDisponibilidade,
  })

  if (!gptResult) {
    return { responseText: '❌ Erro ao processar. Pode repetir?', newState: currentState, functionKey: 'agendar_compromisso', creditsUsed: 0 }
  }

  const messagesAtualizadas = [
    ...messagesComNova,
    { role: 'assistant' as const, content: gptResult.resposta },
  ].slice(-20)

  const novosDados = gptResult.dados ?? currentState.dados

  if (gptResult.completo) {
    const newState: AgendaState = {
      ...currentState, etapa: 'confirmando',
      messages: messagesAtualizadas, dados: novosDados, metodos,
    }
    return {
      responseText: buildRespostaCompleto(gptResult.resposta, novosDados),
      newState,
      functionKey: 'agendar_compromisso',
      creditsUsed: 1,
    }
  }

  return {
    responseText: gptResult.resposta,
    newState: { ...currentState, etapa: 'coletando', messages: messagesAtualizadas, dados: novosDados, metodos },
    functionKey: 'agendar_compromisso',
    creditsUsed: 1,
  }
}

// ─── Etapa: confirmação (sim/não/corrigir) ────────────────────────────────────

async function handleConfirmacao(
  lower: string, msg: string, state: AgendaState,
  company: any, companyId: string, metodos: string[], supabase: any,
): Promise<FlowResult> {

  const SIM      = ['sim', 's', 'yes', 'confirmar', 'confirma', 'confirme', 'pode', 'ok', 'tudo certo', 'isso', 'correto', 'certo', 'vai', 'bora']
  const NAO      = ['não', 'nao', 'n', 'no', 'agora não', 'agora nao', 'depois', 'cancelar']
  const CORRECAO = ['corrigir', 'corrige', 'alterar', 'altera', 'mudar', 'muda', 'errado', 'errei', 'na verdade', 'espera', 'perai']

  if (CORRECAO.some(t => lower.includes(t)) || NAO.some(t => lower === t || lower.includes(t))) {
    return {
      responseText: 'Claro! O que deseja ajustar no agendamento?',
      newState: { ...state, etapa: 'coletando' },
      functionKey: 'agendar_compromisso',
      creditsUsed: 1,
    }
  }

  if (SIM.some(t => lower === t || lower.includes(t))) {
    return await criarEventoEIniciarCobranca(state, company, companyId, metodos, supabase)
  }

  return {
    responseText: [
      buildResumoAgendamento(state.dados), '',
      'Confirma o agendamento? Responda *sim* ou diga o que deseja ajustar.',
    ].join('\n'),
    newState: state,
    functionKey: 'agendar_compromisso',
      creditsUsed: 1,
  }
}

// ─── Cria evento no Calendar → debita 5 créditos → oferece cobrança ──────────

async function criarEventoEIniciarCobranca(
  state: AgendaState, company: any, companyId: string, metodos: string[], supabase: any,
): Promise<FlowResult> {
  try {
    const { dados } = state

    // Verifica conflito de horário
    try {
      const { data: evCheck } = await supabase.functions.invoke('listar-eventos-google', {
        body: { company_id: companyId, time_min: `${dados.data}T00:00:00`, time_max: `${dados.data}T23:59:59` },
      })
      if (evCheck?.events?.length) {
        const slotDt = new Date(`${dados.data}T${dados.hora}:00-03:00`)
        for (const ev of evCheck.events as any[]) {
          if (!ev.start?.dateTime) continue
          const inicio = new Date(ev.start.dateTime)
          const fim    = new Date(ev.end?.dateTime ?? ev.start.dateTime)
          if (slotDt >= inicio && slotDt < fim) {
            console.warn(`⚠️ Conflito: ${dados.hora} ocupado por "${ev.summary}"`)
            return {
              responseText: [
                `⚠️ O horário *${dados.hora}* já está ocupado${ev.summary ? ` (${ev.summary})` : ''}.`,
                '', 'Por favor, escolha outro horário.',
              ].join('\n'),
              newState: { ...state, etapa: 'coletando', dados: { ...dados, hora: '' } },
              functionKey: 'agendar_compromisso',
              creditsUsed: 0,
            }
          }
        }
      }
    } catch (e: any) { console.warn('⚠️ Verificação de conflito falhou:', e.message) }

    // Monta evento
    const startTime   = new Date(`${dados.data}T${dados.hora}:00-03:00`)
    const endTime     = new Date(startTime.getTime() + dados.duracao * 60 * 1000)
    const nomeServico = dados.produto_nome || dados.servico || 'Agendamento'
    const descricao   = [
      `Serviço: ${nomeServico}`,
      dados.produto_preco ? `Valor: R$ ${dados.produto_preco.toFixed(2).replace('.', ',')}` : '',
      dados.observacoes && dados.observacoes !== 'Nenhuma' ? dados.observacoes : '',
    ].filter(Boolean).join('\n')

    console.log(`📅 Criando evento: "${dados.nome_cliente || nomeServico}" em ${startTime.toISOString()}`)

    const { data: evResult, error: evError } = await supabase.functions.invoke('criar-evento-calendario', {
      body: {
        company_id:  companyId,
        summary:     dados.nome_cliente || nomeServico,
        description: descricao,
        start_time:  startTime.toISOString(),
        end_time:    endTime.toISOString(),
      },
    })

    console.log('📅 criar-evento-calendario:', JSON.stringify(evResult))
    if (evError) console.error('❌ invoke error:', JSON.stringify(evError))

    if (evError || evResult?.success === false) {
      throw new Error(evResult?.speech_text || evResult?.error || evError?.message || 'Erro ao criar evento no Google Calendar')
    }

    const eventId = evResult?.event_id ?? crypto.randomUUID()
    console.log(`✅ Evento criado: ${eventId}`)

    // customer_appointments
    const { error: apptError } = await supabase.from('customer_appointments').insert({
      company_id: companyId, google_event_id: eventId,
      appointment_date: startTime.toISOString(), appointment_end: endTime.toISOString(),
      customer_name: dados.nome_cliente || null, service_type: nomeServico,
      status: 'scheduled',
      notes: dados.observacoes && dados.observacoes !== 'Nenhuma' ? dados.observacoes : null,
    }).maybeSingle()
    if (apptError) console.warn('⚠️ customer_appointments:', apptError.message)

    // Envia emails de confirmação (fire-and-forget — não bloqueia o fluxo)
    enviarEmailsAgendamento(companyId, company, dados, startTime, endTime, supabase).catch(
      (e: any) => console.warn('⚠️ Erro ao enviar emails (não-crítico):', e.message)
    )

    // Registra commission_pending se tem produto/preço
    if (dados.produto_preco && dados.produto_id) {
      const { data: existe } = await supabase
        .from('commission_pending').select('id')
        .eq('company_id', companyId).eq('metodo', 'agendamento')
        .gte('created_at', new Date(Date.now() - 60_000).toISOString())
        .maybeSingle()

      if (!existe) {
        await supabase.from('commission_pending').insert({
          company_id: companyId, pedido_id: null, metodo: 'agendamento',
          valor_venda: dados.produto_preco,
          valor_comissao: dados.produto_preco * 0.10,
          status: 'pendente',
        })
        console.log(`💰 Comissão: R$ ${(dados.produto_preco * 0.10).toFixed(2)}`)
      }
    }

    // ── 5 créditos debitados AQUI — evento criado com sucesso ─────────────
    const dataFormatada = startTime.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long',
    })

    const resumoBase = [
      `✅ *Agendamento confirmado!*`, '',
      buildResumoAgendamento(dados), '',
      `📅 ${dataFormatada} às ${dados.hora}`,
    ].join('\n')

    const temValor      = !!(dados.produto_preco && dados.produto_preco > 0)
    const assistantType = company?.assistant_type ?? 'smart'
    const estadoBase: AgendaState = { ...state, pedido_id: null, pix_txn_id: null, metodos }

    // Sem valor → encerra
    if (!temValor) {
      return {
        responseText: [resumoBase, '', 'Caso precise remarcar ou cancelar, é só me avisar!'].join('\n'),
        newState: null,
        functionKey: 'agendar_compromisso',
        creditsUsed: CREDITS_POR_AGENDAMENTO,
      }
    }

    const preco_cents = Math.round(dados.produto_preco! * 100)

    // Versão 'smart' → pergunta se quer cobrar agora
    if (assistantType !== 'vendas') {
      return {
        responseText: [
          resumoBase, '',
          `💰 *Valor:* ${formatPreco(preco_cents)}`, '',
          `Deseja enviar o link de cobrança agora?`,
          `Responda *sim* para cobrar ou *não* para cobrar depois.`,
        ].join('\n'),
        newState: { ...estadoBase, etapa: 'cobranca' },
        functionKey: 'agendar_compromisso',
        creditsUsed: CREDITS_POR_AGENDAMENTO,
      }
    }

    // Versão 'vendas' → vai direto para opções de pagamento
    const opcoes = buildOpcoesCobranca(metodos, preco_cents)
    return {
      responseText: [resumoBase, '', opcoes].join('\n'),
      newState: { ...estadoBase, etapa: 'cobranca' },
      functionKey: 'agendar_compromisso',
      creditsUsed: CREDITS_POR_AGENDAMENTO,
    }

  } catch (err: any) {
    console.error('❌ criarEventoEIniciarCobranca:', err.message)
    return {
      responseText: `❌ Erro ao criar o agendamento: ${err.message}\n\nVerifique se o Google Calendar está conectado ou tente novamente.`,
      newState: state,
      functionKey: 'agendar_compromisso',
      creditsUsed: 0, // não cobra se falhou
    }
  }
}

// ─── Etapa: cobrança ─────────────────────────────────────────────────────────
// Trata tanto "sim/não" (versão smart) quanto escolha direta de método

async function handleCobranca(
  lower: string, msg: string, state: AgendaState, companyId: string, supabase: any,
): Promise<FlowResult> {

  const metodos     = state.metodos ?? ['pix_generate']
  const preco_cents = Math.round((state.dados.produto_preco ?? 0) * 100)

  const NAO = ['não', 'nao', 'n', 'no', 'depois', 'agora não', 'agora nao', 'dispensar']
  if (NAO.some(t => lower === t || lower.includes(t))) {
    return {
      responseText: `Ok! Cobraremos depois. Até logo! 😊`,
      newState: null,
      functionKey: 'agendar_compromisso',
      creditsUsed: 0,
    }
  }

  // Detecta método explícito
  let metodoDef: string | null = null
  if (lower.includes('pix'))                 metodoDef = 'pix_generate'
  else if (lower.includes('link'))           metodoDef = 'link_pagamento'
  else if (/^\d$/.test(lower.trim())) {
    const idx = parseInt(lower.trim()) - 1
    metodoDef = metodos[idx] ?? null
  }

  // "sim" sem especificar método → usa o primeiro disponível
  const SIM = ['sim', 's', 'yes', 'cobrar', 'cobra', 'quero', 'pode', 'ok', 'bora', 'claro', 'manda']
  if (!metodoDef && SIM.some(t => lower === t || lower.includes(t))) {
    metodoDef = metodos[0]
  }

  if (!metodoDef || !metodos.includes(metodoDef)) {
    // Não reconheceu — reapresenta opções
    return {
      responseText: buildOpcoesCobranca(metodos, preco_cents),
      newState: state,
      functionKey: 'agendar_compromisso',
      creditsUsed: 0,
    }
  }

  // ── PIX ───────────────────────────────────────────────────────────────────
  if (metodoDef === 'pix_generate') {
    const pixRes = await fetch(`${supabaseUrl}/functions/v1/gerar-pix-assistente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ company_id: companyId, amount_cents: preco_cents }),
    })
    const pixData = await pixRes.json()

    if (!pixData.success) {
      return {
        responseText: `❌ Não foi possível gerar o PIX: ${pixData.error ?? 'erro desconhecido'}`,
        newState: state,
        functionKey: 'agendar_compromisso',
        creditsUsed: 0,
      }
    }

    const confirmCode = String(Math.floor(1000 + Math.random() * 9000))
    await supabase.from('pix_transactions')
      .update({ notes: `confirm_code:${confirmCode}` })
      .eq('id', pixData.transaction_id)

    return {
      responseText: [
        pixData.pix_code,
        [
          `💰 *PIX de ${formatPreco(preco_cents)}*`, '',
          buildResumoAgendamento(state.dados), '',
          `🏦 Banco Inter`,
          `⏰ Válido por 30 minutos`, '',
          `✅ Após pagar, responda *PAGO* ou o código *${confirmCode}*`,
        ].join('\n'),
      ],
      newState: { ...state, etapa: 'aguardando_pix', pix_txn_id: pixData.transaction_id },
      functionKey: 'agendar_compromisso',
      creditsUsed: 0,
    }
  }

  // ── Link de pagamento ─────────────────────────────────────────────────────
  if (metodoDef === 'link_pagamento') {
    const { data: comp } = await supabase.from('companies').select('slug').eq('id', companyId).single()
    const linkUrl = `https://minhai.app/pay/${comp?.slug ?? ''}/${preco_cents}`
    return {
      responseText: [
        `🔗 *Link de Pagamento — ${formatPreco(preco_cents)}*`, '',
        buildResumoAgendamento(state.dados), '',
        linkUrl, '',
        `⏰ Válido por 30 minutos`,
        `💳 Aceita cartão e PIX via InfinitePay`,
      ].join('\n'),
      newState: null,
      functionKey: 'agendar_compromisso',
      creditsUsed: 0,
    }
  }

  return {
    responseText: buildOpcoesCobranca(metodos, preco_cents),
    newState: state,
    functionKey: 'agendar_compromisso',
    creditsUsed: 0,
  }
}

// ─── Etapa: aguardando confirmação do PIX ────────────────────────────────────

async function handleAguardandoPix(
  lower: string, msg: string, state: AgendaState, supabase: any,
): Promise<FlowResult> {

  const CONFIRM   = ['pago', 'paguei', 'confirmei', 'feito', 'já paguei', 'ja paguei', 'ok pago']
  const codeMatch = msg.match(/\b(\d{4})\b/)
  const isConfirm = CONFIRM.some(t => lower.includes(t)) || codeMatch

  if (!isConfirm) {
    return {
      responseText: `⏳ Aguardando confirmação do pagamento.\n\nApós pagar, responda *PAGO* ou envie o código de 4 dígitos.`,
      newState: state,
      functionKey: 'agendar_compromisso',
      creditsUsed: 0,
    }
  }

  if (state.pix_txn_id) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/confirmar-pix-assistente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ transaction_id: state.pix_txn_id }),
      })
      const result = await res.json()
      if (!result.success && !result.already_confirmed) {
        return {
          responseText: `⏳ Pagamento ainda não identificado. Aguarde alguns segundos e tente novamente com *PAGO*.`,
          newState: state,
          functionKey: 'agendar_compromisso',
          creditsUsed: 0,
        }
      }
    } catch { /* aceita confirmação manual se edge falhar */ }
  }

  return {
    responseText: [
      `✅ *Pagamento confirmado!*`, '',
      buildResumoAgendamento(state.dados), '',
      `💵 Total: ${formatPreco(Math.round((state.dados.produto_preco ?? 0) * 100))}`, '',
      `Obrigado! 🎉`,
    ].join('\n'),
    newState: null,
    functionKey: 'agendar_compromisso',
    creditsUsed: 0,
  }
}

// ─── Helper: monta mensagem de opções de cobrança ────────────────────────────

function buildOpcoesCobranca(metodos: string[], preco_cents: number): string {
  const LABELS: Record<string, string> = {
    pix_generate:   'PIX (copia e cola)',
    link_pagamento: 'Link de Pagamento (cartão/PIX via InfinitePay)',
  }
  const opcoes = metodos.filter(m => LABELS[m]).map((m, i) => `${i + 1}️⃣ ${LABELS[m]}`).join('\n')

  return [
    `💰 *Cobrança — ${formatPreco(preco_cents)}*`, '',
    `Como prefere pagar?`, '',
    opcoes || `1️⃣ PIX (copia e cola)`, '',
    `Responda com o número ou nome da opção.`,
  ].join('\n')
}

// ─── GPT-4o com JSON mode ─────────────────────────────────────────────────────

async function callAgendaGPT({
  company, produtos, messages, dados_context, horarios_ocupados, contexto_disponibilidade,
}: {
  company:                   any
  produtos:                  any[]
  messages:                  Array<{ role: 'user' | 'assistant'; content: string }>
  dados_context:             AgendaState['dados']
  horarios_ocupados:         string[]
  contexto_disponibilidade?: string
}): Promise<{ resposta: string; dados: AgendaState['dados']; completo: boolean } | null> {

  const openaiKey = Deno.env.get('OPENAI_API_KEY')!
  const hojeISO   = getHojeISO()
  const hojeBR    = getHojeBR()
  const amanha    = new Date(new Date(hojeISO + 'T12:00:00').getTime() + 86400000)
    .toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

  const produtosContext = produtos.length
    ? '\n\nSERVIÇOS/PRODUTOS DISPONÍVEIS:\n' +
      produtos.map((p: any) =>
        `- ${p.nome}${p.categoria ? ` (${p.categoria})` : ''}: R$ ${Number(p.preco_venda).toFixed(2)}${p.descricao ? ` — ${p.descricao}` : ''} [id: ${p.id}]`
      ).join('\n')
    : ''

  const slotsValidos: string[] = []
  for (let h = 8; h < 18; h++) {
    slotsValidos.push(`${String(h).padStart(2, '0')}:00`)
    slotsValidos.push(`${String(h).padStart(2, '0')}:30`)
  }
  const slotsDisponiveis = slotsValidos.filter(s => !horarios_ocupados.some(o => o.startsWith(s)))

  const ocupadosContext = horarios_ocupados.length
    ? `\n\nHORÁRIOS OCUPADOS: ${horarios_ocupados.join(', ')} — NÃO sugira estes`
    : ''
  const slotsContext = `\n\nHORÁRIOS VÁLIDOS (08h–18h, 30min): ${slotsDisponiveis.join(', ')}`

  const proximoPasso = !dados_context.servico
    ? 'Serviço ou tipo de compromisso desejado'
    : !dados_context.nome_cliente
    ? 'Nome completo do cliente'
    : !dados_context.email_cliente
    ? 'Email do cliente (para enviar a confirmação do agendamento)'
    : !dados_context.data
    ? 'Data desejada para o agendamento'
    : !dados_context.hora
    ? `Horário desejado${horarios_ocupados.length ? ` (ocupados: ${horarios_ocupados.join(', ')})` : ''}`
    : !dados_context.observacoes
    ? 'Observações (ou cliente diz "sem observações" para pular)'
    : 'Todos os dados coletados — gerar confirmação'

  const statusAtual = [
    (dados_context.produto_nome || dados_context.servico)
      ? `✅ Serviço: ${dados_context.produto_nome || dados_context.servico}${dados_context.produto_preco ? ` (R$ ${dados_context.produto_preco})` : ''}`
      : '❌ Serviço: não informado',
    dados_context.nome_cliente  ? `✅ Nome: ${dados_context.nome_cliente}` : '❌ Nome: não informado',
    dados_context.email_cliente ? `✅ Email: ${dados_context.email_cliente}` : '❌ Email: não informado',
    dados_context.data          ? `✅ Data: ${dados_context.data}` : '❌ Data: não informada',
    dados_context.hora         ? `✅ Hora: ${dados_context.hora}` : '❌ Hora: não informada',
    dados_context.observacoes  ? `✅ Obs: ${dados_context.observacoes}` : '❌ Observações: não informadas',
  ].join('\n')

  const systemPrompt = `Você é o Gestor de Agenda da empresa ${company.name} atendendo via WhatsApp.

${company.brand_description ? company.brand_description + '\n' : ''}${company.business_hours ? `Horário: ${company.business_hours}\n` : ''}${produtosContext}${ocupadosContext}${slotsContext}${contexto_disponibilidade ?? ''}

⚠️ DATA DE HOJE: ${hojeISO} (${hojeBR}) — Amanhã = ${amanha}
NUNCA use datas anteriores a ${hojeISO}.

STATUS ATUAL:
${statusAtual}

PRÓXIMA INFORMAÇÃO A COLETAR: ${proximoPasso}

INSTRUÇÕES:
- Responda SEMPRE em JSON válido com esta estrutura:
{
  "resposta": "mensagem para o cliente",
  "dados": {
    "servico": "",
    "produto_id": null,
    "produto_preco": null,
    "nome_cliente": "",
    "email_cliente": "",
    "data": "",
    "hora": "",
    "duracao": 60,
    "observacoes": ""
  },
  "completo": false
}
- Colete UMA informação por vez: Serviço → Nome → Data → Hora → Observações
- Ao selecionar produto do catálogo, preencha produto_id, produto_nome e produto_preco
- "sem observações" ou "nada" → observacoes = "Nenhuma"
- Horários apenas entre 08:00 e 18:00, intervalos de 30 minutos
- NUNCA sugira horários ocupados
- data: YYYY-MM-DD | hora: HH:MM
- Quando tudo coletado: "completo": true + resumo pedindo confirmação
- Máximo 3 linhas por resposta
- NUNCA inclua texto fora do JSON`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(dados_context.servico || dados_context.produto_nome
            ? [{ role: 'system' as const, content: `Estado atual: ${JSON.stringify(dados_context)}` }]
            : []),
          ...messages.slice(-12),
        ],
      }),
    })

    if (!res.ok) {
      console.error('❌ OpenAI error:', res.status, await res.text())
      return null
    }

    const data     = await res.json()
    const raw      = data.choices?.[0]?.message?.content || '{}'
    let resultado: any
    try { resultado = JSON.parse(raw) } catch { console.error('❌ JSON.parse falhou:', raw); return null }

    if (!resultado.dados) resultado.dados = dados_context
    resultado.dados = { ...dados_context, ...resultado.dados }
    if (!resultado.dados.produto_nome && dados_context.produto_nome)
      resultado.dados.produto_nome = dados_context.produto_nome

    return { resposta: resultado.resposta || '', dados: resultado.dados, completo: resultado.completo === true }

  } catch (err: any) {
    console.error('❌ callAgendaGPT:', err.message)
    return null
  }
}

// ─── Envio de emails de confirmação ──────────────────────────────────────────

async function enviarEmailsAgendamento(
  companyId: string,
  company: any,
  dados: AgendaState['dados'],
  startTime: Date,
  endTime: Date,
  supabase: any,
): Promise<void> {

  // Busca access token do Google (com refresh automático via google_accounts)
  const { data: googleAccount } = await supabase
    .from('google_accounts')
    .select('access_token, google_email')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle()

  if (!googleAccount?.access_token) {
    console.warn('⚠️ Google Account não encontrada — emails não enviados')
    return
  }

  const accessToken  = googleAccount.access_token
  const empresaEmail = googleAccount.google_email
  const companyName  = company?.name ?? 'Empresa'

  const dataFormatada = startTime.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
  const horaInicio = startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const horaFim    = endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const buildHtml = (titulo: string, subtitulo: string, paraCliente: boolean) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .header { background: #10b981; padding: 30px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px; }
    .content { padding: 32px 30px; }
    .card { background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .row:last-child { border: none; }
    .label { color: #64748b; }
    .value { color: #0f172a; font-weight: 600; }
    .footer { background: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; }
    .footer a { color: #4a5568; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 ${titulo}</h1>
      <p>${subtitulo}</p>
    </div>
    <div class="content">
      <div class="card">
        ${dados.nome_cliente ? `<div class="row"><span class="label">👤 Cliente</span><span class="value">${dados.nome_cliente}</span></div>` : ''}
        <div class="row"><span class="label">🔧 Serviço</span><span class="value">${dados.servico || 'Agendamento'}</span></div>
        <div class="row"><span class="label">📅 Data</span><span class="value">${dataFormatada}</span></div>
        <div class="row"><span class="label">🕐 Horário</span><span class="value">${horaInicio} – ${horaFim}</span></div>
        ${dados.produto_preco ? `<div class="row"><span class="label">💰 Valor</span><span class="value">R$ ${dados.produto_preco.toFixed(2).replace('.', ',')}</span></div>` : ''}
        ${dados.observacoes && dados.observacoes !== 'Nenhuma' ? `<div class="row"><span class="label">📝 Obs</span><span class="value">${dados.observacoes}</span></div>` : ''}
      </div>
      ${paraCliente
        ? `<p style="font-size:14px;color:#64748b;margin:0">Em caso de dúvidas ou para remarcar, entre em contato com <strong>${companyName}</strong>.</p>`
        : `<p style="font-size:14px;color:#64748b;margin:0">Novo agendamento registrado no Google Calendar.</p>`
      }
    </div>
    <div class="footer">
      <p style="margin:0">Agendamento via <a href="https://minhai.app">minhAi</a></p>
    </div>
  </div>
</body>
</html>`

  const sendEmail = async (to: string, subject: string, html: string) => {
    const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`
    const raw = [
      `From: ${companyName} <${empresaEmail}>`,
      `To: ${to}`,
      `Subject: ${subjectEncoded}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      html,
    ].join('\r\n')

    const encoder  = new TextEncoder()
    const base64   = btoa(String.fromCharCode(...encoder.encode(raw)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: base64 }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || 'Erro Gmail API')
    }
    const result = await res.json()
    console.log(`✅ Email enviado para ${to}: messageId=${result.id}`)
  }

  // Email para o cliente
  if (dados.email_cliente) {
    await sendEmail(
      dados.email_cliente,
      `✅ Agendamento confirmado — ${dados.servico || companyName}`,
      buildHtml('Agendamento Confirmado!', `Olá ${dados.nome_cliente || 'cliente'}, seu horário está reservado.`, true)
    )
  }

  // Email para a empresa (mesmo remetente e destinatário — Gmail aceita)
  await sendEmail(
    empresaEmail,
    `📅 Novo agendamento — ${dados.nome_cliente || 'cliente'}`,
    buildHtml(
      'Novo Agendamento Recebido',
      `Um novo horário foi marcado via minhAi.`,
      false
    )
  )
}

// ─── Helpers de texto ─────────────────────────────────────────────────────────

function buildResumoAgendamento(dados: AgendaState['dados']): string {
  const nomeServico = dados.produto_nome || dados.servico
  const lines = ['📋 *Resumo do Agendamento:*', '']
  if (dados.nome_cliente)  lines.push(`👤 *Cliente:* ${dados.nome_cliente}`)
  if (nomeServico)         lines.push(`🔧 *Serviço:* ${nomeServico}`)
  if (dados.data && dados.hora) {
    const dataFormatada = new Date(`${dados.data}T${dados.hora}:00`).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit',
    })
    lines.push(`📅 *Data:* ${dataFormatada} às ${dados.hora}`)
  }
  if (dados.duracao)       lines.push(`⏱️ *Duração:* ${dados.duracao >= 60 ? `${dados.duracao / 60}h` : `${dados.duracao}min`}`)
  if (dados.produto_preco) lines.push(`💰 *Valor:* R$ ${dados.produto_preco.toFixed(2).replace('.', ',')}`)
  if (dados.observacoes && dados.observacoes !== 'Nenhuma') lines.push(`📝 *Obs:* ${dados.observacoes}`)
  return lines.join('\n')
}

function buildRespostaCompleto(resposta: string, dados: AgendaState['dados']): string {
  return [
    resposta, '',
    buildResumoAgendamento(dados), '',
    'Responda *sim* para confirmar ou diga o que deseja ajustar.',
  ].join('\n')
}