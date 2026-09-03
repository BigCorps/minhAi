import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ONESIGNAL_APP_ID = Deno.env.get('PIXWIKI_ONESIGNAL_APP_ID') ?? ''
const ONESIGNAL_API_KEY = Deno.env.get('PIXWIKI_ONESIGNAL_REST_API_KEY') ?? ''
const headers = { 'Content-Type': 'application/json' }

type Channel = 'email' | 'push' | 'whatsapp'
type Status = 'sent' | 'skipped' | 'failed' | 'waiting_config'
type ChannelResult = {
  channel: Channel
  status: Status
  provider_message_id?: string | null
  recipient?: string | null
  error?: string | null
}

function money(cents: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(cents ?? 0) / 100)
}

async function getSecret(supabase: any, key: string) {
  const { data, error } = await supabase
    .from('pixwiki_internal_secrets')
    .select('secret')
    .eq('key', key)
    .maybeSingle()
  if (error || !data?.secret) {
    throw new Error(`Segredo interno PixWiki indisponível: ${key}`)
  }
  return String(data.secret)
}

async function authenticateInternal(supabase: any, req: Request) {
  return (
    (req.headers.get('x-pixwiki-internal-key') ?? '') ===
    (await getSecret(supabase, 'notify_internal'))
  )
}

async function existingLog(
  supabase: any,
  receiptId: string,
  channel: Channel,
) {
  const { data } = await supabase
    .from('pixwiki_notification_logs')
    .select('id,status,attempts,provider_message_id,recipient,error')
    .eq('receipt_id', receiptId)
    .eq('channel', channel)
    .maybeSingle()
  return data
}

async function startAttempt(
  supabase: any,
  receipt: any,
  channel: Channel,
  forceRetry: boolean,
) {
  const existing = await existingLog(supabase, receipt.id, channel)
  if (
    existing &&
    !forceRetry &&
    ['sent', 'skipped', 'waiting_config'].includes(existing.status)
  ) {
    return { alreadyDone: true, log: existing }
  }

  const attempts = Number(existing?.attempts ?? 0) + 1
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('pixwiki_notification_logs')
    .upsert(
      {
        receipt_id: receipt.id,
        company_id: receipt.company_id,
        user_id: receipt.user_id,
        channel,
        status: 'processing',
        attempts,
        last_attempt_at: now,
        error: null,
        updated_at: now,
      },
      { onConflict: 'receipt_id,channel' },
    )
    .select('id,status,attempts')
    .single()

  if (error) {
    throw new Error(`Falha ao preparar log ${channel}: ${error.message}`)
  }
  return { alreadyDone: false, log: data }
}

async function finishAttempt(
  supabase: any,
  receiptId: string,
  result: ChannelResult,
) {
  const now = new Date().toISOString()
  const update: any = {
    status: result.status,
    provider_message_id: result.provider_message_id ?? null,
    recipient: result.recipient ?? null,
    error: result.error ? String(result.error).slice(0, 1500) : null,
    updated_at: now,
  }
  if (result.status === 'sent') update.sent_at = now

  await supabase
    .from('pixwiki_notification_logs')
    .update(update)
    .eq('receipt_id', receiptId)
    .eq('channel', result.channel)
}

async function sendEmail(
  receipt: any,
  secret: string,
): Promise<ChannelResult> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/pixwiki-send-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pixwiki-internal-key': secret,
      },
      body: JSON.stringify({ receipt_id: receipt.id }),
    },
  )
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload?.ok === false) {
    return {
      channel: 'email',
      status: 'failed',
      error: payload?.error ?? `HTTP ${response.status}`,
    }
  }
  if (payload?.skipped) {
    return {
      channel: 'email',
      status: 'skipped',
      recipient: payload?.recipient ?? null,
      error: payload?.reason ?? null,
    }
  }
  return {
    channel: 'email',
    status: 'sent',
    recipient: payload?.recipient ?? null,
    provider_message_id: payload?.provider_message_id ?? null,
  }
}

async function sendPush(
  supabase: any,
  receipt: any,
  companyName: string,
): Promise<ChannelResult> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    return {
      channel: 'push',
      status: 'waiting_config',
      error: 'OneSignal PixWiki ainda não configurado',
    }
  }

  const { data: deviceRows } = await supabase
    .from('pixwiki_push_subscriptions')
    .select('subscription_id')
    .eq('user_id', receipt.user_id)
    .eq('is_active', true)

  const subscriptionIds = (deviceRows ?? [])
    .map((row: any) => String(row.subscription_id))
    .filter(Boolean)

  if (subscriptionIds.length === 0) {
    return {
      channel: 'push',
      status: 'skipped',
      recipient: String(receipt.user_id),
      error: 'Usuário ainda não assinou Push no PixWiki',
    }
  }

  const sourceLabel =
    receipt.source === 'pixwiki_link' ? 'Pix Link' : 'Chave Pix'
  const amount = money(receipt.amount_cents)

  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_subscription_ids: subscriptionIds,
      headings: { pt: 'Pix recebido ✅', en: 'Pix recebido ✅' },
      contents: {
        pt: `${amount} · ${companyName} · ${sourceLabel}`,
        en: `${amount} · ${companyName} · ${sourceLabel}`,
      },
      url: 'https://pix.wiki/dashboard',
      data: {
        receipt_id: receipt.id,
        company_id: receipt.company_id,
        source: receipt.source,
      },
      idempotency_key: String(receipt.id),
    }),
  })
  const payload = await response.json().catch(() => ({}))
  const errorText = JSON.stringify(
    payload?.errors ?? payload ?? { http: response.status },
  )

  if (!response.ok || payload?.errors) {
    if (errorText.includes('All included players are not subscribed')) {
      return {
        channel: 'push',
        status: 'skipped',
        recipient: `${subscriptionIds.length} dispositivo(s)`,
        error: 'Subscriptions registradas não estão mais inscritas no OneSignal',
      }
    }
    return {
      channel: 'push',
      status: 'failed',
      recipient: `${subscriptionIds.length} dispositivo(s)`,
      error: errorText.slice(0, 1200),
    }
  }

  if (!payload?.id) {
    return {
      channel: 'push',
      status: 'skipped',
      recipient: `${subscriptionIds.length} dispositivo(s)`,
      error: 'Nenhuma assinatura Push válida para este usuário',
    }
  }

  return {
    channel: 'push',
    status: 'sent',
    provider_message_id: String(payload.id),
    recipient: `${subscriptionIds.length} dispositivo(s)`,
  }
}

async function sendWhatsApp(
  receipt: any,
  secret: string,
): Promise<ChannelResult> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/pixwiki-send-whatsapp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pixwiki-internal-key': secret,
      },
      body: JSON.stringify({ receipt_id: receipt.id }),
    },
  )
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload?.ok === false) {
    return {
      channel: 'whatsapp',
      status: 'failed',
      error: payload?.error ?? `HTTP ${response.status}`,
    }
  }
  if (payload?.skipped) {
    return {
      channel: 'whatsapp',
      status: 'skipped',
      recipient: payload?.destination_suffix
        ? `••••${payload.destination_suffix}`
        : null,
      error: payload?.reason ?? null,
    }
  }
  return {
    channel: 'whatsapp',
    status: 'sent',
    provider_message_id: payload?.provider_message_id ?? null,
    recipient: payload?.destination_suffix
      ? `••••${payload.destination_suffix}`
      : null,
    error: payload?.mode ? `mode:${payload.mode}` : null,
  }
}

async function dispatchWebhook(supabase: any, receiptId: string) {
  const secret = await getSecret(supabase, 'webhook_internal')
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/pixwiki-webhook-dispatch`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pixwiki-internal-key': secret,
      },
      body: JSON.stringify({ receipt_id: receiptId }),
    },
  )
  const payload = await response.json().catch(() => ({}))
  return {
    ok: response.ok && payload?.ok !== false,
    status: response.status,
    payload,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers,
    })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  let claimedReceiptId = ''
  let claimOwner = ''

  try {
    if (!(await authenticateInternal(supabase, req))) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers,
      })
    }

    const internalSecret = await getSecret(supabase, 'notify_internal')
    const body = await req.json().catch(() => ({}))
    const receiptId = String(body?.receipt_id ?? '')
    const allowHistorical = body?.allow_historical === true
    const forceRetry = body?.force_retry === true
    const onlyChannels: Channel[] | null = Array.isArray(body?.channels)
      ? (body.channels.filter((x: unknown) =>
          ['email', 'push', 'whatsapp'].includes(String(x)),
        ) as Channel[])
      : null

    if (!receiptId) {
      return new Response(JSON.stringify({ error: 'receipt_id_required' }), {
        status: 400,
        headers,
      })
    }

    const { data: receipt, error: receiptError } = await supabase
      .from('mp_received_payments')
      .select(
        'id,company_id,user_id,amount_cents,fee_amount_cents,net_amount_cents,source,status,notification_eligible,notified_at',
      )
      .eq('id', receiptId)
      .maybeSingle()

    if (receiptError || !receipt) {
      return new Response(JSON.stringify({ error: 'receipt_not_found' }), {
        status: 404,
        headers,
      })
    }

    if (!allowHistorical && !receipt.notification_eligible) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'historical_receipt' }),
        { headers },
      )
    }

    if (receipt.status !== 'approved') {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'not_approved' }),
        { headers },
      )
    }

    // Proteção global contra webhook + fast watcher + cron detectarem o mesmo
    // recebimento ao mesmo tempo. Force retry continua disponível para operação
    // manual explícita.
    if (!forceRetry) {
      claimOwner = `pixwiki-notify:${crypto.randomUUID()}`
      const { data: claimed, error: claimError } = await supabase.rpc(
        'pixwiki_claim_receipt_notification',
        {
          p_receipt_id: receipt.id,
          p_owner: claimOwner,
          p_claim_ttl_seconds: 120,
        },
      )

      if (claimError) throw claimError
      if (!claimed) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            reason: 'already_processing_or_notified',
          }),
          { headers },
        )
      }
      claimedReceiptId = receipt.id
    }

    const [{ data: settings }, { data: company }] = await Promise.all([
      supabase
        .from('pixwiki_notification_settings')
        .select(
          'email_enabled,push_enabled,whatsapp_enabled,notification_email,notification_phone',
        )
        .eq('company_id', receipt.company_id)
        .maybeSingle(),
      supabase
        .from('companies')
        .select('name')
        .eq('id', receipt.company_id)
        .maybeSingle(),
    ])

    const companyName = company?.name || 'Seu recebedor'
    const enabled: Channel[] = []
    if (settings?.email_enabled !== false) enabled.push('email')
    if (settings?.push_enabled !== false) enabled.push('push')
    if (settings?.whatsapp_enabled === true) enabled.push('whatsapp')

    const channels = onlyChannels
      ? enabled.filter((channel) => onlyChannels.includes(channel))
      : enabled
    const results: ChannelResult[] = []

    for (const channel of channels) {
      const started = await startAttempt(
        supabase,
        receipt,
        channel,
        forceRetry,
      )

      if (started.alreadyDone) {
        results.push({
          channel,
          status: started.log.status as Status,
          provider_message_id: started.log.provider_message_id,
          recipient: started.log.recipient,
          error: started.log.error,
        })
        continue
      }

      let result: ChannelResult
      try {
        if (channel === 'email') {
          result = await sendEmail(receipt, internalSecret)
        } else if (channel === 'push') {
          result = await sendPush(supabase, receipt, companyName)
        } else {
          result = await sendWhatsApp(receipt, internalSecret)
        }
      } catch (error) {
        result = {
          channel,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      }

      await finishAttempt(supabase, receipt.id, result)
      results.push(result)
    }

    let webhook: any = null
    if (receipt.notification_eligible === true) {
      try {
        webhook = await dispatchWebhook(supabase, receipt.id)
      } catch (error) {
        webhook = {
          ok: false,
          error:
            error instanceof Error ? error.message : 'webhook_dispatch_failed',
        }
      }
    }

    const now = new Date().toISOString()
    await supabase
      .from('mp_received_payments')
      .update({
        notified_at: now,
        notification_claimed_at: null,
        notification_claim_owner: null,
        updated_at: now,
      })
      .eq('id', receipt.id)

    claimedReceiptId = ''
    claimOwner = ''

    return new Response(
      JSON.stringify({ ok: true, receipt_id: receipt.id, results, webhook }),
      { headers },
    )
  } catch (error) {
    if (claimedReceiptId && claimOwner) {
      await supabase.rpc('pixwiki_release_receipt_notification_claim', {
        p_receipt_id: claimedReceiptId,
        p_owner: claimOwner,
      })
    }

    const message = error instanceof Error ? error.message : 'Erro interno'
    console.error('[pixwiki-notify]', message)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers,
    })
  }
})
