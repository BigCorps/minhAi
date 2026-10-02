import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_VERSION = '2026-10-01'
const MAX_API_KEYS = 10
const MAX_WEBHOOKS = 10

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://pix.wiki',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-PixWiki-Version': API_VERSION,
}

function base64url(bytes: Uint8Array) {
  let value = ''
  for (const byte of bytes) value += String.fromCharCode(byte)
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomSecret(prefix: string) {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `${prefix}${base64url(bytes)}`
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function blockedIpv4(host: string) {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!match) return false
  const a = Number(match[1]), b = Number(match[2])
  if ([a, b, Number(match[3]), Number(match[4])].some(n => n < 0 || n > 255)) return true
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
}

function validateWebhookUrl(raw: string) {
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('invalid_webhook_url') }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid_webhook_url')
  if (url.port && url.port !== '443') throw new Error('invalid_webhook_port')
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:') || blockedIpv4(host)) {
    throw new Error('private_webhook_host_not_allowed')
  }
  return url.toString()
}

async function getUser(supabase: any, req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  return error ? null : data?.user
}

async function companyAllowed(supabase: any, userId: string, companyId: string | null) {
  if (!companyId) return true
  const { data } = await supabase.from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('user_id', userId)
    .eq('segment_key', 'pix_wiki')
    .maybeSingle()
  return !!data
}

async function sendTestWebhook(supabase: any, hook: any, secret: string) {
  const target = validateWebhookUrl(String(hook.url))
  const eventId = crypto.randomUUID()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const createdAt = new Date().toISOString()
  const payload = {
    id: eventId,
    event: 'pix.received.test',
    type: 'pix.received.test',
    api_version: API_VERSION,
    created_at: createdAt,
    livemode: false,
    test: true,
    data: {
      receipt_id: 'test',
      company: { id: hook.company_id ?? 'test-company', name: 'Empresa de teste', slug: 'teste' },
      mp_payment_id: null,
      source: 'api',
      provider_source: 'test',
      amount_cents: 100,
      original_amount_cents: 100,
      discount_cents: 0,
      fee_amount_cents: 0,
      net_amount_cents: 100,
      currency: 'BRL',
      status: 'approved',
      received_at: createdAt,
      context: {
        checkout_id: 'test-checkout',
        external_id: 'PEDIDO-TESTE',
        description: 'Webhook de teste PixWiki',
        customer: { name: 'Cliente Teste', email: null, phone: null },
        metadata: { test: true },
      },
    },
  }
  const raw = JSON.stringify(payload)
  const signature = await hmacHex(secret, `${timestamp}.${raw}`)
  const started = Date.now()

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PixWiki-Webhooks/2.0',
        'X-PixWiki-Event': 'pix.received.test',
        'X-PixWiki-Event-Id': eventId,
        'X-PixWiki-Timestamp': timestamp,
        'X-PixWiki-Version': API_VERSION,
        'X-PixWiki-Signature': `v1=${signature}`,
        'Idempotency-Key': eventId,
      },
      body: raw,
      signal: AbortSignal.timeout(8000),
    })
    const responseBody = (await response.text()).slice(0, 500)
    await supabase.from('pixwiki_webhooks').update({
      last_status_code: response.status,
      last_success_at: response.ok ? new Date().toISOString() : hook.last_success_at,
      last_failure_at: response.ok ? hook.last_failure_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', hook.id)
    return { ok: response.ok, status: response.status, duration_ms: Date.now() - started, response_body: responseBody }
  } catch (error) {
    await supabase.from('pixwiki_webhooks').update({
      last_failure_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', hook.id)
    return { ok: false, status: null, duration_ms: Date.now() - started, error: error instanceof Error ? error.message : 'delivery_failed' }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed', api_version: API_VERSION }), { status: 405, headers })
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const user = await getUser(supabase, req)
    if (!user) return new Response(JSON.stringify({ error: 'not_authenticated', api_version: API_VERSION }), { status: 401, headers })

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '')

    if (action === 'list_keys') {
      const { data, error } = await supabase.from('pixwiki_api_keys')
        .select('id,name,key_prefix,last_used_at,revoked_at,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify({ ok: true, api_version: API_VERSION, keys: data || [] }), { headers })
    }

    if (action === 'create_key') {
      const { count } = await supabase.from('pixwiki_api_keys')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('revoked_at', null)
      if (Number(count || 0) >= MAX_API_KEYS) {
        return new Response(JSON.stringify({ error: 'api_key_limit_reached', api_version: API_VERSION }), { status: 409, headers })
      }

      const name = String(body?.name || 'Chave API').trim().slice(0, 80)
      if (!name) return new Response(JSON.stringify({ error: 'name_required', api_version: API_VERSION }), { status: 400, headers })
      const raw = randomSecret('pw_live_')
      const hash = await sha256(raw)
      const prefix = raw.slice(0, 18)
      const { data, error } = await supabase.from('pixwiki_api_keys')
        .insert({ user_id: user.id, name, key_prefix: prefix, key_hash: hash })
        .select('id,name,key_prefix,created_at')
        .single()
      if (error) throw error
      return new Response(JSON.stringify({ ok: true, api_version: API_VERSION, key: data, secret: raw, show_once: true }), { headers })
    }

    if (action === 'revoke_key') {
      const id = String(body?.key_id || '')
      const { error } = await supabase.from('pixwiki_api_keys')
        .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true, api_version: API_VERSION }), { headers })
    }

    if (action === 'list_webhooks') {
      const { data: hooks, error } = await supabase.from('pixwiki_webhooks')
        .select('id,company_id,name,url,is_active,event_types,last_success_at,last_failure_at,last_status_code,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const ids = (hooks || []).map((hook: any) => hook.id)
      let deliveries: any[] = []
      if (ids.length) {
        const result = await supabase.from('pixwiki_webhook_deliveries')
          .select('webhook_id,status,attempt_count,created_at,delivered_at,response_status,last_error')
          .in('webhook_id', ids)
          .order('created_at', { ascending: false })
          .limit(100)
        deliveries = result.data || []
      }
      return new Response(JSON.stringify({ ok: true, api_version: API_VERSION, webhooks: hooks || [], deliveries }), { headers })
    }

    if (action === 'create_webhook') {
      const { count } = await supabase.from('pixwiki_webhooks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (Number(count || 0) >= MAX_WEBHOOKS) {
        return new Response(JSON.stringify({ error: 'webhook_limit_reached', api_version: API_VERSION }), { status: 409, headers })
      }

      const name = String(body?.name || 'Webhook').trim().slice(0, 80)
      const url = validateWebhookUrl(String(body?.url || '').trim())
      const companyId = body?.company_id ? String(body.company_id) : null
      if (!(await companyAllowed(supabase, user.id, companyId))) {
        return new Response(JSON.stringify({ error: 'company_not_allowed', api_version: API_VERSION }), { status: 403, headers })
      }

      const { data: hook, error } = await supabase.from('pixwiki_webhooks').insert({
        user_id: user.id,
        company_id: companyId,
        name,
        url,
        event_types: ['pix.received'],
        is_active: true,
      }).select('id,company_id,name,url,is_active,event_types,created_at').single()
      if (error) throw error

      const signingSecret = randomSecret('whsec_')
      const { error: secretError } = await supabase.from('pixwiki_webhook_secrets')
        .insert({ webhook_id: hook.id, signing_secret: signingSecret })
      if (secretError) {
        await supabase.from('pixwiki_webhooks').delete().eq('id', hook.id)
        throw secretError
      }

      return new Response(JSON.stringify({
        ok: true,
        api_version: API_VERSION,
        webhook: hook,
        signing_secret: signingSecret,
        show_once: true,
      }), { headers })
    }

    if (action === 'update_webhook') {
      const id = String(body?.webhook_id || '')
      const { data: existing } = await supabase.from('pixwiki_webhooks')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!existing) return new Response(JSON.stringify({ error: 'webhook_not_found', api_version: API_VERSION }), { status: 404, headers })

      const update: any = { updated_at: new Date().toISOString() }
      if (body?.url !== undefined) update.url = validateWebhookUrl(String(body.url).trim())
      if (body?.name !== undefined) update.name = String(body.name).trim().slice(0, 80) || 'Webhook'
      if (body?.is_active !== undefined) update.is_active = body.is_active === true
      if (body?.company_id !== undefined) {
        const companyId = body.company_id ? String(body.company_id) : null
        if (!(await companyAllowed(supabase, user.id, companyId))) {
          return new Response(JSON.stringify({ error: 'company_not_allowed', api_version: API_VERSION }), { status: 403, headers })
        }
        update.company_id = companyId
      }

      const { data, error } = await supabase.from('pixwiki_webhooks')
        .update(update)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id,company_id,name,url,is_active,event_types,last_success_at,last_failure_at,last_status_code,updated_at')
        .single()
      if (error) throw error
      return new Response(JSON.stringify({ ok: true, api_version: API_VERSION, webhook: data }), { headers })
    }

    if (action === 'delete_webhook') {
      const { error } = await supabase.from('pixwiki_webhooks')
        .delete()
        .eq('id', String(body?.webhook_id || ''))
        .eq('user_id', user.id)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true, api_version: API_VERSION }), { headers })
    }

    if (action === 'rotate_webhook_secret') {
      const id = String(body?.webhook_id || '')
      const { data: hook } = await supabase.from('pixwiki_webhooks')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!hook) return new Response(JSON.stringify({ error: 'webhook_not_found', api_version: API_VERSION }), { status: 404, headers })

      const signingSecret = randomSecret('whsec_')
      const { error } = await supabase.from('pixwiki_webhook_secrets')
        .update({ signing_secret: signingSecret, rotated_at: new Date().toISOString() })
        .eq('webhook_id', id)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true, api_version: API_VERSION, signing_secret: signingSecret, show_once: true }), { headers })
    }

    if (action === 'test_webhook') {
      const id = String(body?.webhook_id || '')
      const [{ data: hook }, { data: secretRow }] = await Promise.all([
        supabase.from('pixwiki_webhooks').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
        supabase.from('pixwiki_webhook_secrets').select('signing_secret').eq('webhook_id', id).maybeSingle(),
      ])
      if (!hook || !secretRow?.signing_secret) {
        return new Response(JSON.stringify({ error: 'webhook_not_found', api_version: API_VERSION }), { status: 404, headers })
      }
      const result = await sendTestWebhook(supabase, hook, String(secretRow.signing_secret))
      return new Response(JSON.stringify({ ok: result.ok, api_version: API_VERSION, result }), { status: result.ok ? 200 : 502, headers })
    }

    return new Response(JSON.stringify({ error: 'invalid_action', api_version: API_VERSION }), { status: 400, headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    console.error('[pixwiki-api-admin]', message)
    const status = message.includes('webhook') || message.includes('private_') ? 400 : 500
    return new Response(JSON.stringify({ error: message, api_version: API_VERSION }), { status, headers })
  }
})
