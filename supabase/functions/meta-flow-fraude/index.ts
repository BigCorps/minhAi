// supabase/functions/meta-flow-fraude/index.ts
// Máquina de estados para identificação de fraude via WhatsApp
// Suporta 3 modos: URL/link, linha digitável de boleto, imagem/PDF
// Segue o mesmo padrão de meta-flow-orcamento

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ─── Tipos ────────────────────────────────────────────────────────────────────

type RiskLevel = 'SEGURO' | 'SUSPEITO' | 'FRAUDE'

interface FraudeData {
  risk_level:    RiskLevel
  score:         number
  type:          string
  indicators:    string[]
  recommendation: string
  details:       string
  url_analyzed?: string
}

interface FraudeState {
  flow:       'fraude'
  etapa:      'aguardando_input' | 'processando' | 'resultado'
  started_at: string
  last_result?: FraudeData
}

interface FlowResult {
  responseText: string | string[]
  newState:     FraudeState | null
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
    const {
      msg,
      companyId,
      state,
      mediaId,
      mimeType,
      authToken,
    } = await req.json()

    if (!companyId) {
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await processFraude({ msg, companyId, state, mediaId, mimeType, authToken })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('❌ meta-flow-fraude erro:', err.message)
    return new Response(JSON.stringify(null), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── Processador principal ────────────────────────────────────────────────────

async function processFraude({
  msg,
  companyId,
  state,
  mediaId,
  mimeType,
  authToken,
}: {
  msg:        string
  companyId:  string
  state:      FraudeState | null
  mediaId?:   string
  mimeType?:  string
  authToken?: string
}): Promise<FlowResult> {

  const lower = (msg ?? '').toLowerCase().trim()
  console.log(`🔍 processFraude — etapa: ${state?.etapa ?? 'início'} | mediaId: ${mediaId ?? 'nenhum'} | msg: "${msg?.substring(0, 60)}"`)

  // Cancelamento explícito
  const CANCEL = ['cancelar', 'cancela', 'sair', 'fechar', 'parar', 'desistir', 'nao quero', 'não quero']
  if (state && CANCEL.some(t => lower.includes(t))) {
    return {
      responseText: '❌ Análise de fraude cancelada. Quando precisar, é só me enviar um link, linha digitável ou imagem suspeita.',
      newState: null,
      functionKey: 'identificar_fraude',
      creditsUsed: 0,
    }
  }

  // ── Se veio mídia (imagem ou PDF) → analisar direto ─────────────────────────
  if (mediaId && authToken) {
    return await handleMediaFraude({ mediaId, mimeType, authToken, companyId })
  }

  // ── Sem mídia: processar texto ───────────────────────────────────────────────

  // Inicializa estado se não existe
  const currentState: FraudeState = state ?? {
    flow:       'fraude',
    etapa:      'aguardando_input',
    started_at: new Date().toISOString(),
  }

  // Resultado da última análise — nova análise a partir de estado 'resultado'
  if (currentState.etapa === 'resultado') {
    // Qualquer mensagem nova reinicia o fluxo
    const novoState: FraudeState = {
      flow:       'fraude',
      etapa:      'aguardando_input',
      started_at: new Date().toISOString(),
    }
    // Processa imediatamente com o novo input
    return await processTexto(msg, lower, companyId, novoState)
  }

  return await processTexto(msg, lower, companyId, currentState)
}

// ─── Processar input de texto (URL ou linha digitável) ────────────────────────

async function processTexto(
  msg: string,
  lower: string,
  companyId: string,
  currentState: FraudeState,
): Promise<FlowResult> {

  // Detectar linha digitável (47 ou 48 dígitos limpos)
  const digits = msg.replace(/[\s.\-]/g, '')
  const isLinhaDigitavel = /^\d{47}$/.test(digits) || /^\d{48}$/.test(digits)

  // Detectar URL
  const urlMatch = msg.match(/https?:\/\/[^\s]+/i) || msg.match(/[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*/i)
  const isUrl = !!urlMatch

  if (!isLinhaDigitavel && !isUrl) {
    // Não reconheceu — pedir input
    return {
      responseText: [
        `🔍 *Identificador de Fraude*`,
        ``,
        `Envie uma das opções abaixo para análise:`,
        ``,
        `🔗 *Link suspeito* — cole a URL completa`,
        `🔢 *Linha digitável* — os 47 dígitos do boleto`,
        `🖼️ *Imagem ou PDF* — foto do boleto, comprovante ou print suspeito`,
        ``,
        `_Ou envie *cancelar* para sair._`,
      ].join('\n'),
      newState: { ...currentState, etapa: 'aguardando_input' },
      functionKey: 'identificar_fraude',
      creditsUsed: 0,
    }
  }

  // ── Linha digitável ──────────────────────────────────────────────────────────
  if (isLinhaDigitavel) {
    console.log(`🔍 Detectada linha digitável: ${digits.slice(0, 10)}...`)
    try {
      const res = await callCameraProcess({
        action:     'fraude_boleto_linha',
        linha:      digits,
        company_id: companyId,
      })

      if (!res.success) throw new Error(res.error ?? 'Falha na análise')

      const fraude: FraudeData = res.fraude
      const newState: FraudeState = {
        flow:        'fraude',
        etapa:       'resultado',
        started_at:  currentState.started_at,
        last_result: fraude,
      }

      return {
        responseText: buildFraudeResponse(fraude),
        newState,
        functionKey: 'identificar_fraude',
        creditsUsed: 2,
      }
    } catch (err: any) {
      return {
        responseText: `❌ Erro ao validar o boleto: ${err.message}\n\nTente novamente ou envie a imagem do boleto.`,
        newState: currentState,
        functionKey: 'identificar_fraude',
        creditsUsed: 0,
      }
    }
  }

  // ── URL ──────────────────────────────────────────────────────────────────────
  const rawUrl = urlMatch![0]
  const normalized = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`

  console.log(`🔍 Detectada URL: ${normalized}`)
  try {
    const res = await callCameraProcess({
      action:     'fraude_url',
      url:        normalized,
      company_id: companyId,
    })

    if (!res.success) throw new Error(res.error ?? 'Falha na análise')

    const fraude: FraudeData = res.fraude
    const newState: FraudeState = {
      flow:        'fraude',
      etapa:       'resultado',
      started_at:  currentState.started_at,
      last_result: fraude,
    }

    const msgs = buildFraudeResponse(fraude)
    if (res.url_fetch_error) {
      const aviso = `⚠️ _Obs: não foi possível acessar o site — análise baseada apenas na URL._`
      const last = Array.isArray(msgs) ? msgs[msgs.length - 1] + '\n\n' + aviso : msgs + '\n\n' + aviso
      return {
        responseText: Array.isArray(msgs) ? [...msgs.slice(0, -1), last] : last,
        newState,
        functionKey: 'identificar_fraude',
        creditsUsed: 2,
      }
    }

    return {
      responseText: msgs,
      newState,
      functionKey: 'identificar_fraude',
      creditsUsed: 2,
    }
  } catch (err: any) {
    return {
      responseText: `❌ Erro ao analisar o link: ${err.message}\n\nTente novamente.`,
      newState: currentState,
      functionKey: 'identificar_fraude',
      creditsUsed: 0,
    }
  }
}

// ─── Processar mídia (imagem ou PDF) ──────────────────────────────────────────

async function handleMediaFraude({
  mediaId,
  mimeType,
  authToken,
  companyId,
}: {
  mediaId:    string
  mimeType?:  string
  authToken:  string
  companyId:  string
}): Promise<FlowResult> {

  console.log(`🖼️ handleMediaFraude — mediaId: ${mediaId} | mimeType: ${mimeType}`)

  try {
    // 1. Buscar URL da mídia na Meta API
    const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!mediaRes.ok) throw new Error(`Meta API mídia: ${mediaRes.status}`)
    const mediaData = await mediaRes.json()
    if (mediaData.error) throw new Error(`Meta API: ${mediaData.error.message}`)

    const mediaUrl: string = mediaData.url
    const fileSize: number = mediaData.file_size ?? 0

    // 2. Limite de 1MB
    const MAX_BYTES = 1 * 1024 * 1024
    if (fileSize > MAX_BYTES) {
      return {
        responseText: [
          `⚠️ *Arquivo muito grande*`,
          ``,
          `O limite para análise de fraude é *1 MB*.`,
          `Seu arquivo tem ${(fileSize / 1024 / 1024).toFixed(1)} MB.`,
          ``,
          `Tente enviar uma imagem menor ou use a linha digitável do boleto.`,
        ].join('\n'),
        newState: null,
        functionKey: 'identificar_fraude',
        creditsUsed: 0,
      }
    }

    // 3. Baixar o arquivo
    const fileRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!fileRes.ok) throw new Error(`Download mídia: ${fileRes.status}`)

    const buffer = new Uint8Array(await fileRes.arrayBuffer())

    // Verificar tamanho real após download (file_size pode não vir)
    if (buffer.byteLength > MAX_BYTES) {
      return {
        responseText: [
          `⚠️ *Arquivo muito grande (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB)*`,
          ``,
          `O limite é 1 MB. Tente uma imagem menor ou use a linha digitável.`,
        ].join('\n'),
        newState: null,
        functionKey: 'identificar_fraude',
        creditsUsed: 0,
      }
    }

    // 4. Converter para base64
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < buffer.length; i += chunkSize) {
      binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize))
    }
    const base64 = btoa(binary)

    // 5. Determinar action: PDF ou imagem
    const isPdf = mimeType === 'application/pdf' ||
      mimeType === 'application/octet-stream' && base64.startsWith('JVBERi0')

    // Para PDF: prefixo não precisa — camera-process detecta via isPdfBase64()
    // Para imagem: não precisa prefixo data:, camera-process recebe base64 puro
    const imagePayload = isPdf
      ? base64  // camera-process detecta JVBERi0 automaticamente
      : base64

    // 6. Chamar camera-process
    const res = await callCameraProcess({
      action:     'fraude',
      image:      imagePayload,
      company_id: companyId,
    })

    if (!res.success) throw new Error(res.error ?? 'Falha na análise')

    const fraude: FraudeData = res.fraude
    const newState: FraudeState = {
      flow:        'fraude',
      etapa:       'resultado',
      started_at:  new Date().toISOString(),
      last_result: fraude,
    }

    return {
      responseText: buildFraudeResponse(fraude),
      newState,
      functionKey: 'identificar_fraude',
      creditsUsed: 2,
    }

  } catch (err: any) {
    console.error('❌ handleMediaFraude erro:', err.message)
    return {
      responseText: `❌ Não foi possível analisar a imagem: ${err.message}\n\nTente reenviar ou use a linha digitável do boleto.`,
      newState: null,
      functionKey: 'identificar_fraude',
      creditsUsed: 0,
    }
  }
}

// ─── Chamar camera-process ────────────────────────────────────────────────────

async function callCameraProcess(payload: Record<string, any>): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000) // GPT Vision pode demorar

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/camera-process`, {
      method: 'POST',
      headers: {
        Authorization:   `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`camera-process ${res.status}: ${errText}`)
    }

    return await res.json()
  } catch (err: any) {
    clearTimeout(timeout)
    throw err
  }
}

// ─── Formatar resposta de fraude para WhatsApp ────────────────────────────────

const RISK_EMOJI: Record<RiskLevel, string> = {
  SEGURO:   '✅',
  SUSPEITO: '⚠️',
  FRAUDE:   '🚨',
}

const RISK_LABEL: Record<RiskLevel, string> = {
  SEGURO:   'Seguro',
  SUSPEITO: 'Suspeito',
  FRAUDE:   'Fraude detectada',
}

const TYPE_LABEL: Record<string, string> = {
  boleto:          'Boleto',
  pix:             'PIX',
  phishing:        'Phishing / Site Falso',
  mensagem_golpe:  'Mensagem Golpe',
  imagem_generica: 'Imagem',
}

function buildFraudeResponse(fraude: FraudeData): string[] {
  const emoji = RISK_EMOJI[fraude.risk_level as RiskLevel] ?? '⚠️'
  const label = RISK_LABEL[fraude.risk_level as RiskLevel] ?? fraude.risk_level
  const tipo  = TYPE_LABEL[fraude.type] ?? fraude.type

  // Mensagem 1: resultado principal
  const msg1Lines = [
    `${emoji} *${label}* — ${tipo}`,
    ``,
    `📊 *Score de risco:* ${fraude.score}/100`,
    ``,
    `📋 *Análise:*`,
    fraude.recommendation,
  ]

  if (fraude.url_analyzed) {
    msg1Lines.push(``, `🔗 _URL analisada: ${fraude.url_analyzed.slice(0, 60)}${fraude.url_analyzed.length > 60 ? '…' : ''}_`)
  }

  // Mensagem 2: indícios + detalhes técnicos (só se tiver conteúdo relevante)
  const hasIndicators = fraude.indicators && fraude.indicators.length > 0
  const hasDetails    = !!fraude.details

  if (!hasIndicators && !hasDetails) {
    return [msg1Lines.join('\n')]
  }

  const msg2Lines: string[] = []

  if (hasIndicators) {
    msg2Lines.push(`🔎 *Indícios encontrados:*`)
    fraude.indicators.forEach(ind => msg2Lines.push(`• ${ind}`))
  }

  if (hasDetails) {
    if (msg2Lines.length > 0) msg2Lines.push(``)
    msg2Lines.push(`🔬 *Detalhes técnicos:*`)
    // Limitar a 400 chars para não estourar mensagem WhatsApp
    const detailsTrimmed = fraude.details.length > 400
      ? fraude.details.slice(0, 397) + '...'
      : fraude.details
    msg2Lines.push(detailsTrimmed)
  }

  msg2Lines.push(``, `_Envie outra imagem, link ou linha digitável para nova análise._`)

  return [msg1Lines.join('\n'), msg2Lines.join('\n')]
}