import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente administrativo do schema privado `midia`.
 * Nunca importar em Client Components.
 */
export function adminMidia() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'midia' },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

/** Storage não depende do schema PostgREST e fica separado para deixar claro
 * que URLs assinadas são emitidas somente pelo servidor. */
export function adminMidiaStorage() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export function hashMidiaDeviceSecret(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function bearerToken(request: Request) {
  const value = request.headers.get('authorization') || '';
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

type DeviceContext = {
  device: {
    id: string;
    screen_id: string;
    app_version: string | null;
    last_playlist_version: number | null;
  };
  screen: {
    id: string;
    publisher_id: string;
    location_id: string;
    name: string;
    public_code: string;
    status: string;
    billing_status: string;
    billing_current_period_end: string | null;
    playlist_version: number;
    commercial_mode: string;
    network_inventory_percent: number;
    inventory_class: string;
    rotation_degrees: number;
  };
  publisher: {
    id: string;
    slug: string;
    display_name: string;
    status: string;
  };
};

/** Valida o token opaco do player. O banco guarda somente SHA-256 do segredo
 * aleatório de 256 bits, portanto um vazamento de banco não revela o token. */
export async function getMidiaDeviceContext(request: Request): Promise<DeviceContext | null> {
  const raw = bearerToken(request);
  if (!raw || raw.length < 32) return null;

  const admin = adminMidia();
  const tokenHash = hashMidiaDeviceSecret(raw);
  const { data: device } = await admin
    .from('devices')
    .select('id,screen_id,app_version,last_playlist_version,revoked_at,paired_at')
    .eq('device_token_hash', tokenHash)
    .is('revoked_at', null)
    .not('paired_at', 'is', null)
    .maybeSingle();

  if (!device) return null;

  const { data: screen } = await admin
    .from('screens')
    .select('id,publisher_id,location_id,name,public_code,status,billing_status,billing_current_period_end,playlist_version,commercial_mode,network_inventory_percent,inventory_class,rotation_degrees')
    .eq('id', device.screen_id)
    .maybeSingle();
  if (!screen) return null;

  const { data: publisher } = await admin
    .from('publishers')
    .select('id,slug,display_name,status')
    .eq('id', screen.publisher_id)
    .maybeSingle();
  if (!publisher) return null;

  return {
    device: {
      id: device.id,
      screen_id: device.screen_id,
      app_version: device.app_version,
      last_playlist_version: device.last_playlist_version == null ? null : Number(device.last_playlist_version),
    },
    screen: {
      id: screen.id,
      publisher_id: screen.publisher_id,
      location_id: screen.location_id,
      name: screen.name,
      public_code: screen.public_code,
      status: screen.status,
      billing_status: screen.billing_status,
      billing_current_period_end: screen.billing_current_period_end,
      playlist_version: Number(screen.playlist_version),
      commercial_mode: screen.commercial_mode,
      network_inventory_percent: Number(screen.network_inventory_percent ?? 0),
      inventory_class: screen.inventory_class,
      rotation_degrees: Number(screen.rotation_degrees ?? 0),
    },
    publisher: {
      id: publisher.id,
      slug: publisher.slug,
      display_name: publisher.display_name,
      status: publisher.status,
    },
  };
}

export function canMidiaScreenPlay(ctx: DeviceContext) {
  if (ctx.publisher.status !== 'active') return false;
  if (!['active', 'draft'].includes(ctx.screen.status)) return false;
  if (ctx.screen.billing_status === 'not_required') return true;
  if (ctx.screen.billing_status !== 'active') return false;
  if (ctx.screen.billing_current_period_end) {
    const end = new Date(ctx.screen.billing_current_period_end).getTime();
    if (Number.isFinite(end) && end <= Date.now()) return false;
  }
  return true;
}

export function midiaIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

export function hashMidiaIp(ip: string) {
  return createHash('sha256')
    .update(`${ip}:${process.env.MIDIA_SAL_IP ?? process.env.CONVITEIA_SAL_IP ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'midia-pro'}`)
    .digest('hex')
    .slice(0, 32);
}

export function hashMidiaCampaignSecret(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function getPublicMidiaScreen(slug: string, publicCode: string) {
  const admin = adminMidia();
  const cleanSlug = slug.trim().toLowerCase();
  const cleanCode = publicCode.trim().toUpperCase();

  const { data: publisher } = await admin
    .from('publishers')
    .select('id,slug,display_name,status')
    .eq('slug', cleanSlug)
    .eq('status', 'active')
    .maybeSingle();
  if (!publisher) return null;

  const { data: screen } = await admin
    .from('screens')
    .select('id,publisher_id,location_id,public_code,name,screen_type,commercial_mode,network_inventory_percent,billing_status,billing_current_period_end,inventory_class,price_factor,status')
    .eq('publisher_id', publisher.id)
    .eq('public_code', cleanCode)
    .eq('status', 'active')
    .in('commercial_mode', ['partner', 'hybrid'])
    .maybeSingle();
  if (!screen || !['not_required', 'active'].includes(screen.billing_status)) return null;
  if (screen.billing_status === 'active' && screen.billing_current_period_end) {
    const end = new Date(screen.billing_current_period_end).getTime();
    if (Number.isFinite(end) && end <= Date.now()) return null;
  }

  const [{ data: location }, { data: settings }] = await Promise.all([
    admin
      .from('locations')
      .select('id,name,city,state,timezone,active')
      .eq('id', screen.location_id)
      .eq('publisher_id', publisher.id)
      .eq('active', true)
      .maybeSingle(),
    admin
      .from('screen_ad_settings')
      .select('accepting_ads,active_minutes_per_day,min_notice_minutes,booking_horizon_days')
      .eq('screen_id', screen.id)
      .maybeSingle(),
  ]);

  if (!location || !settings?.accepting_ads) return null;
  return { publisher, screen, location, settings };
}

export async function getMidiaCampaignBySecret(campaignId: string, rawSecret: string) {
  if (!campaignId || rawSecret.length < 32) return null;
  const admin = adminMidia();
  const { data } = await admin
    .from('campaigns')
    .select('id,screen_id,publisher_id,product_key,duration_seconds,total_price_cents,estimated_occurrences,status,quote_expires_at,edit_token_hash,created_at,paid_at,rejection_reason,schedule_date,schedule_time,start_date,end_date')
    .eq('id', campaignId)
    .eq('edit_token_hash', hashMidiaCampaignSecret(rawSecret))
    .maybeSingle();
  return data ?? null;
}


function midiaProofSecret() {
  // Secret dedicado é recomendado, mas o service_role é um fallback server-only
  // seguro para não criar uma etapa obrigatória de configuração no MVP.
  return process.env.MIDIA_PROOF_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || 'midia-proof-development-only';
}

type MidiaProofTokenInput = {
  occurrenceId: string;
  screenId: string;
  deviceId: string;
  displaySeconds: number;
};

function midiaProofPayload(input: MidiaProofTokenInput) {
  return [
    'v1',
    input.occurrenceId,
    input.screenId,
    input.deviceId,
    String(Math.floor(input.displaySeconds)),
  ].join('.');
}

/** Token opaco por ocorrência/device. Nada secreto vai para o navegador: o
 * HMAC apenas prova que aquela ocorrência veio de um manifesto emitido pelo
 * servidor para aquele player pareado. */
export function signMidiaProofToken(input: MidiaProofTokenInput) {
  const signature = createHmac('sha256', midiaProofSecret())
    .update(midiaProofPayload(input))
    .digest('base64url');
  return `v1.${signature}`;
}

export function verifyMidiaProofToken(input: MidiaProofTokenInput, token: string) {
  const expected = signMidiaProofToken(input);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}
