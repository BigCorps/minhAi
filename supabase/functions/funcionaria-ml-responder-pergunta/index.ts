import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = JSON.parse(await req.text())
    const { question_id, company_id, ml_auto_reply } = body
    if (!question_id || !company_id) return json({ error: 'question_id e company_id são obrigatórios' }, 400)

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    const [{ data: settings }, { data: entitlements }] = await Promise.all([
      supabase.from('funcionaria_company_settings').select('ai_enabled').eq('company_id', company_id).maybeSingle(),
      supabase.rpc('funcionaria_active_entitlements', { p_company_id: company_id }),
    ])

    const skillKeys: string[] = Array.isArray(entitlements?.skill_keys) ? entitlements.skill_keys : []
    if (!settings || !skillKeys.includes('mercado_livre')) return json({ ok: true, skipped: true, reason: 'skill_not_active' })

    const accessToken = await getAccessToken(company_id)
    if (!accessToken) return json({ error: 'Falha ao obter token ML' }, 401)

    const questionIdClean = String(question_id).trim().replace(/\s+/g, '')
    const { data: connData } = await supabase.from('ml_connections').select('seller_id').eq('company_id', company_id).single()
    if (!connData?.seller_id) return json({ error: 'seller_id não encontrado' }, 404)

    const questionRes = await fetch(`https://api.mercadolibre.com/questions/search?seller_id=${connData.seller_id}&api_version=4&status=UNANSWERED`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!questionRes.ok) return json({ error: 'Erro ao buscar perguntas do ML' }, 502)

    const searchResult = await questionRes.json()
    const question = (searchResult.questions ?? []).find((q: any) => String(q.id) === questionIdClean)
    if (!question) return json({ error: 'Pergunta não encontrada na lista do seller' }, 404)
    if (question.status !== 'UNANSWERED') return json({ ok: true, skipped: true, reason: 'already_answered' })

    const questionText = String(question.text || '').trim()
    const itemId = String(question.item_id || '')
    const item = await loadItem(accessToken, itemId)

    let answer: string | null = null
    let source: 'faq' | 'product' | 'ai' | 'manual' = 'manual'

    const faqAnswer = await findFaqAnswer(supabase, company_id, questionText)
    if (faqAnswer && isMercadoLivreSafe(faqAnswer)) {
      answer = faqAnswer
      source = 'faq'
    }

    if (!answer) {
      answer = deterministicProductAnswer(questionText, item)
      if (answer) source = 'product'
    }

    if (!answer && settings.ai_enabled === true) {
      const allowance = await checkUsage(supabase, company_id, 'ai_generation', 1)
      if (allowance?.ok) {
        const generated = await generateAiAnswer(supabase, company_id, questionText, item)
        if (generated?.answer) {
          const debit = await consumeUsage(supabase, company_id, 'ai_generation', 1, {
            source: 'funcionaria_ml',
            channel: 'mercado_livre',
            idempotencyKey: `ml-ai:${questionIdClean}`,
            metadata: {
              question_id: questionIdClean,
              ml_item_id: itemId,
              produto_nome: item.title || null,
              model: 'gpt-4o-mini',
              prompt_tokens: generated.usage?.prompt_tokens ?? null,
              completion_tokens: generated.usage?.completion_tokens ?? null,
              total_tokens: generated.usage?.total_tokens ?? null,
            },
          })
          if (debit?.ok) {
            answer = generated.answer
            source = 'ai'
          }
        }
      }
    }

    if (!answer) {
      await saveQuestion(supabase, {
        company_id,
        question_id: questionIdClean,
        item_id: itemId,
        product_name: item.title || null,
        question_text: questionText,
        answer: null,
        status: 'pending_manual',
      })
      return json({ ok: true, question_id: questionIdClean, status: 'pending_manual', source: 'manual' })
    }

    const finalAnswer = sanitizeAnswer(answer).slice(0, 2000)
    const status = ml_auto_reply ? 'pending_send' : 'pending'
    await saveQuestion(supabase, {
      company_id,
      question_id: questionIdClean,
      item_id: itemId,
      product_name: item.title || null,
      question_text: questionText,
      answer: finalAnswer,
      status,
    })

    if (ml_auto_reply) {
      const answerRes = await fetch('https://api.mercadolibre.com/answers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: Number(questionIdClean), text: finalAnswer }),
      })
      if (answerRes.ok) {
        await supabase.from('ml_questions').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('ml_question_id', questionIdClean)
      } else {
        await supabase.from('ml_questions').update({ status: 'error' }).eq('ml_question_id', questionIdClean)
      }
    }

    return json({
      ok: true,
      question_id: questionIdClean,
      produto_nome: item.title || null,
      resposta_gerada: finalAnswer,
      status: ml_auto_reply ? 'sent' : 'pending',
      source,
      ai_used: source === 'ai',
    })
  } catch (error) {
    console.error('[funcionaria-ml-responder-pergunta]', error)
    return json({ error: 'Erro interno' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

async function getAccessToken(companyId: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ml-refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
    body: JSON.stringify({ company_id: companyId }),
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => ({}))
  return data?.access_token || null
}

async function loadItem(accessToken: string, itemId: string) {
  const fallback = { title: '', description: '', category_id: '', price: null, available_quantity: null, condition: '', attributes: [], shipping: null }
  try {
    const itemRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!itemRes.ok) return fallback
    const item = await itemRes.json()
    let description = ''
    try {
      const descRes = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (descRes.ok) description = (await descRes.json())?.plain_text || ''
    } catch {}
    return {
      title: item.title || '',
      description,
      category_id: item.category_id || '',
      price: typeof item.price === 'number' ? item.price : null,
      available_quantity: typeof item.available_quantity === 'number' ? item.available_quantity : null,
      condition: item.condition || '',
      attributes: Array.isArray(item.attributes) ? item.attributes : [],
      shipping: item.shipping || null,
    }
  } catch {
    return fallback
  }
}

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function levenshteinSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  if (longer.length === 0) return 1
  const dp = Array.from({ length: shorter.length + 1 }, (_, i) => i)
  for (let i = 1; i <= longer.length; i++) {
    let prev = i
    for (let j = 1; j <= shorter.length; j++) {
      const value = longer[i - 1] === shorter[j - 1] ? dp[j - 1] : Math.min(dp[j - 1], dp[j], prev) + 1
      dp[j - 1] = prev
      prev = value
    }
    dp[shorter.length] = prev
  }
  return (longer.length - dp[shorter.length]) / longer.length
}

async function findFaqAnswer(supabase: any, companyId: string, message: string): Promise<string | null> {
  const { data: faqs } = await supabase.from('faq_entries').select('question,answer,variations').eq('company_id', companyId).eq('is_active', true)
  if (!faqs?.length) return null
  const msg = normalize(message)
  let best: any = null
  let bestScore = 0
  for (const faq of faqs) {
    const candidates = [faq.question, ...(Array.isArray(faq.variations) ? faq.variations : [])].filter(Boolean)
    for (const candidate of candidates) {
      const norm = normalize(String(candidate))
      if (norm === msg) return String(faq.answer || '') || null
      const score = levenshteinSimilarity(msg, norm)
      if (score > bestScore && score >= .85) { best = faq; bestScore = score }
    }
    const words = new Set(msg.split(/\s+/).filter((w) => w.length > 3))
    const faqWords = new Set(normalize(String(faq.question || '')).split(/\s+/).filter((w) => w.length > 3))
    if (words.size && faqWords.size) {
      let matches = 0
      for (const w of words) if (faqWords.has(w)) matches++
      const score = matches / Math.max(words.size, faqWords.size)
      if (score > bestScore && score >= .7) { best = faq; bestScore = score }
    }
  }
  return best?.answer ? String(best.answer) : null
}

function isMercadoLivreSafe(answer: string) {
  const a = answer.toLowerCase()
  if (/https?:\/\//i.test(answer)) return false
  if (/\bwww\./i.test(answer)) return false
  if (/\bwhats(app)?\b|telefone|e-?mail|instagram|facebook/i.test(a)) return false
  if (/\+?55\s*\(?\d{2}\)?[\s-]*\d{4,5}[\s-]*\d{4}/.test(answer)) return false
  return true
}

function deterministicProductAnswer(question: string, item: any): string | null {
  const q = normalize(question)
  const has = (...terms: string[]) => terms.some((t) => q.includes(t))

  if (has('frete', 'entrega', 'prazo', 'chega quando', 'quando chega')) {
    return 'O prazo e o valor do frete são calculados pelo Mercado Livre para o seu CEP e aparecem no próprio anúncio antes da compra.'
  }

  if (has('forma de pagamento', 'formas de pagamento', 'parcelamento', 'parcela', 'cartao', 'pix')) {
    return 'As formas de pagamento e opções de parcelamento disponíveis são mostradas pelo Mercado Livre no momento da compra.'
  }

  if (has('tem estoque', 'disponivel', 'disponibilidade', 'ainda tem', 'tem unidade')) {
    if (typeof item.available_quantity === 'number') {
      return item.available_quantity > 0 ? 'Sim, o anúncio está disponível para compra no momento.' : 'No momento este anúncio está sem estoque disponível.'
    }
  }

  if (has('preco', 'valor', 'quanto custa') && typeof item.price === 'number') {
    return `O valor atual exibido no anúncio é ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}. O preço válido é sempre o mostrado pelo Mercado Livre no momento da compra.`
  }

  const attrs = Array.isArray(item.attributes) ? item.attributes : []
  for (const attr of attrs) {
    const name = normalize(String(attr.name || ''))
    const value = String(attr.value_name || attr.value_struct?.name || '').trim()
    if (!name || !value) continue
    const nameWords = name.split(' ').filter((w) => w.length >= 4)
    if (nameWords.some((w) => q.includes(w))) return `${attr.name}: ${value}.`
  }

  if (has('novo', 'usado', 'condicao', 'estado do produto') && item.condition) {
    const condition = item.condition === 'new' ? 'novo' : item.condition === 'used' ? 'usado' : item.condition
    return `A condição informada no anúncio é: ${condition}.`
  }

  return null
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
  if (error) console.warn('[FuncionarIA ML] consume usage:', error.message)
  return data
}

async function generateAiAnswer(supabase: any, companyId: string, question: string, item: any): Promise<{ answer: string; usage: any } | null> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) return null
  const { data: company } = await supabase.from('companies').select('name,system_prompt').eq('id', companyId).single()
  const systemPrompt = `Você atende compradores do Mercado Livre da empresa "${company?.name || 'loja'}". Responda em português brasileiro, de forma objetiva e segura. Nunca invente informações. Nunca informe telefone, WhatsApp, e-mail, Instagram, Facebook ou links externos. Não prometa prazo de entrega; o Mercado Livre calcula frete e prazo. Se a informação não estiver no anúncio/contexto, diga claramente que ela não está disponível. Máximo 500 caracteres.${company?.system_prompt ? `\nContexto da empresa: ${company.system_prompt}` : ''}`
  const attributes = (item.attributes || []).slice(0, 20).map((a: any) => `${a.name}: ${a.value_name || ''}`).join('\n')
  const userPrompt = `Produto: ${item.title || ''}\nPreço: ${item.price ?? 'não informado'}\nEstoque: ${item.available_quantity ?? 'não informado'}\nDescrição: ${(item.description || '').slice(0, 1000)}\nAtributos:\n${attributes}\n\nPergunta: ${question}`
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 250, temperature: .3, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => ({}))
  const answer = String(data?.choices?.[0]?.message?.content || '').trim()
  return answer && isMercadoLivreSafe(answer) ? { answer, usage: data?.usage || null } : null
}

function sanitizeAnswer(answer: string) {
  return answer.replace(/\s+/g, ' ').trim()
}

async function saveQuestion(supabase: any, input: { company_id: string; question_id: string; item_id: string; product_name: string | null; question_text: string; answer: string | null; status: string }) {
  await supabase.from('ml_questions').upsert({
    company_id: input.company_id,
    ml_question_id: input.question_id,
    ml_item_id: input.item_id,
    produto_nome: input.product_name,
    texto_pergunta: input.question_text,
    resposta_gerada: input.answer,
    status: input.status,
  }, { onConflict: 'ml_question_id' })
}
