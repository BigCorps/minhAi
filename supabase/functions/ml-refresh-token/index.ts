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
    const { company_id } = body

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Busca conexão
    const { data: conn, error: fetchError } = await supabase
      .from('ml_connections')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .single()

    if (fetchError || !conn) {
      return new Response(
        JSON.stringify({ error: 'Conexão ML não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verifica se ainda é válido (margem de 5 minutos)
    const expiresAt = new Date(conn.expires_at).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    if (expiresAt > now + fiveMinutes) {
      // Token ainda válido — retorna direto
      return new Response(
        JSON.stringify({ access_token: conn.access_token, refreshed: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Token expirado ou prestes a expirar — renova
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: Deno.env.get('ML_APP_ID')!,
        client_secret: Deno.env.get('ML_APP_SECRET')!,
        refresh_token: conn.refresh_token,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[ml-refresh-token] erro ML:', err)

      // Marca conexão como inativa — usuário vai precisar reconectar
      await supabase
        .from('ml_connections')
        .update({ is_active: false })
        .eq('company_id', company_id)

      return new Response(
        JSON.stringify({ error: 'Falha ao renovar token — reconexão necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenRes.json()
    const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Atualiza no banco
    const { error: updateError } = await supabase
      .from('ml_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: newExpiresAt,
        last_token_refresh: new Date().toISOString(),
      })
      .eq('company_id', company_id)

    if (updateError) {
      console.error('[ml-refresh-token] erro ao salvar:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar token renovado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ access_token: tokenData.access_token, refreshed: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    console.error('[ml-refresh-token] erro geral:', e)
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})