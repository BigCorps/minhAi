import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const LEGACY_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const BANCO_INTER_API_KEY = Deno.env.get('BANCO_INTER_API_KEY') || ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

function configuredSecret(): string {
  try {
    const parsed = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || 'null')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return ''
    const preferred = typeof (parsed as Record<string, unknown>).default === 'string'
      ? String((parsed as Record<string, unknown>).default)
      : ''
    if (preferred.startsWith('sb_secret_') && preferred.length > 'sb_secret_'.length) return preferred
    return Object.values(parsed).find((value) =>
      typeof value === 'string'
      && value.startsWith('sb_secret_')
      && value.length > 'sb_secret_'.length
    ) as string || ''
  } catch {
    return ''
  }
}

const ADMIN_KEY = configuredSecret() || LEGACY_SERVICE_ROLE

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors })
}

function uuid(value: unknown): string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : ''
}

function safeText(value: unknown, max = 500): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function bankStatus(raw: any): string {
  return safeText(raw?.status || raw?.situacao || raw?.state || '', 80).toUpperCase()
}

function isPaid(status: string) {
  return ['PAGO', 'REALIZADO', 'CONCLUIDO', 'CONCLUIDA'].includes(status)
}

function isFailed(status: string) {
  return ['ERRO', 'CANCELADO', 'CANCELADA', 'FALHOU', 'FAILED', 'REJEITADO', 'REJEITADA'].includes(status)
}

function rpcCode(error: any): string {
  const message = safeText(error?.message || error?.details || error, 1000)
  const known = [
    'invalid_request',
    'invalid_amount',
    'insufficient_balance',
    'withdrawal_pix_key_required',
    'withdrawal_net_nonpositive',
    'idempotency_conflict',
    'withdrawal_in_progress',
    'withdrawal_not_found',
    'invalid_withdrawal_state',
    'provider_txid_conflict',
    'withdrawal_already_transferred',
  ]
  return known.find(code => message.includes(code)) || 'withdrawal_unavailable'
}

function publicRequest(row: any, success?: boolean) {
  return {
    success: success ?? row?.status === 'transferred',
    withdrawal_id: row?.id || row?.withdrawal_id || null,
    status: row?.status || null,
    requested_amount_cents: Number(row?.requested_amount_cents || 0),
    fee_cents: Number(row?.fee_cents || 0),
    commission_cents: Number(row?.commission_cents || 0),
    net_amount_cents: Number(row?.net_amount_cents || 0),
    provider_txid: row?.provider_txid || null,
    error_code: row?.error_code || null,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ success: false, error: 'method_not_allowed' }, 405)
  if (!SUPABASE_URL || !ADMIN_KEY) return json({ success: false, error: 'service_unavailable' }, 503)

  const authorization = req.headers.get('authorization') || ''
  if (!authorization.startsWith('Bearer ')) return json({ success: false, error: 'unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, ADMIN_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const token = authorization.slice('Bearer '.length).trim()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  const user = userData?.user
  if (userError || !user?.id) return json({ success: false, error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body || Array.isArray(body)) return json({ success: false, error: 'invalid_request' }, 400)

  const action = body.action === undefined ? 'request' : String(body.action)
  const allowed = action === 'check'
    ? new Set(['action', 'withdrawal_id'])
    : new Set(['action', 'amount_cents', 'idempotency_key'])
  if (Object.keys(body).some(key => !allowed.has(key))) {
    return json({ success: false, error: 'invalid_request' }, 400)
  }

  async function loadWithdrawal(withdrawalId: string) {
    const { data, error } = await admin
      .from('withdrawal_requests')
      .select('id,user_id,status,requested_amount_cents,fee_cents,commission_cents,net_amount_cents,provider_txid,provider_status,error_code,provider_started_at,created_at')
      .eq('id', withdrawalId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async function release(withdrawalId: string, code: string, detail: string, status?: string) {
    const { data, error } = await admin.rpc('withdrawal_release_v1', {
      p_withdrawal_id: withdrawalId,
      p_user_id: user.id,
      p_error_code: code,
      p_error_detail: safeText(detail),
      p_provider_status: status || null,
    })
    if (error) throw error
    return data
  }

  async function finalize(withdrawalId: string, status: string) {
    const { data, error } = await admin.rpc('withdrawal_finalize_v1', {
      p_withdrawal_id: withdrawalId,
      p_user_id: user.id,
      p_provider_status: status,
    })
    if (error) throw error
    return data
  }

  async function markReconciliation(withdrawalId: string, code: string, detail: string) {
    const { data, error } = await admin.rpc('withdrawal_mark_reconciliation_v1', {
      p_withdrawal_id: withdrawalId,
      p_user_id: user.id,
      p_error_code: code,
      p_error_detail: safeText(detail),
    })
    if (error) throw error
    return data
  }

  async function checkProvider(row: any) {
    if (!row?.provider_txid) return publicRequest(row, false)
    if (!BANCO_INTER_API_KEY) return publicRequest(row, false)

    let response: Response
    try {
      response = await fetch(
        `https://inter.btsolucao.com.br/getpay.php?txid=${encodeURIComponent(String(row.provider_txid))}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${BANCO_INTER_API_KEY}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        },
      )
    } catch {
      return publicRequest(row, true)
    }

    const raw = await response.json().catch(() => ({}))
    const data = raw?.data || raw
    const status = bankStatus(data)

    if (response.ok && isPaid(status)) {
      const result = await finalize(row.id, status)
      const current = await loadWithdrawal(row.id)
      return publicRequest(current || result, true)
    }

    if (response.ok && isFailed(status)) {
      await release(row.id, 'provider_failed', status, status)
      const current = await loadWithdrawal(row.id)
      return publicRequest(current, false)
    }

    if (status) {
      await admin.from('withdrawal_requests')
        .update({ provider_status: status })
        .eq('id', row.id)
        .eq('user_id', user.id)
        .eq('status', 'processing')
    }

    const current = await loadWithdrawal(row.id)
    return publicRequest(current || row, true)
  }

  async function check(withdrawalId: string) {
    let row = await loadWithdrawal(withdrawalId)
    if (!row) return json({ success: false, error: 'withdrawal_not_found' }, 404)

    if (row.status === 'transferred') return json(publicRequest(row, true))
    if (row.status === 'released') return json(publicRequest(row, false))
    if (row.status === 'reconciliation_required') return json(publicRequest(row, false), 202)

    if (row.status === 'processing' && row.provider_txid) {
      const result = await checkProvider(row)
      return json(result, result.status === 'processing' ? 202 : 200)
    }

    if (row.status === 'sending') {
      const started = row.provider_started_at ? Date.parse(row.provider_started_at) : NaN
      if (Number.isFinite(started) && Date.now() - started > 30_000 && !row.provider_txid) {
        await markReconciliation(row.id, 'provider_response_missing', 'Provider response was not recorded.')
        row = await loadWithdrawal(row.id)
        return json(publicRequest(row, false), 202)
      }
      return json(publicRequest(row, true), 202)
    }

    return json(publicRequest(row, row.status === 'reserved'), 202)
  }

  if (action === 'check') {
    const withdrawalId = uuid(body.withdrawal_id)
    if (!withdrawalId) return json({ success: false, error: 'invalid_withdrawal_id' }, 400)
    try {
      return await check(withdrawalId)
    } catch (error) {
      console.error('[request-withdrawal] check failed', rpcCode(error))
      return json({ success: false, error: 'withdrawal_unavailable' }, 503)
    }
  }

  if (action !== 'request') return json({ success: false, error: 'invalid_action' }, 400)

  const amountCents = Number(body.amount_cents)
  const idempotencyKey = uuid(body.idempotency_key)
  if (!Number.isInteger(amountCents) || amountCents < 100 || !idempotencyKey) {
    return json({ success: false, error: 'invalid_request' }, 400)
  }

  let reserve: any
  try {
    const { data, error } = await admin.rpc('withdrawal_reserve_v1', {
      p_user_id: user.id,
      p_amount_cents: amountCents,
      p_idempotency_key: idempotencyKey,
    })
    if (error) {
      const code = rpcCode(error)
      if (['insufficient_balance', 'withdrawal_pix_key_required', 'withdrawal_net_nonpositive', 'idempotency_conflict', 'withdrawal_in_progress'].includes(code)) {
        return json({ success: false, error: code })
      }
      throw error
    }
    reserve = data
  } catch (error) {
    console.error('[request-withdrawal] reserve failed', rpcCode(error))
    return json({ success: false, error: 'withdrawal_unavailable' }, 503)
  }

  const withdrawalId = uuid(reserve?.withdrawal_id)
  if (!withdrawalId) return json({ success: false, error: 'withdrawal_unavailable' }, 503)

  if (reserve?.status === 'transferred') return json(publicRequest(reserve, true))
  if (reserve?.status === 'released') return json(publicRequest(reserve, false))
  if (reserve?.status === 'processing') return await check(withdrawalId)
  if (['sending', 'reconciliation_required'].includes(String(reserve?.status))) {
    return await check(withdrawalId)
  }

  let claim: any
  try {
    const { data, error } = await admin.rpc('withdrawal_claim_send_v1', {
      p_withdrawal_id: withdrawalId,
      p_user_id: user.id,
    })
    if (error) throw error
    claim = data
  } catch (error) {
    console.error('[request-withdrawal] claim failed', rpcCode(error))
    return json({ success: false, error: 'withdrawal_unavailable', withdrawal_id: withdrawalId }, 503)
  }

  if (claim?.send !== true) return await check(withdrawalId)

  if (!BANCO_INTER_API_KEY) {
    try {
      await release(withdrawalId, 'bank_not_configured', 'Banco Inter payout is not configured.')
    } catch {}
    return json({ success: false, status: 'released', withdrawal_id: withdrawalId, error: 'bank_not_configured' })
  }

  let payoutResponse: Response
  let payoutBody: any
  try {
    payoutResponse = await fetch('https://inter.btsolucao.com.br/pay.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BANCO_INTER_API_KEY}`,
      },
      body: JSON.stringify({
        nome: `Saque minhAi - ${withdrawalId.slice(0, 8)}`,
        amount: Number((Number(claim.net_amount_cents) / 100).toFixed(2)),
        chave: claim.pix_key,
      }),
      signal: AbortSignal.timeout(20000),
    })
    payoutBody = await payoutResponse.json().catch(() => ({}))
  } catch {
    try {
      await markReconciliation(withdrawalId, 'provider_timeout', 'Provider response was not received.')
    } catch {}
    const row = await loadWithdrawal(withdrawalId).catch(() => null)
    return json(publicRequest(row || { id: withdrawalId, status: 'reconciliation_required' }, false), 202)
  }

  const payoutStatus = bankStatus(payoutBody?.data || payoutBody)
  const providerTxid = safeText(payoutBody?.txid || payoutBody?.data?.txid, 255)

  if (providerTxid) {
    try {
      const { error } = await admin.rpc('withdrawal_record_provider_v1', {
        p_withdrawal_id: withdrawalId,
        p_user_id: user.id,
        p_provider_txid: providerTxid,
      })
      if (error) throw error
    } catch (error) {
      console.error('[request-withdrawal] record provider failed', rpcCode(error))

      // The PIX has already been submitted, so never send it again. Try one
      // single-row metadata fallback to preserve the provider txid. This does
      // not touch balances or commissions.
      const { data: recovered, error: recoveryError } = await admin
        .from('withdrawal_requests')
        .update({
          status: 'processing',
          provider_txid: providerTxid,
          provider_status: 'SUBMITTED_RECOVERED',
          provider_recorded_at: new Date().toISOString(),
          reconciliation_required_at: null,
          error_code: null,
          error_detail: null,
        })
        .eq('id', withdrawalId)
        .eq('user_id', user.id)
        .in('status', ['sending', 'reconciliation_required'])
        .is('provider_txid', null)
        .select('id')
        .maybeSingle()

      if (!recoveryError && recovered?.id) return await check(withdrawalId)

      try {
        await markReconciliation(
          withdrawalId,
          'provider_txid_persist_failed',
          `Provider txid received but not persisted: ${providerTxid}`,
        )
      } catch {}
      return json({ success: false, error: 'withdrawal_reconciliation_required', withdrawal_id: withdrawalId }, 202)
    }
    return await check(withdrawalId)
  }

  const explicitError = safeText(
    payoutBody?.error || payoutBody?.message || payoutBody?.detail || payoutBody?.title || payoutStatus,
    500,
  )

  if (payoutResponse.status >= 500) {
    try {
      await markReconciliation(withdrawalId, 'provider_server_error', explicitError || `HTTP ${payoutResponse.status}`)
    } catch {}
    const row = await loadWithdrawal(withdrawalId).catch(() => null)
    return json(publicRequest(row || { id: withdrawalId, status: 'reconciliation_required' }, false), 202)
  }

  if (!payoutResponse.ok || isFailed(payoutStatus) || payoutBody?.error) {
    try {
      await release(
        withdrawalId,
        'provider_rejected',
        explicitError || `HTTP ${payoutResponse.status}`,
        payoutStatus || `HTTP_${payoutResponse.status}`,
      )
    } catch (error) {
      console.error('[request-withdrawal] release failed', rpcCode(error))
      return json({ success: false, error: 'withdrawal_unavailable', withdrawal_id: withdrawalId }, 503)
    }
    const row = await loadWithdrawal(withdrawalId)
    return json(publicRequest(row, false))
  }

  try {
    await markReconciliation(withdrawalId, 'provider_txid_missing', 'Provider accepted the request without a recorded txid.')
  } catch {}
  const row = await loadWithdrawal(withdrawalId).catch(() => null)
  return json(publicRequest(row || { id: withdrawalId, status: 'reconciliation_required' }, false), 202)
})