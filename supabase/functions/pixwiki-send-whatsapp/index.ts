import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const jsonHeaders = { 'Content-Type': 'application/json' }

function money(cents: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents ?? 0) / 100)
}

function formatDate(value: string | null | undefined) {
  const d = value ? new Date(value) : new Date()
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('55') ? digits : `55${digits}`
}

async function internalSecret(supabase: any) {
  const { data } = await supabase.from('pixwiki_internal_secrets').select('secret').eq('key', 'notify_internal').maybeSingle()
  if (!data?.secret) throw new Error('Segredo interno PixWiki indisponível')
  return String(data.secret)
}

async function checkoutContext(supabase: any, receipt: any) {
  const { data: byReceipt } = await supabase.from('pixwiki_v2_checkout_sessions')
    .select('id,origin,external_id')
    .eq('company_id', receipt.company_id).eq('receipt_id', receipt.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (byReceipt) return byReceipt
  if (!receipt.mp_payment_id) return null
  const { data: byProvider } = await supabase.from('pixwiki_v2_checkout_sessions')
    .select('id,origin,external_id')
    .eq('company_id', receipt.company_id).eq('provider_payment_id', String(receipt.mp_payment_id))
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return byProvider || null
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: jsonHeaders })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  try {
    const supplied = req.headers.get('x-pixwiki-internal-key') ?? ''
    const secret = await internalSecret(supabase)
    if (!supplied || supplied !== secret) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: jsonHeaders })

    const body = await req.json().catch(() => ({}))
    const receiptId = String(body?.receipt_id ?? '')
    const dryRun = body?.dry_run === true
    if (!receiptId) return new Response(JSON.stringify({ error: 'receipt_id_required' }), { status: 400, headers: jsonHeaders })

    const { data: receipt, error: receiptError } = await supabase.from('mp_received_payments')
      .select('id,company_id,user_id,mp_payment_id,amount_cents,net_amount_cents,fee_amount_cents,source,status,date_approved,date_created,created_at')
      .eq('id', receiptId).maybeSingle()
    if (receiptError || !receipt) return new Response(JSON.stringify({ error: 'receipt_not_found' }), { status: 404, headers: jsonHeaders })
    if (receipt.status !== 'approved') return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'not_approved' }), { headers: jsonHeaders })

    const [{ data: settings }, { data: company }, checkout] = await Promise.all([
      supabase.from('pixwiki_notification_settings').select('whatsapp_enabled,notification_phone').eq('company_id', receipt.company_id).maybeSingle(),
      supabase.from('companies').select('id,name,whatsapp_number,segment_key').eq('id', receipt.company_id).maybeSingle(),
      checkoutContext(supabase, receipt),
    ])

    // V2: o direito de usar WhatsApp é controlado pelo pixwiki-notify por franquia/overage.
    // Esta função só valida se o canal está habilitado e possui destinatário válido.
    if (settings?.whatsapp_enabled !== true) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'whatsapp_disabled' }), { headers: jsonHeaders })
    }

    const phone = normalizePhone(settings?.notification_phone || company?.whatsapp_number)
    if (phone.length < 12 || phone.length > 15) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'notification_phone_required' }), { headers: jsonHeaders })
    }

    const canonicalSource = checkout?.origin || (receipt.source === 'pixwiki_link' ? 'pix_link' : 'pix_key')
    const sourceLabel = ({ pix_key: 'Chave Pix', pix_link: 'Pix Link', checkout: 'Checkout', api: 'API' } as Record<string,string>)[canonicalSource] || 'Pix'
    const amountLabel = money(receipt.amount_cents)
    const netLabel = money(receipt.net_amount_cents)
    const when = formatDate(receipt.date_approved || receipt.date_created || receipt.created_at)
    const companyName = company?.name || 'PixWiki'
    const txid = receipt.mp_payment_id || receipt.id
    const valorFmt = (Number(receipt.amount_cents || 0) / 100).toFixed(2).replace('.', ',')

    const pixData = {
      valor: valorFmt,
      assistente: companyName,
      data_hora: when,
      txid,
    }

    const reference = checkout?.external_id ? `\n🧾 Referência: ${checkout.external_id}` : ''
    const message = `💰 *PIX Recebido!*\n\n✅ Valor: *${amountLabel}*\n🏢 Empresa: ${companyName}\n🔎 Forma: ${sourceLabel}${reference}\n🕐 ${when}\n${Number(receipt.fee_amount_cents || 0) > 0 ? `💳 Tarifa Mercado Pago: ${money(receipt.fee_amount_cents)}\n` : ''}💵 Líquido: ${netLabel}\n🔑 ID: ${txid}\n\nO dinheiro foi recebido diretamente na sua conta Mercado Pago.\nPixWiki não cobra percentual sobre esta venda.`

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true,
        dry_run: true,
        can_send: true,
        destination_suffix: phone.slice(-4),
        source: canonicalSource,
        amount_cents: receipt.amount_cents,
      }), { headers: jsonHeaders })
    }

    // O enviar-whatsapp existente resolve o destinatário por companies.whatsapp_number.
    // Mantemos o número operacional sincronizado sem alterar outros segmentos.
    if (company?.segment_key === 'pix_wiki' && normalizePhone(company?.whatsapp_number) !== phone) {
      await supabase.from('companies').update({ whatsapp_number: phone, updated_at: new Date().toISOString() }).eq('id', receipt.company_id)
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/enviar-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({ company_id: receipt.company_id, pix_data: pixData, message }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok || payload?.success === false) {
      return new Response(JSON.stringify({ ok: false, error: payload?.error || `HTTP ${response.status}` }), { status: 502, headers: jsonHeaders })
    }

    return new Response(JSON.stringify({
      ok: true,
      sent: true,
      mode: payload?.template ? 'template' : payload?.direct ? 'direct' : 'fallback',
      provider_message_id: payload?.message_id ?? null,
      destination_suffix: phone.slice(-4),
      source: canonicalSource,
    }), { headers: jsonHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    console.error('[pixwiki-send-whatsapp]', message)
    return new Response(JSON.stringify({ ok: false, error: message }), { status: 500, headers: jsonHeaders })
  }
})
