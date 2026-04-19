import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-browser';

const TUYA_BASE: Record<string, string> = {
  'us-east': 'https://openapi-ueaz.tuyaus.com',
};

async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(message: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(message));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildStringToSign(
  method: string,
  bodyHash: string,
  optionalKey: string,
  path: string
): string {
  return [method, bodyHash, optionalKey, path].join('\n');
}

function buildTokenRequestPath(code: string): string {
  const params = new URLSearchParams();
  params.append('grant_type', '2');
  params.append('code', code);
  return `/v1.0/token?${params.toString()}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/agenda?tuya=error&msg=missing_params', req.url)
    );
  }

  const decodedState = decodeURIComponent(state);
  const [companyId, region = 'us-east'] = decodedState.split(':');

  if (!companyId) {
    return NextResponse.redirect(
      new URL('/dashboard/agenda?tuya=error&msg=invalid_state', req.url)
    );
  }

  const baseUrl = TUYA_BASE[region] || TUYA_BASE['us-east'];

  const clientId =
    process.env.TUYA_CLIENT_ID ??
    process.env.NEXT_PUBLIC_TUYA_CLIENT_ID ??
    '';

  const clientSecret =
    process.env.TUYA_CLIENT_SECRET ??
    process.env.NEXT_PUBLIC_TUYA_CLIENT_SECRET ??
    '';

const identifier =
  process.env.TUYA_IDENTIFIER ??
  process.env.NEXT_PUBLIC_TUYA_IDENTIFIER ??
  '';

if (!clientId || !clientSecret || !identifier) {
  return NextResponse.redirect(
    new URL('/dashboard/agenda?tuya=error&msg=missing_credentials', req.url)
  );
}

const emptyHash = await sha256('');
const requestPath = buildTokenRequestPath(code);
const timestamp = Date.now().toString();
const nonce = crypto.randomUUID().replace(/-/g, '');

const stringToSign = buildStringToSign('GET', emptyHash, '', requestPath);
const signStr = clientId + timestamp + nonce + identifier + stringToSign;
const sign = (await hmacSha256(clientSecret, signStr)).toUpperCase();

  console.log('[Tuya] requestPath:', requestPath);
  console.log('[Tuya] stringToSign:', JSON.stringify(stringToSign));
  console.log('[Tuya] signStr:', JSON.stringify(signStr));

const res = await fetch(`${baseUrl}${requestPath}`, {
  method: 'GET',
  headers: {
    client_id: clientId,
    t: timestamp,
    sign_method: 'HMAC-SHA256',
    sign,
    nonce,
    identifier,
    'Content-Type': 'application/json',
  },
});

    json = await res.json();
    console.log('[Tuya] response:', JSON.stringify(json));
  } catch (error) {
    console.error('[Tuya] fetch error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/agenda?tuya=error&msg=request_failed', req.url)
    );
  }

  if (json?.success) {
    return await saveAndRedirect(json, companyId, region, req);
  }

  return NextResponse.redirect(
    new URL(
      `/dashboard/agenda?tuya=error&msg=${encodeURIComponent(
        'sign invalid: ' + (json?.msg ?? 'unknown')
      )}`,
      req.url
    )
  );
}

async function saveAndRedirect(
  tokenJson: any,
  companyId: string,
  region: string,
  req: NextRequest
): Promise<NextResponse> {
  const result = tokenJson?.result ?? {};
  const access_token = result.access_token;
  const refresh_token = result.refresh_token;
  const uid = result.uid;
  const expire_time = Number(result.expire_time ?? 0);

  if (!access_token || !refresh_token || !uid) {
    console.error('[Tuya] Token response missing fields:', tokenJson);
    return NextResponse.redirect(
      new URL('/dashboard/agenda?tuya=error&msg=invalid_token_response', req.url)
    );
  }

  const expiresAt = Date.now() + expire_time * 1000;

  const supabase = createClient();
  const { error } = await supabase
    .from('companies')
    .update({
      tuya_access_token: access_token,
      tuya_refresh_token: refresh_token,
      tuya_user_uid: uid,
      tuya_token_expires_at: expiresAt,
      tuya_region: region,
    })
    .eq('id', companyId);

  if (error) {
    console.error('[Tuya] Supabase update error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/agenda?tuya=error&msg=db_save_failed', req.url)
    );
  }

  console.log('✅ Tuya OAuth OK. UID:', uid);

  return NextResponse.redirect(
    new URL('/dashboard/agenda?tuya=success&tab=smarthome', req.url)
  );
}
