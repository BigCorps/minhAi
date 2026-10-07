const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return new Response(JSON.stringify({ success: false, error: 'method_not_allowed' }), { status: 405, headers: cors })
  if (!SUPABASE_URL) return new Response(JSON.stringify({ success: false, error: 'service_unavailable' }), { status: 503, headers: cors })
  const body = await req.text()
  const forwarded: Record<string, string> = { 'Content-Type': 'application/json' }
  const authorization = req.headers.get('authorization')
  const apikey = req.headers.get('apikey')
  if (authorization) forwarded.Authorization = authorization
  if (apikey) forwarded.apikey = apikey
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/cancelar-pix-assistente-v2`, {
      method: 'POST', headers: forwarded, body, signal: AbortSignal.timeout(15000),
    })
    return new Response(await response.text(), { status: response.status, headers: cors })
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'cancel_unavailable' }), { status: 503, headers: cors })
  }
})
