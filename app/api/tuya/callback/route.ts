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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state'); // companyId:region

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/agenda?tuya=error&msg=missing_params', req.url)
    );
  }

  const [companyId, region = 'us'] = state.split(':');
  const baseUrl = TUYA_BASE[region] || TUYA_BASE['us'];

  const clientId     = process.env.TUYA_CLIENT_ID!;
  const clientSecret = process.env.TUYA_CLIENT_SECRET!;

  try {
    // ── Trocar code por access_token ───────────────────────────
    const timestamp = Date.now().toString();
    const nonce     = crypto.randomUUID().replace(/-/g, '');
    const path      = `/v1.0/token?code=${code}&grant_type=2`;
    const emptyHash = await sha256('');
    const stringToSign = ['GET', emptyHash, '', path].join('\n');
    const signStr   = clientId + timestamp + nonce + stringToSign;
    const sign      = (await hmacSha256(clientSecret, signStr)).toUpperCase();

    const tokenRes = await fetch(`${baseUrl}${path}`, {
      headers: {
        'client_id':   clientId,
        't':           timestamp,
        'sign_method': 'HMAC-SHA256',
        'sign':        sign,
        'nonce':       nonce,
      },
    });

    const tokenJson = await tokenRes.json();

    if (!tokenJson.success) {
      console.error('Tuya token exchange error:', tokenJson);
      return NextResponse.redirect(
        new URL(`/dashboard/agenda?tuya=error&msg=${encodeURIComponent(tokenJson.msg)}`, req.url)
      );
    }

    const {
      access_token,
      refresh_token,
      uid,
      expire_time, // segundos até expirar
    } = tokenJson.result;

    const expiresAt = Date.now() + (expire_time * 1000);

    // ── Salvar na tabela companies ─────────────────────────────
    const supabase = createClient();
    const { error } = await supabase
      .from('companies')
      .update({
        tuya_access_token:    access_token,
        tuya_refresh_token:   refresh_token,
        tuya_user_uid:        uid,
        tuya_token_expires_at: expiresAt,
        tuya_region:          region,
      })
      .eq('id', companyId);

    if (error) throw error;

    // ── Redirecionar de volta ao Dashboard com sucesso ─────────
    return NextResponse.redirect(
      new URL('/dashboard/agenda?tuya=success&tab=smarthome', req.url)
    );

  } catch (err: any) {
    console.error('Tuya callback error:', err);
    return NextResponse.redirect(
      new URL(`/dashboard/agenda?tuya=error&msg=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}
