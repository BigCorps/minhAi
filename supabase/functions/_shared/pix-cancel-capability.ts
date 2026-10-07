const encoder = new TextEncoder()

function uuid(value: unknown): string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : ''
}
function secret(): string {
  const configured = Deno.env.get('PIX_CANCEL_CAPABILITY_SECRET')
  if (configured !== undefined) {
    const value = configured.trim()
    if (value.length < 32) throw new Error('pix_cancel_capability_unavailable')
    return value
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (legacy.length < 32) throw new Error('pix_cancel_capability_unavailable')
  return legacy
}
function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
function decode64(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
    const binary = atob(padded)
    return Uint8Array.from(binary, ch => ch.charCodeAt(0))
  } catch { return null }
}
function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
async function signature(payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`pix-cancel:v1:${payload}`)))
}
function expirySeconds(expiresAt: unknown): number {
  const now = Date.now()
  const parsed = typeof expiresAt === 'string' ? Date.parse(expiresAt) : NaN
  const chosen = Number.isFinite(parsed) && parsed > now ? Math.min(parsed, now + 60 * 60_000) : now + 30 * 60_000
  return Math.floor(chosen / 1000)
}

export async function issuePixCancelCapability(transactionId: unknown, companyId: unknown, expiresAt: unknown): Promise<string> {
  const t = uuid(transactionId), c = uuid(companyId)
  if (!t || !c) throw new Error('pix_cancel_capability_invalid_scope')
  const payload = base64url(encoder.encode(JSON.stringify({ v: 1, t, c, e: expirySeconds(expiresAt) })))
  return `${payload}.${base64url(await signature(payload))}`
}

export async function verifyPixCancelCapability(
  token: unknown, transactionId: unknown, companyId: unknown, expiresAt: unknown, nowMs = Date.now(),
): Promise<boolean> {
  const t = uuid(transactionId), c = uuid(companyId)
  if (!t || !c || typeof token !== 'string' || token.length > 1024) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const payloadBytes = decode64(parts[0]), provided = decode64(parts[1])
  if (!payloadBytes || !provided) return false
  let value: any
  try { value = JSON.parse(new TextDecoder().decode(payloadBytes)) } catch { return false }
  if (value?.v !== 1 || value?.t !== t || value?.c !== c || !Number.isInteger(value?.e)) return false
  const now = Math.floor(nowMs / 1000)
  if (value.e < now || value.e > now + 60 * 60) return false
  const stored = typeof expiresAt === 'string' ? Date.parse(expiresAt) : NaN
  if (Number.isFinite(stored) && value.e > Math.floor(stored / 1000) + 2) return false
  try { return equal(provided, await signature(parts[0])) } catch { return false }
}