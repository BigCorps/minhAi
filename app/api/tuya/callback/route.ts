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

  try {
    const timestamp = Date.now().toString();

    // ── Tuya H5 OAuth token exchange ──────────────────────────
    // Para grant_type=2 (H5 authorization code), a assinatura
    // NÃO inclui nonce e usa formato simplificado:
    // signStr = clientId + timestamp + stringToSign
    const path         = `/v1.0/token?code=${code}&grant_type=2`;
    const emptyHash    = await sha256('');
    const stringToSign = ['GET', emptyHash, '', path].join('\n');

    // SEM nonce — formato correto para H5 OAuth
    const signStr = clientId + timestamp + stringToSign;
    const sign    = (await hmacSha256(clientSecret, signStr)).toUpperCase();

    console.log('Tuya H5 OAuth — sign attempt (sem nonce):', {
      path,
      clientId,
      timestamp,
      signStr,
    });

    const tokenRes = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'client_id':   clientId,
        't':           timestamp,
        'sign_method': 'HMAC-SHA256',
        'sign':        sign,
        'Content-Type': 'application/json',
      },
    });

    const tokenJson = await tokenRes.json();
    console.log('Tuya token response:', JSON.stringify(tokenJson));

    // ── Fallback: tentar COM nonce se der sign invalid ────────
    if (!tokenJson.success && tokenJson.code === 1004) {
      console.log('Tentando com nonce...');
      const nonce      = crypto.randomUUID().replace(/-/g, '');
      const signStr2   = clientId + timestamp + nonce + stringToSign;
      const sign2      = (await hmacSha256(clientSecret, signStr2)).toUpperCase();

      const tokenRes2 = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'client_id':   clientId,
          't':           timestamp,
          'sign_method': 'HMAC-SHA256',
          'sign':        sign2,
          'nonce':       nonce,
          'Content-Type': 'application/json',
        },
      });

      const tokenJson2 = await tokenRes2.json();
      console.log('Tuya token response (com nonce):', JSON.stringify(tokenJson2));

      if (tokenJson2.success) {
        return await saveAndRedirect(tokenJson2, companyId, region, req);
      }

      // ── Fallback 2: grant_type=4 (alguns projetos H5 usam) ──
      console.log('Tentando grant_type=4...');
      const path4      = `/v1.0/token?code=${code}&grant_type=4`;
      const strSign4   = ['GET', emptyHash, '', path4].join('\n');
      const signStr4   = clientId + timestamp + strSign4;
      const sign4      = (await hmacSha256(clientSecret, signStr4)).toUpperCase();

      const tokenRes4 = await fetch(`${baseUrl}${path4}`, {
        method: 'GET',
        headers: {
          'client_id':   clientId,
          't':           timestamp,
          'sign_method': 'HMAC-SHA256',
          'sign':        sign4,
          'Content-Type': 'application/json',
        },
      });

      const tokenJson4 = await tokenRes4.json();
      console.log('Tuya token response (grant_type=4):', JSON.stringify(tokenJson4));

      if (tokenJson4.success) {
        return await saveAndRedirect(tokenJson4, companyId, region, req);
      }

      return NextResponse.redirect(
        new URL(`/dashboard/agenda?tuya=error&msg=${encodeURIComponent(`sign invalid: ${tokenJson4.msg}`)}`, req.url)
      );
    }

    if (!tokenJson.success) {
      return NextResponse.redirect(
        new URL(`/dashboard/agenda?tuya=error&msg=${encodeURIComponent(tokenJson.msg ?? 'token_error')}`, req.url)
      );
    }

    return await saveAndRedirect(tokenJson, companyId, region, req);

  } catch (err: any) {
    console.error('Tuya callback error:', err);
    return NextResponse.redirect(
      new URL(`/dashboard/agenda?tuya=error&msg=${encodeURIComponent(err.message ?? 'unknown')}`, req.url)
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

  if (error) {
    console.error('Supabase update error:', error);
    throw error;
  }

  console.log('Tuya OAuth concluído com sucesso. UID:', uid);

  return NextResponse.redirect(
    new URL('/dashboard/agenda?tuya=success&tab=smarthome', req.url)
  );
}
