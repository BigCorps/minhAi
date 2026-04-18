import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-browser';

const TUYA_BASE: Record<string, string> = {
  us: 'https://openapi.tuyaus.com',
  eu: 'https://openapi.tuyaeu.com',
  cn: 'https://openapi.tuyacn.com',
  in: 'https://openapi.tuyain.com',
};

async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(message: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(message));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Monta stringToSign corretamente sem double newline
function buildStringToSign(method: string, bodyHash: string, optionalKey: string, path: string): string {
  // Formato: METHOD\nbodyHash\noptionalKey\npath
  // quando optionalKey é vazio: METHOD\nbodyHash\n\npath (double \n é correto segundo docs)
  return [method, bodyHash, optionalKey, path].join('\n');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/agenda?tuya=error&msg=missing_params', req.url)
    );
  }

  const [companyId, region = 'us'] = decodeURIComponent(state).split(':');
  const baseUrl = TUYA_BASE[region] || TUYA_BASE['us'];

  const clientId     = process.env.TUYA_CLIENT_ID!;
  const clientSecret = process.env.TUYA_CLIENT_SECRET!;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/dashboard/agenda?tuya=error&msg=missing_credentials', req.url)
    );
  }

  const emptyHash = await sha256('');

  // URL real da request (com code)
  const requestPath = `/v1.0/token?code=${code}&grant_type=2`;

  // URL usada na ASSINATURA (sem code — conforme exemplo da doc Tuya)
  const signPath = `/v1.0/token?grant_type=2`;

  const timestamp = Date.now().toString();
  const nonce     = crypto.randomUUID().replace(/-/g, '');

  // ── Tentativa 1: path de assinatura SEM code, com nonce ──────
  {
    const stringToSign = buildStringToSign('GET', emptyHash, '', signPath);
    const signStr      = clientId + timestamp + nonce + stringToSign;
    const sign         = (await hmacSha256(clientSecret, signStr)).toUpperCase();

    console.log('[1] signPath:', signPath);
    console.log('[1] stringToSign:', JSON.stringify(stringToSign));
    console.log('[1] signStr:', JSON.stringify(signStr));

    const res  = await fetch(`${baseUrl}${requestPath}`, {
      headers: {
        'client_id':    clientId,
        't':            timestamp,
        'sign_method':  'HMAC-SHA256',
        'sign':         sign,
        'nonce':        nonce,
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    console.log('[1] response:', JSON.stringify(json));
    if (json.success) return await saveAndRedirect(json, companyId, region, req);
  }

  // ── Tentativa 2: path de assinatura COM code, com nonce ──────
  {
    const stringToSign = buildStringToSign('GET', emptyHash, '', requestPath);
    const signStr      = clientId + timestamp + nonce + stringToSign;
    const sign         = (await hmacSha256(clientSecret, signStr)).toUpperCase();

    console.log('[2] signPath (com code):', requestPath);
    console.log('[2] stringToSign:', JSON.stringify(stringToSign));

    const res  = await fetch(`${baseUrl}${requestPath}`, {
      headers: {
        'client_id':    clientId,
        't':            timestamp,
        'sign_method':  'HMAC-SHA256',
        'sign':         sign,
        'nonce':        nonce,
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    console.log('[2] response:', JSON.stringify(json));
    if (json.success) return await saveAndRedirect(json, companyId, region, req);
  }

  // ── Tentativa 3: algoritmo antigo (sem nonce, sem stringToSign) ──
  // sign = HMAC-SHA256(clientId + t, secret)
  {
    const sign = (await hmacSha256(clientSecret, clientId + timestamp)).toUpperCase();

    console.log('[3] algoritmo antigo: clientId + t');

    const res  = await fetch(`${baseUrl}${requestPath}`, {
      headers: {
        'client_id':    clientId,
        't':            timestamp,
        'sign_method':  'HMAC-SHA256',
        'sign':         sign,
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    console.log('[3] response:', JSON.stringify(json));
    if (json.success) return await saveAndRedirect(json, companyId, region, req);
  }

  // ── Tentativa 4: sem nonce, path SEM code ────────────────────
  {
    const stringToSign = buildStringToSign('GET', emptyHash, '', signPath);
    const signStr      = clientId + timestamp + stringToSign;
    const sign         = (await hmacSha256(clientSecret, signStr)).toUpperCase();

    console.log('[4] sem nonce, path sem code');
    console.log('[4] signStr:', JSON.stringify(signStr));

    const res  = await fetch(`${baseUrl}${requestPath}`, {
      headers: {
        'client_id':    clientId,
        't':            timestamp,
        'sign_method':  'HMAC-SHA256',
        'sign':         sign,
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    console.log('[4] response:', JSON.stringify(json));
    if (json.success) return await saveAndRedirect(json, companyId, region, req);

    // Retorna o erro da última tentativa
    return NextResponse.redirect(
      new URL(`/dashboard/agenda?tuya=error&msg=${encodeURIComponent('sign invalid: ' + json.msg)}`, req.url)
    );
  }
}

async function saveAndRedirect(
  tokenJson: any,
  companyId: string,
  region: string,
  req: NextRequest
): Promise<NextResponse> {
  const { access_token, refresh_token, uid, expire_time } = tokenJson.result;
  const expiresAt = Date.now() + (expire_time * 1000);

  const supabase = createClient();
  const { error } = await supabase
    .from('companies')
    .update({
      tuya_access_token:     access_token,
      tuya_refresh_token:    refresh_token,
      tuya_user_uid:         uid,
      tuya_token_expires_at: expiresAt,
      tuya_region:           region,
    })
    .eq('id', companyId);

  if (error) throw error;

  console.log('✅ Tuya OAuth OK. UID:', uid);
  return NextResponse.redirect(
    new URL('/dashboard/agenda?tuya=success&tab=smarthome', req.url)
  );
}
