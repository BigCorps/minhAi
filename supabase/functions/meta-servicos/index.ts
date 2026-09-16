// supabase/functions/meta-servicos/index.ts
// Clima, Notícias, Rastreio Correios, Tradução, Chamar Gerente,
// Gerar QR Code, Criar Nota

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase    = createClient(supabaseUrl, serviceKey)

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
    const { msg, msgLower, connection, companyId, company } = await req.json()
    const result = await detectAndRun(msg, msgLower, connection, companyId, company)
    return Response.json(result)
  } catch (err: any) {
    console.error('❌ meta-servicos erro:', err.message)
    return Response.json(null)
  }
})

async function detectAndRun(
  msg: string,
  msgLower: string,
  connection: any,
  companyId: string,
  company: any
) {

  // ── CLIMA E TEMPO ─────────────────────────────────────────────────────
  if (connection.clima_tempo_enabled === true) {
    const climaTriggers = ['clima','tempo','temperatura','vai chover','previsão','previsao','chuva','frio','calor','céu','ceu','meteorologia']
    if (climaTriggers.some(t => msgLower.includes(t))) {
      console.log('🌤️ Rota: Clima e Tempo')
      try {
        const cidadeMatch = msg.match(/(?:em|de|para|no|na)\s+([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)*)/i)
        const cidade = cidadeMatch?.[1]?.trim()
          || extrairCidadeDoEndereco(company.business_address)
          || 'São Paulo'

        const res = await fetch(`${supabaseUrl}/functions/v1/clima-tempo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ city: cidade, unit: 'metric' })
        })

        if (!res.ok) throw new Error('Serviço de clima indisponível')
        const d = await res.json()
        if (d.error) throw new Error(d.error)

        const c = d.current
        const emoji = c.description.includes('chuva') ? '🌧️'
          : c.description.includes('nublado') ? '☁️'
          : c.description.includes('nuvens') ? '⛅'
          : c.description.includes('neve') ? '❄️'
          : '☀️'

        const linhas = [
          `${emoji} *Clima em ${d.city}*`,
          ``,
          `🌡️ Agora: ${c.temp}°C (sensação ${c.feels_like}°C)`,
          `📊 Min/Máx: ${c.temp_min}°C / ${c.temp_max}°C`,
          `💧 Umidade: ${c.humidity}%`,
          `🌬️ Vento: ${c.wind_speed} km/h`,
          `🌂 Chuva: ${c.rain_chance}%`,
          `☁️ ${c.description.charAt(0).toUpperCase() + c.description.slice(1)}`,
        ]

        if (d.forecast?.length > 0) {
          linhas.push(``, `📅 *Próximos dias:*`)
          for (const f of d.forecast.slice(0, 3)) {
            const data = new Date(f.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
            linhas.push(`• ${data}: ${Math.round(f.temp_min)}°/${Math.round(f.temp_max)}°C — ${f.description}`)
          }
        }

        return { responseText: linhas.join('\n'), functionKey: 'clima_tempo', creditsUsed: 1 }
      } catch (e: any) {
        return { responseText: `❌ Não consegui obter o clima: ${e.message}`, functionKey: 'clima_tempo', creditsUsed: 0 }
      }
    }
  }

  // ── VER NOTÍCIAS ──────────────────────────────────────────────────────
  if (connection.ver_noticias_enabled === true) {
    const noticiasTriggers = ['notícias','noticias','manchetes','novidades','últimas notícias','ultimas noticias','news','jornal']
    if (noticiasTriggers.some(t => msgLower.includes(t))) {
      console.log('📰 Rota: Ver Notícias')
      try {
        const res = await fetch('https://g1.globo.com/rss/g1/', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        const xml = await res.text()

        const items = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)]
          .slice(1, 6)
          .map((m, i) => `${i + 1}. ${m[1].trim()}`)

        if (items.length === 0) throw new Error('Sem notícias disponíveis')

        const texto = [
          `📰 *Últimas Notícias — G1*`,
          ``,
          ...items,
          ``,
          `🔗 Leia mais: g1.globo.com`,
        ].join('\n')

        return { responseText: texto, functionKey: 'ver_noticias', creditsUsed: 1 }
      } catch (e: any) {
        return { responseText: `❌ Não consegui carregar as notícias: ${e.message}`, functionKey: 'ver_noticias', creditsUsed: 0 }
      }
    }
  }

  // ── RASTREIO CORREIOS ─────────────────────────────────────────────────
  if (connection.rastreio_enabled === true) {
    const rastreioTriggers = ['rastrear','rastreio','rastreamento','correios','encomenda','pacote','objeto postal','entrega']
    const codigoMatch = msg.match(/\b([A-Z]{2}\d{9}[A-Z]{2})\b/i)
    const hasTrigger  = rastreioTriggers.some(t => msgLower.includes(t))

    if (hasTrigger && codigoMatch) {
      console.log('📦 Rota: Rastreio Correios')
      try {
        const codigo = codigoMatch[1].toUpperCase()
        const res = await fetch(
          `https://api.linketrack.com/track/json?user=teste&token=1abcd00b2731640a886600a0be144361a8b0d5ae2b94db55f54af7aa6882e3e&codigo=${codigo}`
        )

        if (!res.ok) throw new Error('Serviço de rastreio indisponível')
        const data = await res.json()

        if (!data.eventos || data.eventos.length === 0) {
          return {
            responseText: `📦 *Rastreio: ${codigo}*\n\n📋 Nenhuma movimentação encontrada ainda.\nO objeto pode estar em processamento nos Correios.`,
            functionKey: 'rastreio_correios',
            creditsUsed: 1
          }
        }

        const eventos = data.eventos.slice(0, 3).map((e: any) =>
          `📍 ${e.data} ${e.hora}\n    ${e.descricao}${e.local ? ` — ${e.local}` : ''}`
        )

        const texto = [
          `📦 *Rastreio: ${codigo}*`,
          `📊 Status: ${data.status || 'Em trânsito'}`,
          ``,
          ...eventos,
        ].join('\n')

        return { responseText: texto, functionKey: 'rastreio_correios', creditsUsed: 1 }
      } catch (e: any) {
        return { responseText: `❌ Erro no rastreio: ${e.message}`, functionKey: 'rastreio_correios', creditsUsed: 0 }
      }
    }

    if (hasTrigger && !codigoMatch) {
      return {
        responseText: `📦 Para rastrear seu objeto, envie o código dos Correios:\nEx: *Rastrear AA123456789BR*`,
        functionKey:  'rastreio_correios',
        creditsUsed:  0
      }
    }
  }

  // ── TRADUZIR TEXTO ────────────────────────────────────────────────────
  if (connection.traduzir_enabled === true) {
    const traduzirTriggers = ['traduzir','traduz','translate','como se diz','como fala','em inglês','em ingles','em espanhol','em francês','em frances','em italiano','em alemão','em alemao']
    if (traduzirTriggers.some(t => msgLower.includes(t))) {
      console.log('🌐 Rota: Traduzir Texto')
      try {
        let idioma   = 'inglês'
        let langCode = 'English'
        if (msgLower.includes('espanhol'))                                         { idioma = 'espanhol';  langCode = 'Spanish'    }
        else if (msgLower.includes('francês') || msgLower.includes('frances'))     { idioma = 'francês';   langCode = 'French'     }
        else if (msgLower.includes('italiano'))                                    { idioma = 'italiano';  langCode = 'Italian'    }
        else if (msgLower.includes('alemão') || msgLower.includes('alemao'))       { idioma = 'alemão';    langCode = 'German'     }
        else if (msgLower.includes('português') || msgLower.includes('portugues')) { idioma = 'português'; langCode = 'Portuguese' }
        else if (msgLower.includes('japonês') || msgLower.includes('japones'))     { idioma = 'japonês';   langCode = 'Japanese'   }
        else if (msgLower.includes('chinês') || msgLower.includes('chines'))       { idioma = 'chinês';    langCode = 'Chinese'    }

        const textoParaTraduzir = msg
          .replace(/traduz(ir)?|translate|como se diz|como fala/gi, '')
          .replace(/em inglês|em ingles|em espanhol|em francês|em frances|em italiano|em alemão|em alemao|em japonês|em japones|em chinês|em chines|em português|em portugues/gi, '')
          .replace(/para o inglês|para o espanhol|para o português/gi, '')
          .replace(/\s+/g, ' ').trim()
          .replace(/^[:,-]\s*/, '')

        if (!textoParaTraduzir || textoParaTraduzir.length < 2) {
          return {
            responseText: [
              `🌐 *Tradução*`,
              ``,
              `Envie o texto que deseja traduzir:`,
              `Ex: *Traduzir para espanhol: Bom dia, tudo bem?*`,
              ``,
              `Idiomas disponíveis: inglês, espanhol, francês, italiano, alemão, japonês, chinês, português`,
            ].join('\n'),
            functionKey: 'traduzir_texto',
            creditsUsed: 0
          }
        }

        const traducao = await callOpenAI(
          `Você é um tradutor profissional. Traduza o texto a seguir para ${langCode}. Responda APENAS com a tradução, sem explicações, sem aspas, sem prefixos.`,
          textoParaTraduzir
        )

        const texto = [
          `🌐 *Tradução para ${idioma}:*`,
          ``,
          `📝 Original: ${textoParaTraduzir}`,
          `✅ Traduzido: ${traducao}`,
        ].join('\n')

        return { responseText: texto, functionKey: 'traduzir_texto', creditsUsed: 1 }
      } catch (e: any) {
        return { responseText: `❌ Erro na tradução: ${e.message}`, functionKey: 'traduzir_texto', creditsUsed: 0 }
      }
    }
  }

  // ── CHAMAR GERENTE ────────────────────────────────────────────────────
  if (connection.chamar_gerente_enabled === true) {
    const gerenteTriggers = ['chamar gerente','falar com gerente','quero o gerente','preciso do gerente','chama o gerente','gerente por favor','atendimento humano','atendente humano','falar com humano','quero falar com responsável','falar com responsavel']
    if (gerenteTriggers.some(t => msgLower.includes(t))) {
      console.log('👔 Rota: Chamar Gerente')
      try {
        const { data: funcSettings } = await supabase
          .from('company_function_settings')
          .select('config')
          .eq('company_id', companyId)
          .eq('function_key', 'chamar_gerente')
          .maybeSingle()

        const config         = funcSettings?.config || {}
        const notificarEmail = config.notificar_email ?? true
        const notificarSms   = config.notificar_sms   ?? false

        const { data: gerente } = await supabase
          .from('company_profiles')
          .select('nome, email, telefone')
          .eq('company_id', companyId)
          .eq('tipo', 'gerente')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        const gerenteNome     = gerente?.nome     || 'Gerente'
        const gerenteEmail    = gerente?.email    || company.email_contato || null
        const gerenteTelefone = gerente?.telefone || null

        const horario  = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        const avisos: string[] = []
        const promises = []

        if (notificarEmail && gerenteEmail) {
          promises.push(
            fetch(`${supabaseUrl}/functions/v1/enviar-email-google`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                company_id: companyId,
                to:         gerenteEmail,
                subject:    `🔔 Cliente solicitou gerente — ${company.name}`,
                body:       `Olá ${gerenteNome},\n\nUm cliente solicitou falar com o gerente via Meta.\n\nEmpresa: ${company.name}\nHorário: ${horario}\n\nMensagem do cliente: ${msg}`,
              })
            }).then(r => { if (r.ok) avisos.push('e-mail') }).catch(() => null)
          )
        }

        if (notificarSms && gerenteTelefone) {
          const numeroLimpo = gerenteTelefone.replace(/\D/g, '')
          promises.push(
            fetch(`${supabaseUrl}/functions/v1/send-sms-gerente`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ number: numeroLimpo, gerente_nome: gerenteNome, motivo: msg })
            }).then(r => { if (r.ok) avisos.push('SMS') }).catch(() => null)
          )
        }

        await Promise.allSettled(promises)

        const texto = [
          `👔 *Gerente notificado!*`,
          ``,
          avisos.length > 0
            ? `✅ Solicitação enviada via ${avisos.join(' e ')}.`
            : `✅ Solicitação registrada no sistema.`,
          `⏳ Em breve um responsável entrará em contato.`,
          ``,
          `Obrigado pela paciência! 🙏`,
        ].join('\n')

        return { responseText: texto, functionKey: 'chamar_gerente', creditsUsed: 1 }
      } catch (e: any) {
        return { responseText: `❌ Não foi possível notificar o gerente: ${e.message}`, functionKey: 'chamar_gerente', creditsUsed: 0 }
      }
    }
  }

  // ── GERAR QR CODE ─────────────────────────────────────────────────────
  if (connection.gerar_qrcode_enabled === true) {
    const qrTriggers = [
      'qr code','qrcode','qr','gerar qr','criar qr',
      'código qr','codigo qr','gerar código qr','gerar codigo qr',
    ]
    if (qrTriggers.some(t => msgLower.includes(t))) {
      console.log('🔲 Rota: Gerar QR Code')

      // Detectar conteúdo a codificar
      const urlMatch      = msg.match(/https?:\/\/[^\s]+/i)
      const wantsWhatsApp = /whatsapp|whats|wpp|zap/i.test(msgLower)
      const wantsInstagram= /instagram|insta/i.test(msgLower)
      const wantsSite     = /site|website|página|pagina/i.test(msgLower)
      const wantsEmail    = /email|e-mail/i.test(msgLower)
      const wantsTelefone = /telefone|fone|ligar/i.test(msgLower)
      const wantsEndereco = /endereço|endereco|localização|localizacao|maps/i.test(msgLower)

      // Texto livre após remoção dos triggers
      const textoLivreMatch = msg
        .replace(/gerar?|criar?|qr\s*code|qrcode|código\s*qr|codigo\s*qr/gi, '')
        .replace(/d[eo]\s+/gi, '')
        .trim()

      let conteudo: string | null  = null
      let descricao                = ''

      if (urlMatch) {
        conteudo  = urlMatch[0]
        descricao = 'URL'
      } else if (wantsWhatsApp && company.whatsapp_number) {
        conteudo  = `https://wa.me/${company.whatsapp_number.replace(/\D/g, '')}`
        descricao = 'WhatsApp'
      } else if (wantsInstagram && company.instagram_username) {
        conteudo  = `https://instagram.com/${company.instagram_username.replace('@', '')}`
        descricao = 'Instagram'
      } else if (wantsSite && company.website) {
        conteudo  = company.website
        descricao = 'site'
      } else if (wantsEmail && company.email_contato) {
        conteudo  = `mailto:${company.email_contato}`
        descricao = 'e-mail'
      } else if (wantsTelefone && company.telefone_fixo) {
        conteudo  = `tel:${company.telefone_fixo.replace(/\D/g, '')}`
        descricao = 'telefone'
      } else if (wantsEndereco && company.business_address) {
        conteudo  = `https://maps.google.com/?q=${encodeURIComponent(company.business_address)}`
        descricao = 'endereço'
      } else if (textoLivreMatch && textoLivreMatch.length >= 2) {
        conteudo  = textoLivreMatch
        descricao = 'texto'
      }

      if (!conteudo) {
        return {
          responseText: [
            `🔲 *Gerar QR Code*`,
            ``,
            `Informe o que deseja converter em QR Code:`,
            ``,
            `• *Link/URL* — ex: gerar QR do https://meusite.com`,
            `• *WhatsApp* — ex: QR Code do meu WhatsApp`,
            `• *Instagram* — ex: QR Code do Instagram`,
            `• *Site* — ex: QR do meu site`,
            `• *Texto livre* — ex: QR Code do texto PRODUTO-001`,
          ].join('\n'),
          functionKey: 'gerar_qrcode',
          creditsUsed: 0,
        }
      }

      const qrLink = `https://minhai.app/api/qrcode?size=300&data=${encodeURIComponent(conteudo)}&color=%23000080&company_id=${companyId}`

      return {
        responseText: [
          `🔲 *QR Code gerado!*`,
          ``,
          `📎 Conteúdo: ${descricao ? `${descricao} — ` : ''}${conteudo.length > 60 ? conteudo.slice(0, 57) + '...' : conteudo}`,
          ``,
          `👇 Acesse o link para ver e salvar o QR Code:`,
          qrLink,
        ].join('\n'),
        functionKey: 'gerar_qrcode',
        creditsUsed: 1,
      }
    }
  }

  return null
}

// ── Helpers ───────────────────────────────────────────────────────────────

function extrairCidadeDoEndereco(address?: string): string | null {
  if (!address) return null
  const partes = address.split(',')
  if (partes.length >= 3) {
    const cidadeUf = partes[partes.length - 1].trim()
    return cidadeUf.replace(/[-\/]\s*[A-Z]{2}$/, '').trim() || null
  }
  return null
}

async function callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) throw new Error('OPENAI_API_KEY não configurada')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 400,
    }),
  })

  const d = await res.json()
  if (!res.ok) throw new Error(`OpenAI Error: ${d.error?.message || 'Unknown'}`)
  return d.choices[0].message.content
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTA PARA IMPLEMENTAÇÃO FUTURA — Fluxo conversacional completo de nota
// ─────────────────────────────────────────────────────────────────────────────
//
// O modo express acima ("criar nota sobre X") salva direto e cobre 90% dos casos.
//
// Para suportar o fluxo em 2 etapas (usuário digita "criar nota" sem conteúdo,
// bot pede o texto, usuário responde na mensagem seguinte), é necessário:
//
// 1. Adicionar tryNotaFlow no meta-message-router (igual a tryOrcamentoFlow):
//    - Triggers: NOTA_TRIGGERS
//    - State: { flow: 'nota', etapa: 'aguardando_conteudo' }
//    - Quando etapa === 'aguardando_conteudo': qualquer mensagem é o conteúdo → salva
//    - Guard em tryVendasFlow e tryOrcamentoFlow: if (currentState?.flow === 'nota') return null
//
// 2. A edge meta-servicos NÃO precisa de mudança para o fluxo completo —
//    o tryNotaFlow no router chamaria diretamente o Supabase sem passar por aqui.
//
// Por ora o modo express cobre o uso via WhatsApp confortavelmente.