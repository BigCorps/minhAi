import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, adminPublic } from '@/lib/conviteria/servidor';
import { buscarEventoMemoriasPublicado, resumoPublico } from '@/lib/conviteria/memorias-servidor';
import { MEMORIAS_BUCKET } from '@/lib/conviteria/memorias-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const slug = u.searchParams.get('slug')?.trim().toLowerCase();
  const festa = u.searchParams.get('modo') === 'festa';
  if (!slug) return NextResponse.json({ erro: 'Evento não informado.' }, { status: 400 });

  const evento = await buscarEventoMemoriasPublicado(slug);
  if (!evento) return NextResponse.json({ erro: 'Álbum indisponível.' }, { status: 404 });

  const admin = adminConviteria();
  let q = admin.from('evento_memorias')
    .select('id,tipo,storage_path,mime_type,duracao_segundos,largura,altura,nome_convidado,created_at')
    .eq('evento_id', evento.id)
    .eq('status', 'aprovado')
    .order('created_at', { ascending: false })
    .limit(festa ? 100 : 330);

  const { data } = await q;
  const linhas = [...(data ?? [])].reverse();
  const caminhos = linhas.map((m: any) => m.storage_path as string);
  const { data: assinadas } = caminhos.length
    ? await adminPublic().storage.from(MEMORIAS_BUCKET).createSignedUrls(caminhos, 3600)
    : { data: [] as any[] };
  const urls = new Map<string, string>();
  for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);

  return NextResponse.json({
    ...resumoPublico(evento),
    midias: linhas.map((m: any) => ({
      id: m.id,
      tipo: m.tipo,
      url: urls.get(m.storage_path) ?? null,
      mimeType: m.mime_type,
      duracaoSegundos: m.duracao_segundos == null ? null : Number(m.duracao_segundos),
      largura: m.largura,
      altura: m.altura,
      nomeConvidado: m.nome_convidado,
      createdAt: m.created_at,
    })).filter((m: any) => Boolean(m.url)),
  });
}
