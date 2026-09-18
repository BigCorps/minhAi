import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase-admin';

export type OrderActor = {
  kind: 'supabase_user' | 'profile_session';
  userId: string | null;
  profileId: string | null;
  profileType: string | null;
};

export function cleanUuid(value: unknown): string {
  const id = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : '';
}

export function cleanText(value: unknown, max = 500): string | null {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
}

export function bearerToken(headers: { get(name: string): string | null }): string {
  const header = String(headers.get('authorization') || '').trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function mutationSecret(): string {
  return String(process.env.ORDER_MUTATION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
}

export type DeliveryQuoteTokenPayload = {
  companyId: string;
  address: string;
  subtotalCents: number;
  quotationId: string;
  quoteRequestId: string;
  priceCents: number;
  priceOriginalCents: number;
  expiresAt: string | null;
  whoPays: 'cliente' | 'empresa';
  exp: number;
};

export function signDeliveryQuoteToken(input: Omit<DeliveryQuoteTokenPayload, 'exp'>): string {
  const secret = mutationSecret();
  if (!secret) throw new Error('order_mutation_secret_missing');

  const now = Math.floor(Date.now() / 1000);
  const providerExpiry = input.expiresAt ? Math.floor(new Date(input.expiresAt).getTime() / 1000) : now + 4 * 60;
  if (!Number.isFinite(providerExpiry) || providerExpiry <= now + 5) throw new Error('delivery_quote_expired');
  const exp = Math.min(providerExpiry, now + 10 * 60);
  const payload: DeliveryQuoteTokenPayload = { ...input, exp };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyDeliveryQuoteToken(token: unknown): DeliveryQuoteTokenPayload | null {
  const secret = mutationSecret();
  const raw = String(token || '').trim();
  if (!secret || !raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as DeliveryQuoteTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!value || value.exp < now || !value.companyId || !value.quotationId || !value.quoteRequestId) return null;
    if (!value.address || value.address.length > 500) return null;
    if (!Number.isFinite(value.subtotalCents) || value.subtotalCents <= 0) return null;
    if (!Number.isFinite(value.priceCents) || value.priceCents <= 0) return null;
    if (!Number.isFinite(value.priceOriginalCents) || value.priceOriginalCents <= 0) return null;
    if (!['cliente','empresa'].includes(value.whoPays)) return null;
    return value;
  } catch {
    return null;
  }
}

export type StorefrontPaymentTokenPayload = {
  checkoutId: string;
  pedidoId: string;
  companyId: string;
  exp: number;
};

export function signStorefrontPaymentToken(
  checkoutId: string,
  pedidoId: string,
  companyId: string,
  ttlSeconds = 60 * 60,
): string {
  const secret = mutationSecret();
  if (!secret) throw new Error('order_mutation_secret_missing');
  const payload: StorefrontPaymentTokenPayload = {
    checkoutId,
    pedidoId,
    companyId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyStorefrontPaymentToken(token: unknown): StorefrontPaymentTokenPayload | null {
  const secret = mutationSecret();
  const raw = String(token || '').trim();
  if (!secret || !raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as StorefrontPaymentTokenPayload;
    if (!payload?.checkoutId || !payload?.pedidoId || !payload?.companyId) return null;
    if (!Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function signOrderMutationToken(pedidoId: string, companyId: string, ttlSeconds = 6 * 60 * 60): string {
  const secret = mutationSecret();
  if (!secret) throw new Error('order_mutation_secret_missing');
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${pedidoId}.${companyId}.${exp}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyOrderMutationToken(token: unknown, pedidoId: string, companyId: string): boolean {
  const secret = mutationSecret();
  const raw = String(token || '').trim();
  if (!secret || !raw) return false;

  const parts = raw.split('.');
  if (parts.length !== 4) return false;
  const [tokenPedidoId, tokenCompanyId, expRaw, signature] = parts;
  if (tokenPedidoId !== pedidoId || tokenCompanyId !== companyId) return false;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const payload = `${tokenPedidoId}.${tokenCompanyId}.${expRaw}`;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizeProfileTokens(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v || '').trim()).filter(Boolean))].slice(0, 12);
}

export async function resolveCompanyActor(
  request: { headers: { get(name: string): string | null } },
  body: Record<string, any>,
  companyId: string,
  allowedProfileTypes: string[],
): Promise<{ actor: OrderActor | null; company: any | null; error?: string }> {
  const admin = createAdminClient();
  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id,user_id,is_active')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError) return { actor: null, company: null, error: 'company_lookup_failed' };
  if (!company || company.is_active === false) return { actor: null, company: null, error: 'company_not_found' };

  const token = bearerToken(request.headers);
  if (token) {
    const { data: authData } = await admin.auth.getUser(token);
    const user = authData?.user || null;
    if (user) {
      let authorized = company.user_id === user.id;
      if (!authorized) {
        const { data: adminRow } = await admin
          .from('company_admins')
          .select('role')
          .eq('company_id', companyId)
          .eq('user_id', user.id)
          .maybeSingle();
        authorized = !!adminRow;
      }

      if (authorized) {
        let profileId: string | null = null;
        let profileType: string | null = null;
        const requestedProfileId = cleanUuid(body?.profile_id);
        if (requestedProfileId) {
          const { data: profile } = await admin
            .from('company_profiles')
            .select('id,tipo,is_active')
            .eq('id', requestedProfileId)
            .eq('company_id', companyId)
            .maybeSingle();
          if (profile && profile.is_active !== false) {
            profileId = profile.id;
            profileType = String(profile.tipo || '');
          }
        }
        return {
          actor: { kind: 'supabase_user', userId: user.id, profileId, profileType },
          company,
        };
      }
    }
  }

  const profileTokens = normalizeProfileTokens(body?.profile_tokens);
  if (!profileTokens.length) return { actor: null, company, error: 'unauthorized' };

  const { data: sessions, error: sessionsError } = await admin
    .from('profile_sessions')
    .select('token,profile_id,company_id,expires_at,created_at')
    .in('token', profileTokens)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(12);

  if (sessionsError) return { actor: null, company, error: 'profile_session_lookup_failed' };
  const now = Date.now();
  const validSessions = (sessions || []).filter((session: any) => {
    if (!session?.profile_id) return false;
    if (!session.expires_at) return true;
    return new Date(session.expires_at).getTime() > now;
  });
  if (!validSessions.length) return { actor: null, company, error: 'unauthorized' };

  const profileIds = [...new Set(validSessions.map((s: any) => s.profile_id))];
  const { data: profiles, error: profilesError } = await admin
    .from('company_profiles')
    .select('id,tipo,is_active')
    .in('id', profileIds)
    .eq('company_id', companyId);

  if (profilesError) return { actor: null, company, error: 'profile_lookup_failed' };

  const profile = (profiles || []).find((p: any) =>
    p?.is_active !== false && allowedProfileTypes.includes(String(p?.tipo || '')),
  );
  if (!profile) return { actor: null, company, error: 'forbidden' };

  return {
    actor: {
      kind: 'profile_session',
      userId: null,
      profileId: profile.id,
      profileType: String(profile.tipo || ''),
    },
    company,
  };
}
