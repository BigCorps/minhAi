import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

async function callFunction(name: string, body: unknown) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
    },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const now = new Date().toISOString()

  const { data: transactions, error } = await supabase
    .from('pix_transactions')
    .select('id,txid,company_id,user_id,pedido_id,purpose,payment_provider,direct_intent_id,origem,companies!inner(segment_key)')
    .eq('status', 'pending')
    .gt('expires_at', now)
    .neq('purpose', 'pixwiki_subscription')

  if (error || !transactions?.length) {
    if (error) console.error('[auto-confirmar-pix] consulta:', error.message)
    return new Response(JSON.stringify({ success: true, checked: 0, confirmed: 0 }), { headers: corsHeaders })
  }

  const interApiKey = Deno.env.get('BANCO_INTER_API_KEY')
  let confirmed = 0
  let pixwikiChecked = 0
  let minhaiDirectChecked = 0
  let funcionariaDirectChecked = 0
  let mercadoPagoChecked = 0
  let legacyChecked = 0
  let ambiguous = 0

  for (const tx of transactions as any[]) {
    try {
      const segmentKey = Array.isArray(tx.companies) ? tx.companies?.[0]?.segment_key : tx.companies?.segment_key
      const origem = String(tx.origem || '')

      // PixWiki mantém sua sincronização/histórico/notificações dedicadas.
      if (segmentKey === 'pix_wiki' || origem.startsWith('pixwiki_link')) {
        pixwikiChecked++
        const { response, data } = await callFunction('pixwiki-confirm-payment', { transaction_id: tx.id })
        if (response.ok && data?.success) confirmed++
        if (data?.error === 'ambiguous_direct_payment') ambiguous++
        continue
      }

      // FuncionarIA usa o mesmo reconciliador de recebimentos e preserva a
      // finalização transacional própria (checkout + pedido + estoque).
      if (tx.payment_provider === 'pix_direct' && origem.startsWith('funcionaria_pix')) {
        funcionariaDirectChecked++
        const { response, data: match } = await callFunction('pix-direct-reconcile', { transaction_id: tx.id })
        if (!response.ok) {
          if (match?.error === 'ambiguous_direct_payment') ambiguous++
          continue
        }
        if (!match?.matched || !match?.provider_payment_id) continue

        const { data: checkout } = await supabase
          .from('funcionaria_checkouts')
          .select('id')
          .eq('pix_transaction_id', tx.id)
          .maybeSingle()
        if (!checkout?.id) continue

        const { error: finalizeError } = await supabase.rpc('funcionaria_finalizar_pix', {
          p_checkout_id: checkout.id,
          p_transaction_id: tx.id,
          p_provider_payment_id: String(match.provider_payment_id),
          p_paid_at: match.paid_at || new Date().toISOString(),
        })
        if (!finalizeError) confirmed++
        else console.error('[auto-confirmar-pix] FuncionarIA finalizar:', finalizeError.message)
        continue
      }

      // minhAi Pix Grátis: reconciliação compartilhada dentro da V2 e, após
      // encontrar o pagamento, todos os efeitos legados são reaproveitados.
      if (tx.payment_provider === 'pix_direct') {
        minhaiDirectChecked++
        const { response, data } = await callFunction('confirmar-pix-assistente-v2', { transaction_id: tx.id })
        if (response.ok && data?.success) confirmed++
        if (data?.error === 'ambiguous_direct_payment') ambiguous++
        continue
      }

      // Cobranças identificadas pelo próprio Mercado Pago podem ser consultadas
      // diretamente pelo confirmador existente, sem passar pelo Banco Inter.
      if (tx.payment_provider === 'mercadopago') {
        mercadoPagoChecked++
        const { response, data } = await callFunction('confirmar-pix-assistente', { transaction_id: tx.id })
        if (response.ok && data?.success) confirmed++
        continue
      }

      // Compatibilidade: fluxos antigos/BigCorps continuam exatamente como
      // antes no Banco Inter. Nada é migrado automaticamente para o modo free.
      legacyChecked++
      if (!interApiKey || !tx.txid) continue

      const interResponse = await fetch(
        `https://inter.btsolucao.com.br/get.php?txid=${encodeURIComponent(String(tx.txid))}`,
        { headers: { Authorization: `Bearer ${interApiKey}` } },
      )
      if (!interResponse.ok) continue

      const apiResponse = await interResponse.json()
      const responseData = apiResponse.data || apiResponse
      const status = String(responseData.status || '').toUpperCase()

      if (['PAGO', 'REALIZADO', 'CONCLUIDA'].includes(status)) {
        const { response, data } = await callFunction('confirmar-pix-assistente', { transaction_id: tx.id })
        if (response.ok && data?.success) confirmed++
      }
    } catch (err) {
      console.error(`[auto-confirmar-pix] tx ${tx.id}:`, err)
    }
  }

  return new Response(JSON.stringify({
    success: true,
    checked: transactions.length,
    confirmed,
    pixwiki_checked: pixwikiChecked,
    minhai_direct_checked: minhaiDirectChecked,
    funcionaria_direct_checked: funcionariaDirectChecked,
    mercadopago_checked: mercadoPagoChecked,
    legacy_checked: legacyChecked,
    ambiguous,
  }), { headers: corsHeaders })
})
