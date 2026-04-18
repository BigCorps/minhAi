import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-browser';

const TUYA_BASE: Record<string, string> = {
  us: 'https://openapi.tuyaus.com',
  eu: 'https://openapi.tuyaeu.com',
  cn: 'https://openapi.tuyacn.com',
  in: 'https://openapi.tuyain.com',
};

// Area IDs por região (usados na assinatura App Authorization)
const TUYA_AREA_ID: Record<string, string> = {
  us: 'AY',
  eu: 'EU',
  cn: 'AY',
  in: 'IN',
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
    const nonce     = crypto.randomUUID().replace(/-/g, '');
    const reqId     = crypto.randomUUID().replace(/-/g, '');
    const areaId    = TUYA_AREA_ID[region] || 'AY';

    // ── Algoritmo "Sign Requests for App Authorization" ───────
    // Usado quando client_id vem de App Authorization (H5 OAuth)
    // stringToSign inclui area_id e call_id/req_id como Optional_Signature_key
    const path         = `/v1.0/token?code=${code}&grant_type=2`;
    const emptyHash    = await sha256('');
    const optionalKey  = `area_id:${areaId}\nreq_id:${reqId}\n`;
    const stringToSign = ['GET', emptyHash, optionalKey, path].join('\n');

    // str = clientId + t + nonce + stringToSign (sem access_token para token endpoint)
    const signStr = clientId + timestamp + nonce + stringToSign;
    const sign    = (await hmacSha256(clientSecret, signStr)).toUpperCase();

    console.log('Tuya App Auth — tentativa 1 (com area_id+req_id):', {
      path, areaId, reqId, stringToSign
    });

    const headers1: Record<string, string> = {
      'client_id':        clientId,
      't':                timestamp,
      'sign_method':      'HMAC-SHA256',
      'sign':             sign,
      'nonce':            nonce,
      'Signature-Headers': 'area_id:req_id',
      'area_id':          areaId,
      'req_id':           reqId,
      'Content-Type':     'application/json',
    };

    const res1     = await fetch(`${baseUrl}${path}`, { headers: headers1 });
    const json1    = await res1.json();
    console.log('Resposta 1:', JSON.stringify(json1));

    if (json1.success) {
      return await saveAndRedirect(json1, companyId, region, req);
    }

    // ── Fallback: sem area_id/req_id mas com nonce ────────────
    console.log('Tentativa 2 (sem area_id, com nonce)...');
    const stringToSign2 = ['GET', emptyHash, '', path].join('\n');
    const signStr2      = clientId + timestamp + nonce + stringToSign2;
    const sign2         = (await hmacSha256(clientSecret, signStr2)).toUpperCase();

    const res2  = await fetch(`${baseUrl}${path}`, {
      headers: {
        'client_id':    clientId,
        't':            timestamp,
        'sign_method':  'HMAC-SHA256',
        'sign':         sign2,
        'nonce':        nonce,
        'Content-Type': 'application/json',
      },
    });
    const json2 = await res2.json();
    console.log('Resposta 2:', JSON.stringify(json2));

    if (json2.success) {
      return await saveAndRedirect(json2, companyId, region, req);
    }

    // ── Fallback 3: versão antiga sem nonce ───────────────────
    // sign = HMAC-SHA256(client_id + t, secret)
    console.log('Tentativa 3 (algoritmo antigo: clientId + t)...');
    const signOld  = (await hmacSha256(clientSecret, clientId + timestamp)).toUpperCase();

    const res3  = await fetch(`${baseUrl}${path}`, {
      headers: {
        'client_id':    clientId,
        't':            timestamp,
        'sign_method':  'HMAC-SHA256',
        'sign':         signOld,
        'Content-Type': 'application/json',
      },
    });
    const json3 = await res3.json();
    console.log('Resposta 3:', JSON.stringify(json3));

    if (json3.success) {
      return await saveAndRedirect(json3, companyId, region, req);
    }

    return NextResponse.redirect(
      new URL(`/dashboard/agenda?tuya=error&msg=${encodeURIComponent('sign invalid em todas as tentativas: ' + json3.msg)}`, req.url)
    );

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

  console.log('✅ Tuya OAuth concluído. UID:', uid);

  return NextResponse.redirect(
    new URL('/dashboard/agenda?tuya=success&tab=smarthome', req.url)
  );
}
