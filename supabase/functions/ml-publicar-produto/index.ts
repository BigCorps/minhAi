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
    const { produto_id, company_id, ml_category_id, ml_listing_type = 'free' } = body

    if (!produto_id || !company_id || !ml_category_id) {
      return new Response(
        JSON.stringify({ error: 'produto_id, company_id e ml_category_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Busca o produto
    const { data: produto, error: produtoError } = await supabase
      .from('produtos_venda')
      .select('*')
      .eq('id', produto_id)
      .eq('company_id', company_id)
      .single()

    if (produtoError || !produto) {
      return new Response(
        JSON.stringify({ error: 'Produto não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Obtém access_token via ml-refresh-token
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
      const err = await refreshRes.json()
      return new Response(
        JSON.stringify({ error: err.error ?? 'Falha ao obter token ML — reconecte sua conta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { access_token } = await refreshRes.json()

    // 3. Monta payload do anúncio
    // ML exige preço em centavos? Não — usa float com 2 casas
    const pictures = produto.imagem_url
      ? [{ source: produto.imagem_url }]
      : []

    const isFree = ml_listing_type === 'free'
    const maxQty = isFree ? 1 : 999

    const available_quantity = produto.controla_estoque
      ? Math.min(Math.max(Math.floor(produto.estoque_atual), 1), maxQty)
      : isFree ? 1 : 99

    const mlPayload: Record<string, any> = {
      title: produto.nome,
      category_id: ml_category_id,
      price: Number(produto.preco_venda),
      currency_id: 'BRL',
      available_quantity,
      buying_mode: 'buy_it_now',
      condition: 'new',
      listing_type_id: ml_listing_type,
      attributes: [
        { id: 'BRAND', value_name: produto.marca?.trim() || 'Sem marca' }
      ],
    }

    if (pictures.length > 0) {
      mlPayload.pictures = pictures
    }

    if (produto.descricao) {
      mlPayload.description = { plain_text: produto.descricao }
    }

    // 4. Verifica se já tem ml_item_id (update) ou é novo (create)
    let mlItemId = produto.ml_item_id
    let mlResponse: any

    if (mlItemId) {
      // UPDATE — atualiza preço, estoque e título
      const updatePayload: Record<string, any> = {
        title: produto.nome,
        price: Number(produto.preco_venda),
        available_quantity: mlPayload.available_quantity,
      }

      const updateRes = await fetch(
        `https://api.mercadolibre.com/items/${mlItemId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        }
      )

      mlResponse = await updateRes.json()

      if (!updateRes.ok) {
        console.error('[ml-publicar-produto] erro update ML:', mlResponse)
        return new Response(
          JSON.stringify({
            error: mlResponse.message ?? 'Erro ao atualizar anúncio no Mercado Livre',
            ml_error: mlResponse,
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // CREATE — publica novo anúncio
      const createRes = await fetch(
        'https://api.mercadolibre.com/items',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mlPayload),
        }
      )

      mlResponse = await createRes.json()

      if (!createRes.ok) {
        console.error('[ml-publicar-produto] erro create ML:', mlResponse)
        const isUnauthorized = mlResponse?.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES'
        const isForbidden = createRes.status === 403
        return new Response(
          JSON.stringify({
            error: (isUnauthorized || isForbidden)
              ? 'Sem permissão para publicar. Verifique: (1) reconecte sua conta ML em Integrações, (2) confirme que sua conta ML está habilitada para vendas em mercadolivre.com.br'
              : mlResponse.message ?? 'Erro ao publicar no Mercado Livre',
            ml_error: mlResponse,
          }),
          { status: isForbidden ? 403 : 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      mlItemId = mlResponse.id
    }

    // 5. Salva ml_item_id, ml_category_id, ml_status e ml_published_at no produto
    const { error: updateError } = await supabase
      .from('produtos_venda')
      .update({
        ml_item_id: mlItemId,
        ml_category_id: ml_category_id,
        ml_listing_type: ml_listing_type,
        ml_status: mlResponse.status ?? 'active',
        ml_published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', produto_id)

    if (updateError) {
      console.error('[ml-publicar-produto] erro ao salvar ml_item_id:', updateError)
      // Não bloqueia — o anúncio já foi criado no ML
    }

    return new Response(
      JSON.stringify({
        success: true,
        ml_item_id: mlItemId,
        ml_status: mlResponse.status ?? 'active',
        ml_permalink: mlResponse.permalink ?? null,
        updated: !!produto.ml_item_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('[ml-publicar-produto] erro geral:', e)
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})