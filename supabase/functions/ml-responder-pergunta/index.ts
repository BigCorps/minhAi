import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PHASE4G_SERVICE_ROLE_ONLY
const PHASE4G_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

    if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Worker interno: somente chamadas que carregam a service role real do projeto.
  const phase4gAuthorization = req.headers.get('authorization') || ''
  if (!PHASE4G_SERVICE_ROLE || phase4gAuthorization !== `Bearer ${PHASE4G_SERVICE_ROLE}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

try {
    const body = JSON.parse(await req.text())
    const { question_id, company_id, ml_auto_reply } = body

    if (!question_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'question_id e company_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Obtém access_token via ml-refresh-token
    const refreshRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/ml-refresh-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ company_id }),
      }
    )

    if (!refreshRes.ok) {
      console.error('[ml-responder-pergunta] falha ao obter token')
      return new Response(
        JSON.stringify({ error: 'Falha ao obter token ML' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { access_token } = await refreshRes.json()

    // Sanitiza question_id — remove espaços, newlines e caracteres invisíveis
    const questionIdClean = String(question_id).trim().replace(/\s+/g, '')
    console.log('[ml-responder-pergunta] question_id:', questionIdClean)

    // Busca a pergunta via search por seller_id + id
    // GET /questions/{id} é bloqueado por policy — usar /questions/search
    const { data: connData } = await supabase
      .from('ml_connections')
      .select('seller_id')
      .eq('company_id', company_id)
      .single()

    const sellerId = connData?.seller_id
    if (!sellerId) {
      return new Response(
        JSON.stringify({ error: 'seller_id não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const questionUrl = `https://api.mercadolibre.com/questions/search?seller_id=${sellerId}&api_version=4&status=UNANSWERED`
    console.log('[ml-responder-pergunta] buscando perguntas do seller:', questionUrl)

    const questionRes = await fetch(
      questionUrl,
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    )

    const questionStatus = questionRes.status
    const questionBody = await questionRes.text()
    console.log('[ml-responder-pergunta] status:', questionStatus)
    console.log('[ml-responder-pergunta] body:', questionBody.slice(0, 300))

    if (!questionRes.ok) {
      console.error('[ml-responder-pergunta] erro ao buscar perguntas:', questionStatus, questionBody.slice(0, 200))
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar perguntas do ML' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const searchResult = JSON.parse(questionBody)
    const question = (searchResult.questions ?? []).find(
      (q: any) => String(q.id) === questionIdClean
    )

    if (!question) {
      console.error('[ml-responder-pergunta] question_id não encontrado na lista:', questionIdClean)
      return new Response(
        JSON.stringify({ error: 'Pergunta não encontrada na lista do seller' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ignora perguntas já respondidas ou não abertas
    if (question.status !== 'UNANSWERED') {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'already_answered' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const textoPergunta = question.text
    const mlItemId = question.item_id

    // 3. Busca dados do produto no ML
    let produtoNome = ''
    let produtoDescricao = ''
    let produtoCategoria = ''

    try {
      const itemRes = await fetch(
        `https://api.mercadolibre.com/items/${mlItemId}`,
        { headers: { 'Authorization': `Bearer ${access_token}` } }
      )
      if (itemRes.ok) {
        const item = await itemRes.json()
        produtoNome = item.title ?? ''
        produtoCategoria = item.category_id ?? ''

        // Busca descrição separadamente
        const descRes = await fetch(
          `https://api.mercadolibre.com/items/${mlItemId}/description`,
          { headers: { 'Authorization': `Bearer ${access_token}` } }
        )
        if (descRes.ok) {
          const desc = await descRes.json()
          produtoDescricao = desc.plain_text ?? ''
        }
      }
    } catch {
      // não crítico — segue sem dados do produto
    }

    // 4. Busca contexto da empresa
    const { data: company } = await supabase
      .from('companies')
      .select('name, system_prompt')
      .eq('id', company_id)
      .single()

    // 5. Gera resposta com GPT-4o
    const systemPrompt = `Você é o assistente de atendimento de "${company?.name ?? 'nossa loja'}".
Responda perguntas de compradores do Mercado Livre de forma clara, simpática e em português brasileiro.
Seja objetivo — máximo 500 caracteres (limite do ML).
Nunca prometa prazos de entrega que não conhece.
Nunca invente informações sobre o produto.
Você está respondendo uma pergunta pública em um anúncio do Mercado Livre.
Cada pergunta é independente — você não tem histórico anterior.
Regras:
- NUNCA mencione telefone, WhatsApp, email ou links externos
- Responda de forma COMPLETA e AUTOSSUFICIENTE — preço, prazo, especificações na mesma resposta
- Se o comprador quiser comprar, diga para clicar em "Comprar" no anúncio
- Se a quantidade ou personalização não estiver disponível no anúncio atual, informe claramente o que está disponível, mas com a pergunta do usuário, em breve um produto com sua especificação poderá ser publicado.
- Seja direto, simpático, em português brasileiro
- Máximo 500 caracteres
${company?.system_prompt ? `\nContexto da empresa:\n${company.system_prompt}` : ''}`

    const userPrompt = `Produto: ${produtoNome}
${produtoDescricao ? `Descrição: ${produtoDescricao.slice(0, 500)}` : ''}
${produtoCategoria ? `Categoria: ${produtoCategoria}` : ''}

Pergunta do comprador: "${textoPergunta}"

Responda a pergunta acima de forma direta e simpática.`

    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!gptRes.ok) {
      console.error('[ml-responder-pergunta] erro GPT:', await gptRes.text())
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar resposta com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gptData = await gptRes.json()
    const respostaGerada = gptData.choices?.[0]?.message?.content?.trim() ?? ''

    if (!respostaGerada) {
      return new Response(
        JSON.stringify({ error: 'Resposta vazia gerada pela IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Trunca para 2000 chars (limite real do ML) por segurança
    const respostaTruncada = respostaGerada.slice(0, 2000)

    // 6. Salva pergunta + resposta no banco
    const { data: savedQuestion, error: saveError } = await supabase
      .from('ml_questions')
      .insert({
        company_id,
        ml_question_id: String(question_id),
        ml_item_id: mlItemId,
        produto_nome: produtoNome || null,
        texto_pergunta: textoPergunta,
        resposta_gerada: respostaTruncada,
        status: ml_auto_reply ? 'pending_send' : 'pending',
      })
      .select('id')
      .single()

    if (saveError) {
      console.error('[ml-responder-pergunta] erro ao salvar:', saveError)
    }

// 7. Cobra crédito (2 créditos por resposta gerada)
    try {
      await supabase.rpc('register_function_usage', {
        p_company_id: company_id,
        p_function_key: 'ml_responder_pergunta',
        p_credits_consumed: 2,
        p_metadata: {
          question_id,
          ml_item_id: mlItemId,
          produto_nome: produtoNome,
          user_input: textoPergunta,
          assistant_response: respostaTruncada,
        },
      })
    } catch (e) {
      console.error('[ml-responder-pergunta] erro ao registrar crédito:', e)
    }

    // 8. Se auto_reply, posta no ML imediatamente
    if (ml_auto_reply) {
      const answerRes = await fetch('https://api.mercadolibre.com/answers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: Number(question_id),
          text: respostaTruncada,
        }),
      })

      if (answerRes.ok) {
        // Atualiza status para sent
        await supabase
          .from('ml_questions')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('ml_question_id', String(question_id))
      } else {
        const answerErr = await answerRes.json()
        console.error('[ml-responder-pergunta] erro ao postar resposta:', answerErr)
        await supabase
          .from('ml_questions')
          .update({ status: 'error' })
          .eq('ml_question_id', String(question_id))
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        question_id,
        produto_nome: produtoNome,
        resposta_gerada: respostaTruncada,
        status: ml_auto_reply ? 'sent' : 'pending',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('[ml-responder-pergunta] erro geral:', e)
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})