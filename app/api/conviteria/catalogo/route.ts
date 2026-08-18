import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { gruposCatalogoDoTipo } from '@/lib/conviteria/catalogo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BUCKET = 'conviteria-presentes';
const IMAGEM_REV = '20260818';

function comVersao(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.set('cv', IMAGEM_REV);
    return u.toString();
  } catch {
    return url;
  }
}

function urlImagem(
  admin: ReturnType<typeof adminConviteria>,
  caminho: string | null
) {
  if (!caminho) return null;

  if (/^https?:\/\//i.test(caminho)) {
    return comVersao(caminho);
  }

  if (caminho.startsWith('/')) {
    return comVersao(`https://conviteia.com${caminho}`);
  }

  return comVersao(
    admin.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl
  );
}

function respostaSemCache(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    },
  });
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const tipo = params.get('tipo')?.trim();
  const grupoLegado = params.get('grupo')?.trim();

  if (!tipo && !grupoLegado) {
    return respostaSemCache(
      { erro: 'Tipo de evento não informado.' },
      { status: 400 }
    );
  }

  const grupos = tipo ? gruposCatalogoDoTipo(tipo) : [grupoLegado!];
  const admin = adminConviteria();

  const { data, error } = await admin
    .from('catalogo_presentes')
    .select('id, grupo, titulo, valor_centavos, imagem_path, permite_valor_livre, ordem')
    .in('grupo', grupos)
    .eq('ativo', true)
    .order('ordem');

  if (error) {
    console.error('Falha ao ler catálogo de presentes:', error);
    return respostaSemCache(
      { erro: 'Falha ao carregar o catálogo.' },
      { status: 500 }
    );
  }

  const prioridade = new Map(grupos.map((g, i) => [g, i]));

  const ordenados = [...(data ?? [])].sort((a, b) => {
    const pa = prioridade.get(a.grupo as string) ?? 999;
    const pb = prioridade.get(b.grupo as string) ?? 999;
    return pa - pb || (a.ordem as number) - (b.ordem as number);
  });

  const unicos = new Map<string, (typeof ordenados)[number]>();

  for (const item of ordenados) {
    if (!unicos.has(item.id as string)) {
      unicos.set(item.id as string, item);
    }
  }

  return respostaSemCache({
    grupos,
    itens: Array.from(unicos.values()).map((p) => ({
      catalogoId: p.id as string,
      grupo: p.grupo as string,
      titulo: p.titulo as string,
      valorCentavos: p.valor_centavos as number,
      permiteValorLivre: p.permite_valor_livre as boolean,
      imagemUrl: urlImagem(
        admin,
        (p.imagem_path as string | null) ?? null
      ),
    })),
  });
}
