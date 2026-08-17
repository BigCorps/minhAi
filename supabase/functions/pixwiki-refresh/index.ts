import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://pix.wiki',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'not_authenticated' }, 401)

    const { data: authData, error: authError } = await admin.auth.getUser(token)
    const user = authData?.user
    if (authError || !user) return json({ error: 'not_authenticated' }, 401)

    const body = await req.json().catch(() => ({}))
    const companyId = String(body?.company_id || '')
    if (!companyId) return json({ error: 'company_id_required' }, 400)

    const { data: company } = await admin.from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .eq('segment_key', 'pix_wiki')
      .maybeSingle()
    if (!company) return json({ error: 'company_not_allowed' }, 403)

    const { data: connection } = await admin.from('pixwiki_mp_connections')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!connection) return json({ error: 'mercado_pago_not_connected' }, 409)

    const { data: state } = await admin.from('pixwiki_sync_state')
      .select('last_sync_at')
      .eq('mp_connection_id', connection.id)
      .maybeSingle()

    const last = state?.last_sync_at ? new Date(state.last_sync_at).getTime() : 0
    const elapsed = Date.now() - last
    if (last && elapsed >= 0 && elapsed < 8000) {
      return json({ ok: true, recent: true, retry_after_ms: 8000 - elapsed })
    }

    const { data: secretRow } = await admin.from('pixwiki_internal_secrets')
      .select('secret')
      .eq('key', 'sync_cron')
      .maybeSingle()
    if (!secretRow?.secret) throw new Error('sync_secret_missing')

    const response = await fetch(`${SUPABASE_URL}/functions/v1/pixwiki-sync-mp-receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pixwiki-cron-key': String(secretRow.secret),
      },
      body: JSON.stringify({ company_id: companyId }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok || payload?.ok === false) {
      console.error('[pixwiki-refresh] sync failed', response.status)
      return json({ error: 'refresh_failed' }, 502)
    }

    const result = Array.isArray(payload?.results) ? payload.results[0] : null
    return json({ ok: true, recent: false, found: Number(result?.new_count || 0), synced_at: new Date().toISOString() })
  } catch (error) {
    console.error('[pixwiki-refresh]', error instanceof Error ? error.message : 'internal_error')
    return json({ error: 'internal_error' }, 500)
  }
})
