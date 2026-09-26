import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia } from '@/lib/midia/server';
import { normalizeMidiaSlug, validateMidiaSlug } from '@/lib/midia/slug';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    displayName?: string;
    slug?: string;
    accountType?: 'person' | 'company';
  } | null;

  const displayName = String(body?.displayName ?? '').trim().replace(/\s+/g, ' ').slice(0, 100);
  const slug = normalizeMidiaSlug(String(body?.slug ?? ''));
  const accountType = body?.accountType === 'person' ? 'person' : 'company';

  if (displayName.length < 2) {
    return NextResponse.json({ error: 'Informe o nome que será exibido na Midia.Pro.' }, { status: 400 });
  }

  const slugError = validateMidiaSlug(slug);
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });

  const admin = adminMidia();
  const { data: existing } = await admin
    .from('publishers')
    .select('id,slug')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Sua conta Midia.Pro já possui um endereço.', slug: existing.slug }, { status: 409 });
  }

  const { data: reserved } = await admin
    .from('reserved_slugs')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();

  if (reserved) {
    return NextResponse.json({ error: 'Este endereço é reservado pela Midia.Pro.' }, { status: 409 });
  }

  const { data, error } = await admin
    .from('publishers')
    .insert({
      user_id: user.id,
      slug,
      display_name: displayName,
      account_type: accountType,
      status: 'active',
    })
    .select('id,slug,display_name')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Este endereço acabou de ser escolhido. Tente outro.' }, { status: 409 });
    }
    console.error('[midia/publisher] create:', error);
    return NextResponse.json({ error: 'Não foi possível criar seu endereço Midia.Pro.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    publisher: {
      id: data.id,
      slug: data.slug,
      displayName: data.display_name,
      publicUrl: `https://${data.slug}.midia.pro`,
    },
  });
}
