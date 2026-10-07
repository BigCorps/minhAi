import { createClient } from 'jsr:@supabase/supabase-js@2'
import { isInternalServiceRequest } from '../_shared/internal-service-auth.ts'
import { verifyPixCancelCapability } from '../_shared/pix-cancel-capability.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : ''
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

async function canManageCompany(req: Request, companyId: string): Promise<boolean> {
  const authorization = req.headers.get('authorization') || ''
  if (!authorization.startsWith('Bearer ') || !ANON_KEY || !SUPABASE_URL) return false
  try {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    })
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData?.user?.id) return false
    const { data, error } = await client.rpc('app_can_manage_company', { p_company_id: companyId })
    return !error && data === true
  } catch { return false }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ success: false, error: 'method_not_allowed' }, 405)
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ success: false, error: 'service_unavailable' }, 503)

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const allowed = new Set(['transaction_id', 'company_id', 'cancel_capability'])
  if (!body || Array.isArray(body) || Object.keys(body).some(key => !allowed.has(key))) return json({ success: false, error: 'invalid_request' }, 400)
  const transactionId = uuid(body.transaction_id), companyId = uuid(body.company_id)
  if (!transactionId || !companyId) return json({ success: false, error: 'invalid_scope' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: tx, error: txError } = await admin.from('pix_transactions')
    .select('id,company_id,status,payment_provider,direct_intent_id,expires_at')
    .eq('id', transactionId).eq('company_id', companyId).maybeSingle()
  if (txError) return json({ success: false, error: 'cancel_unavailable' }, 503)
  if (!tx) return json({ success: false, error: 'transaction_not_found' }, 404)

  const internal = isInternalServiceRequest(req)
  const capability = internal ? false : await verifyPixCancelCapability(body.cancel_capability, tx.id, tx.company_id, tx.expires_at)
  const manager = internal || capability ? false : await canManageCompany(req, companyId)
  if (!internal && !capability && !manager) return json({ success: false, error: 'forbidden' }, 403)

  if (['cancelled', 'canceled'].includes(String(tx.status))) return json({ success: true, status: 'cancelled', already_cancelled: true })
  if (tx.status === 'confirmed') return json({ success: false, error: 'already_confirmed' }, 409)
  if (tx.status === 'transferred') return json({ success: false, error: 'already_transferred' }, 409)
  if (tx.status !== 'pending') return json({ success: false, error: 'not_cancellable' }, 409)

  const now = new Date().toISOString()
  const { data: cancelled, error: cancelError } = await admin.from('pix_transactions')
    .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
    .eq('id', tx.id).eq('company_id', companyId).eq('status', 'pending')
    .select('id').maybeSingle()
  if (cancelError) return json({ success: false, error: 'cancel_unavailable' }, 503)
  if (!cancelled) {
    const { data: current } = await admin.from('pix_transactions').select('status').eq('id', tx.id).eq('company_id', companyId).maybeSingle()
    if (['cancelled', 'canceled'].includes(String(current?.status))) return json({ success: true, status: 'cancelled', already_cancelled: true })
    return json({ success: false, error: current?.status === 'confirmed' ? 'already_confirmed' : current?.status === 'transferred' ? 'already_transferred' : 'cancel_conflict' }, 409)
  }

  if (tx.direct_intent_id) {
    const { error: intentError } = await admin.from('pix_direct_intents')
      .update({ status: 'cancelled', updated_at: now })
      .eq('id', tx.direct_intent_id).eq('company_id', companyId).eq('status', 'pending')
    if (intentError) console.warn('[cancelar-pix-assistente-v2] direct_intent_sync_failed')
  }
  return json({ success: true, status: 'cancelled' })
})
