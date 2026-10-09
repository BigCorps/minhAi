import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia } from '@/lib/midia/server';
import { MIDIA_SCREEN_TYPES } from '@/lib/midia/constants';

const screenTypeKeys: Set<string> = new Set(MIDIA_SCREEN_TYPES.map((item) => item.key));

function publicCode() {
  return randomBytes(6).toString('hex').toUpperCase();
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    locationId?: string;
    name?: string;
    screenType?: string;
    planKey?: string;
  } | null;

  const locationId = String(body?.locationId ?? '').trim();
  const name = String(body?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const screenType = String(body?.screenType ?? 'tv');
  const planKey = String(body?.planKey ?? 'partner_free');

  if (!locationId) return NextResponse.json({ error: 'Escolha o local da tela.' }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ error: 'Informe um nome para a tela.' }, { status: 400 });
  if (!screenTypeKeys.has(screenType)) return NextResponse.json({ error: 'Tipo de tela inválido.' }, { status: 400 });

  const admin = adminMidia();
  const { data: publisher } = await admin
    .from('publishers')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!publisher) return NextResponse.json({ error: 'Crie primeiro seu endereço Midia.Pro.' }, { status: 409 });

  const [{ data: location }, { data: plan }] = await Promise.all([
    admin
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('publisher_id', publisher.id)
      .eq('active', true)
      .maybeSingle(),
    admin
      .from('screen_plan_catalog')
      .select('plan_key,monthly_price_cents,commercial_mode,default_network_inventory_percent')
      .eq('plan_key', planKey)
      .eq('active', true)
      .maybeSingle(),
  ]);

  if (!location) return NextResponse.json({ error: 'Local não encontrado.' }, { status: 404 });
  if (!plan) return NextResponse.json({ error: 'Plano de tela inválido.' }, { status: 400 });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await admin
      .from('screens')
      .insert({
        publisher_id: publisher.id,
        location_id: location.id,
        public_code: publicCode(),
        name,
        screen_type: screenType,
        orientation: 'portrait',
        aspect_ratio: '9:16',
        plan_key: plan.plan_key,
        commercial_mode: plan.commercial_mode,
        network_inventory_percent: Number(plan.default_network_inventory_percent),
        billing_status: Number(plan.monthly_price_cents) > 0 ? 'pending_payment' : 'not_required',
        status: 'draft',
      })
      .select('id,public_code,name,plan_key,commercial_mode,network_inventory_percent,billing_status,status')
      .single();

    if (!error && data) return NextResponse.json({ ok: true, screen: data });
    if (error?.code !== '23505') {
      console.error('[midia/screens] create:', error);
      return NextResponse.json({ error: 'Não foi possível cadastrar a tela.' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Não foi possível gerar o código da tela. Tente novamente.' }, { status: 503 });
}


export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    screenId?: string;
    rotationDegrees?: number;
  } | null;

  const screenId = String(body?.screenId ?? '').trim();
  const rotationDegrees = Number(body?.rotationDegrees);

  if (!screenId) return NextResponse.json({ error: 'Tela não informada.' }, { status: 400 });
  if (![0, 90, 270].includes(rotationDegrees)) {
    return NextResponse.json({ error: 'Rotação inválida.' }, { status: 400 });
  }

  const admin = adminMidia();
  const { data: publisher } = await admin
    .from('publishers')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!publisher) return NextResponse.json({ error: 'Conta Midia.Pro não encontrada.' }, { status: 404 });

  const { data, error } = await admin.rpc('set_screen_rotation', {
    p_screen_id: screenId,
    p_publisher_id: publisher.id,
    p_rotation: rotationDegrees,
  });

  if (error) {
    console.error('[midia/screens] rotation:', error);
    return NextResponse.json({ error: 'Não foi possível atualizar a rotação do player.' }, { status: 500 });
  }

  const updated = Array.isArray(data) ? data[0] : null;
  if (!updated) return NextResponse.json({ error: 'Tela não encontrada.' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    rotationDegrees: Number(updated.rotation_degrees),
    playlistVersion: Number(updated.playlist_version),
  });
}
