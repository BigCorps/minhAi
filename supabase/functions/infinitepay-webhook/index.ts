// supabase/functions/infinitepay-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log('📦 Webhook InfinitePay recebido:', JSON.stringify(payload))

    // Extrair order_id (ajustar conforme formato real do InfinitePay)
    const order_id = payload.order_id || payload.orderId || payload.external_id

    if (!order_id) {
      console.error('❌ order_id não encontrado no payload')
      return new Response(
        JSON.stringify({ error: 'order_id obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determinar status (ajustar conforme formato real)
    let status = 'pending'
    if (payload.status === 'paid' || payload.status === 'approved' || payload.status === 'success' || payload.paid === true) {
      status = 'paid'
    } else if (payload.status === 'cancelled' || payload.status === 'failed') {
      status = 'cancelled'
    }

    console.log(`📊 Processando: order_id=${order_id}, status=${status}`)

    // Atualizar payment_status
    const { error: updateError } = await supabaseAdmin
      .from('payment_status')
      .update({
        status,
        nsu: payload.nsu || payload.transaction_id,
        aut: payload.aut || payload.authorization_code,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', order_id)

    if (updateError) {
      console.error('❌ Erro ao atualizar payment_status:', updateError)
      // Se não existe, criar
      const { error: insertError } = await supabaseAdmin
        .from('payment_status')
        .insert({
          order_id,
          status,
          nsu: payload.nsu || payload.transaction_id,
          aut: payload.aut || payload.authorization_code,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })

      if (insertError) {
        console.error('❌ Erro ao inserir payment_status:', insertError)
      } else {
        console.log('✅ Payment status criado')
      }
    } else {
      console.log('✅ Payment status atualizado')
    }

    // Se foi pago, invocar sincronização
    if (status === 'paid') {
      console.log('💰 Pagamento confirmado, invocando sincronização...')

      const { data: cobranca } = await supabaseAdmin
        .from('cobrancas')
        .select('*')
        .eq('order_id', order_id)
        .single()

      if (cobranca) {
        console.log('🔄 Invocando sincronizar-cobranca para cobrança:', cobranca.id)
        
        const { error: syncError } = await supabaseAdmin.functions.invoke('sincronizar-cobranca', {
          body: { cobranca }
        })

        if (syncError) {
          console.error('❌ Erro ao invocar sincronizar-cobranca:', syncError)
        } else {
          console.log('✅ Sincronização invocada com sucesso')
        }
      } else {
        console.warn('⚠️ Cobrança não encontrada para order_id:', order_id)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
