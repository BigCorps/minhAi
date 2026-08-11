import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MENSAGEM_ERRO, normalizarSlug, validarSlug } from '@/lib/conviteria/slug';

export const runtime = 'nodejs';

// service_role: o schema conviteria nao e exposto ao PostgREST publico e as
// escritas publicas nao tem policy. Toda validacao acontece aqui.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'conviteria' }, auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
  const bruto = new URL(req.url).searchParams.get('slug') ?? '';
  const slug = normalizarSlug(bruto);

  const erro = validarSlug(slug);
  if (erro) {
    return NextResponse.json({ slug, livre: false, motivo: MENSAGEM_ERRO[erro] });
  }

  // Duas checagens: a lista dinamica no banco e os eventos existentes.
  const [reservado, existente] = await Promise.all([
    admin.from('slugs_reservados').select('slug').eq('slug', slug).maybeSingle(),
    admin.from('eventos').select('id').eq('slug', slug).maybeSingle(),
  ]);

  if (reservado.data) {
    return NextResponse.json({ slug, livre: false, motivo: 'Esse endereço é reservado.' });
  }
  if (existente.data) {
    return NextResponse.json({ slug, livre: false, motivo: 'Esse endereço já está em uso.' });
  }

  return NextResponse.json({ slug, livre: true });
}
