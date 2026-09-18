import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function buscarSlug(token: string) {
  const admin = adminConviteria();

  const { data: familia } = await admin
    .from('convidado_familias')
    .select('evento_id')
    .eq('qr_token', token)
    .maybeSingle();

  let eventoId = familia?.evento_id as string | undefined;

  if (!eventoId) {
    const { data: pessoa } = await admin
      .from('convidados_lista')
      .select('evento_id')
      .eq('qr_token', token)
      .maybeSingle();
    eventoId = pessoa?.evento_id as string | undefined;
  }

  if (!eventoId) return null;

  const { data: evento } = await admin
    .from('eventos')
    .select('slug,publicado_em,arquivado')
    .eq('id', eventoId)
    .maybeSingle();

  if (!evento?.slug || !evento.publicado_em || evento.arquivado) return null;
  return String(evento.slug);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!UUID_RE.test(token)) return NextResponse.redirect(new URL('/convite', req.url));

  const slug = await buscarSlug(token);
  if (!slug) return NextResponse.redirect(new URL('/convite', req.url));

  return NextResponse.redirect(`https://${slug}.conviteia.com`, 307);
}
