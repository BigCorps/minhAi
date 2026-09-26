import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia } from '@/lib/midia/server';
import { MIDIA_VENUE_TYPES } from '@/lib/midia/constants';

const venueKeys: Set<string> = new Set(MIDIA_VENUE_TYPES.map((item) => item.key));

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    name?: string;
    venueType?: string;
    city?: string;
    state?: string;
  } | null;

  const name = String(body?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const venueType = String(body?.venueType ?? 'store');
  const city = String(body?.city ?? '').trim().replace(/\s+/g, ' ').slice(0, 100) || null;
  const stateRaw = String(body?.state ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  const state = stateRaw || null;

  if (name.length < 2) return NextResponse.json({ error: 'Informe um nome para o local.' }, { status: 400 });
  if (!venueKeys.has(venueType)) return NextResponse.json({ error: 'Tipo de local inválido.' }, { status: 400 });
  if (state && state.length !== 2) return NextResponse.json({ error: 'Use a sigla do estado com 2 letras.' }, { status: 400 });

  const admin = adminMidia();
  const { data: publisher } = await admin
    .from('publishers')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!publisher) return NextResponse.json({ error: 'Crie primeiro seu endereço Midia.Pro.' }, { status: 409 });

  const { data, error } = await admin
    .from('locations')
    .insert({ publisher_id: publisher.id, name, venue_type: venueType, city, state })
    .select('id,name,venue_type,city,state,active,created_at')
    .single();

  if (error) {
    console.error('[midia/locations] create:', error);
    return NextResponse.json({ error: 'Não foi possível cadastrar o local.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, location: data });
}
