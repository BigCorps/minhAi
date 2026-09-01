import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers })

  const body = await req.json().catch(() => ({})) as Record<string, any>
  const companyId = String(body.company_id || '')
  if (!companyId) return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  const { data: company } = await supabase
    .from('companies')
    .select('id,slug,is_active,segment_key')
    .eq('id', companyId)
    .eq('segment_key', 'pix_wiki')
    .eq('is_active', true)
    .maybeSingle()

  if (!company) return new Response(JSON.stringify({ error: 'company_not_found' }), { status: 404, headers })

  const { data: canServe } = await supabase.rpc('pixwiki_can_serve_subdomain', { p_slug: company.slug })
  if (!canServe) return new Response(JSON.stringify({ error: 'pix_link_plan_required' }), { status: 403, headers })

  const [{ data: pref }, { data: settings }] = await Promise.all([
    supabase.from('pix_payment_preferences')
      .select('mode,allow_payer_choice')
      .eq('company_id', companyId)
      .eq('product', 'pixwiki')
      .maybeSingle(),
    supabase.from('pixwiki_payment_settings')
      .select('pix_key,mp_connection_id')
      .eq('company_id', companyId)
      .maybeSingle(),
  ])

  let mpAvailable = false
  if (settings?.mp_connection_id) {
    const { data: connection } = await supabase
      .from('pixwiki_mp_connections')
      .select('id')
      .eq('id', settings.mp_connection_id)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .not('mp_user_id', 'is', null)
      .maybeSingle()
    mpAvailable = !!connection
  }

  const freeAvailable = mpAvailable && !!String(settings?.pix_key || '').trim()
  const defaultMode = pref?.mode === 'free' && freeAvailable ? 'free' : 'mercadopago'
  const allowChoice = !!pref?.allow_payer_choice && freeAvailable && mpAvailable

  return new Response(JSON.stringify({
    success: true,
    default_mode: defaultMode,
    allow_payer_choice: allowChoice,
    free_available: freeAvailable,
    mercadopago_available: mpAvailable,
  }), { headers })
})
