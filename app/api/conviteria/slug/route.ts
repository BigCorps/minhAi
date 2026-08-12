import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { MENSAGEM_ERRO, normalizarSlug, validarSlug } from '@/lib/conviteria/slug';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const bruto = new URL(req.url).searchParams.get('slug') ?? '';
  const slug = normalizarSlug(bruto);

  const erro = validarSlug(slug);
  if (erro) {
    return NextResponse.json({ slug, livre: false, motivo: MENSAGEM_ERRO[erro] });
  }

  // Cliente criado DENTRO do handler: no escopo do módulo, o construtor roda
  // durante "collecting page data" do build, quando as env vars não existem.
  const admin = adminConviteria();

  // Duas checagens: a lista dinâmica no banco e os eventos existentes.
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