import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Hosts/rotas que não podem virar subdomínio de cliente. Mantemos aqui os
// nomes operacionais da FuncionarIA e os reservados mais comuns da base minhAi.
const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'dashboard', 'login', 'cadastro', 'onboarding',
  'terminal', 'public', 'widget', 'status', 'suporte', 'ajuda', 'docs', 'blog',
  'mail', 'smtp', 'cdn', 'assets', 'static', 'files', 'auth', 'callback', 'mcp',
  'funcionaria', 'minhai', 'pix', 'convite', 'conviteia', 'artefinal', 'consultatec',
  'teste', 'test', 'demo', 'staging', 'dev', 'beta', 'null', 'undefined', 'me', 'eu',
]);

function normalizeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

function validSlug(slug: string) {
  return slug.length >= 3
    && slug.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug);
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('slug') || '';
  const slug = normalizeSlug(raw);

  if (!validSlug(slug)) {
    return NextResponse.json(
      { slug, available: false, reason: 'invalid' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json(
      { slug, available: false, reason: 'reserved' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[funcionaria/slug-availability] Supabase server env ausente');
    return NextResponse.json({ error: 'server_configuration' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .limit(1);

  if (error) {
    console.error('[funcionaria/slug-availability] consulta falhou:', error.message);
    return NextResponse.json({ error: 'availability_check_failed' }, { status: 500 });
  }

  return NextResponse.json(
    {
      slug,
      available: !data?.length,
      reason: data?.length ? 'taken' : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
