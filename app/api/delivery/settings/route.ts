import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanText, cleanUuid, resolveCompanyActor } from '@/lib/orders-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: noStore }); }

function cleanPhone(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits.slice(2);
  return digits.length === 10 || digits.length === 11 ? digits : '';
}

function cleanSchedule(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, { enabled: boolean; open: string; close: string }> = {};
  for (const key of ['seg','ter','qua','qui','sex','sab','dom']) {
    const row: any = (value as any)[key];
    if (!row || typeof row !== 'object') continue;
    const open = /^\d{2}:\d{2}$/.test(String(row.open || '')) ? String(row.open) : '08:00';
    const close = /^\d{2}:\d{2}$/.test(String(row.close || '')) ? String(row.close) : '18:00';
    out[key] = { enabled: row.enabled === true, open, close };
  }
  return out;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  if (!companyId) return json({ error: 'invalid_company_id' }, 400);

  const auth = await resolveCompanyActor(request, body, companyId, ['gerente', 'administrador']);
  if (auth.error) return json({ error: auth.error }, auth.error === 'unauthorized' ? 401 : 403);

  const admin = createAdminClient();
  const fields = 'delivery_enabled,delivery_auto_dispatch,delivery_who_pays,delivery_pickup_address,delivery_pickup_phone,delivery_max_radius_km,delivery_min_order_cents,delivery_message,delivery_schedule';

  if (body?.action === 'get') {
    const { data, error } = await admin.from('companies').select(fields).eq('id', companyId).maybeSingle();
    if (error) return json({ error: 'delivery_settings_lookup_failed' }, 500);
    if (!data) return json({ error: 'company_not_found' }, 404);
    return json({ settings: data });
  }

  if (body?.action !== 'save') return json({ error: 'invalid_action' }, 400);
  const input: any = body?.settings || {};
  const enabled = input.delivery_enabled === true;
  const pickupAddress = cleanText(input.delivery_pickup_address, 500) || '';
  const pickupPhone = cleanPhone(input.delivery_pickup_phone);
  if (enabled && pickupAddress.length < 8) return json({ error: 'pickup_address_required' }, 400);
  if (enabled && !pickupPhone) return json({ error: 'pickup_phone_required' }, 400);

  const radiusRaw = Number(input.delivery_max_radius_km);
  const minRaw = Number(input.delivery_min_order_cents);
  const patch = {
    delivery_enabled: enabled,
    delivery_auto_dispatch: input.delivery_auto_dispatch !== false,
    delivery_who_pays: input.delivery_who_pays === 'empresa' ? 'empresa' : 'cliente',
    delivery_pickup_address: pickupAddress || null,
    delivery_pickup_phone: pickupPhone || null,
    delivery_max_radius_km: Number.isFinite(radiusRaw) && radiusRaw > 0 ? Math.min(300, Math.round(radiusRaw)) : null,
    delivery_min_order_cents: Number.isFinite(minRaw) && minRaw > 0 ? Math.min(100_000_000, Math.round(minRaw)) : 0,
    delivery_message: cleanText(input.delivery_message, 1000),
    delivery_schedule: cleanSchedule(input.delivery_schedule),
  };

  const { data, error } = await admin
    .from('companies')
    .update(patch)
    .eq('id', companyId)
    .select(fields)
    .maybeSingle();
  if (error) return json({ error: 'delivery_settings_save_failed' }, 500);
  if (!data) return json({ error: 'company_not_found' }, 404);
  return json({ success: true, settings: data });
}
