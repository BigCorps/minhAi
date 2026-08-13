import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { gruposCatalogoDoTipo } from '@/lib/conviteria/catalogo';

export const runtime = 'nodejs';
const BUCKET = 'conviteria-presentes';

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const tipo = params.get('tipo')?.trim();
  const grupoLegado = params.get('grupo')?.trim();

  if (!tipo && !grupoLegado) {
    return NextResponse.json({ erro: 'Tipo de evento não informado.' }, { status: 400 });
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
    return NextResponse.json({ erro: 'Falha ao carregar o catálogo.' }, { status: 500 });
  }

  const prioridade = new Map(grupos.map((g, i) => [g, i]));
  const ordenados = [...(data ?? [])].sort((a, b) => {
    const pa = prioridade.get(a.grupo as string) ?? 999;
    const pb = prioridade.get(b.grupo as string) ?? 999;
    return pa - pb || (a.ordem as number) - (b.ordem as number);
  });

  const unicos = new Map<string, (typeof ordenados)[number]>();
  for (const item of ordenados) {
    if (!unicos.has(item.id as string)) unicos.set(item.id as string, item);
  }

  return NextResponse.json({
    grupos,
    itens: Array.from(unicos.values()).map((p) => ({
      catalogoId: p.id as string,
      grupo: p.grupo as string,
      titulo: p.titulo as string,
      valorCentavos: p.valor_centavos as number,
      permiteValorLivre: p.permite_valor_livre as boolean,
      imagemUrl: p.imagem_path
        ? admin.storage.from(BUCKET).getPublicUrl(p.imagem_path as string).data.publicUrl
        : null,
    })),
  });
}
