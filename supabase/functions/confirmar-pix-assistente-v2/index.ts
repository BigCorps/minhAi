import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

async function proxyLegacy(req: Request, body: unknown) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/confirmar-pix-assistente`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: req.headers.get('authorization') || `Bearer ${SERVICE_ROLE}`,
      apikey: req.headers.get('apikey') || SERVICE_ROLE,
    },
    body: JSON.stringify(body),
  })
  return new Response(await response.text(), { status: response.status, headers: corsHeaders })
}

async function reconcile(transactionId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/pix-direct-reconcile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
    },
    body: JSON.stringify({ transaction_id: transactionId }),
  })
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'method_not_allowed' }), { status: 405, headers: corsHeaders })
  }

  const body = await req.json().catch(() => ({})) as Record<string, any>
  const transactionId = String(body.transaction_id || '')
  if (!transactionId) {
    return new Response(JSON.stringify({ success: false, error: 'transaction_id_required' }), { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const { data: tx, error: txError } = await supabase
      .from('pix_transactions')
      .select('id,company_id,user_id,txid,status,amount_cents,original_amount_cents,discount_cents,payment_provider,direct_intent_id,origem')
      .eq('id', transactionId)
      .maybeSingle()

    if (txError || !tx) {
      return new Response(JSON.stringify({ success: false, error: 'transaction_not_found' }), { status: 404, headers: corsHeaders })
    }

    // Compatibilidade total: qualquer transação anterior ou modo Mercado Pago
    // continua passando pela função original sem alterar regras de negócio.
    if (tx.payment_provider !== 'pix_direct') return proxyLegacy(req, body)

    if (!tx.direct_intent_id) {
      return new Response(JSON.stringify({ success: false, error: 'direct_intent_missing' }), { status: 409, headers: corsHeaders })
    }

    const { response: reconcileResponse, data: match } = await reconcile(tx.id)

    if (!reconcileResponse.ok) {
      const status = match?.error === 'ambiguous_direct_payment' ? 409 : reconcileResponse.status
      return new Response(JSON.stringify({
        success: false,
        error: match?.error || 'direct_reconcile_failed',
        message: match?.message,
      }), { status, headers: corsHeaders })
    }

    if (!match?.matched || !match?.provider_payment_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'payment_not_confirmed',
        status: String(match?.status || 'PENDING').toUpperCase(),
        payment_mode: 'free',
      }), { status: 400, headers: corsHeaders })
    }

    // Reutiliza o confirmador legado para preservar todos os efeitos atuais:
    // pedido, estoque, comissão, e-mail, WhatsApp e push. O ID financeiro real
    // fica também gravado na intenção direta, que é a fonte de auditoria do modo free.
    const { error: adaptError } = await supabase
      .from('pix_transactions')
      .update({
        payment_provider: 'mercadopago',
        txid: String(match.provider_payment_id),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tx.id)
      .eq('status', 'pending')

    if (adaptError) throw adaptError

    const legacy = await proxyLegacy(req, body)
    const text = await legacy.text()
    let payload: any = null
    try { payload = JSON.parse(text) } catch { payload = null }

    if (!legacy.ok || !payload?.success) {
      return new Response(text, { status: legacy.status, headers: corsHeaders })
    }

    return new Response(JSON.stringify({
      ...payload,
      payment_mode: 'free',
      original_amount_brl: (Number(tx.original_amount_cents ?? tx.amount_cents ?? 0) / 100).toFixed(2),
      amount_brl: (Number(tx.amount_cents || 0) / 100).toFixed(2),
      discount_cents: Number(tx.discount_cents || 0),
      direct_intent_id: tx.direct_intent_id,
    }), { headers: corsHeaders })
  } catch (error) {
    console.error('[confirmar-pix-assistente-v2]', error instanceof Error ? error.message : error)
    return new Response(JSON.stringify({ success: false, error: 'internal_error' }), { status: 500, headers: corsHeaders })
  }
})
