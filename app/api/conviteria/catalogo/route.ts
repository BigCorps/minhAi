import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

const BUCKET = 'conviteria-presentes';

/**
 * Catalogo de presentes de um grupo de evento.
 *
 * Publica de proposito: e vitrine, nao dado de ninguem. O wizard consulta
 * antes de existir conta, entao exigir sessao aqui quebraria a criacao.
 */
export async function GET(req: NextRequest) {
  const grupo = new URL(req.url).searchParams.get('grupo')?.trim();
  if (!grupo) {
    return NextResponse.json({ erro: 'Grupo não informado.' }, { status: 400 });
  }

  const admin = adminConviteria();

  const { data, error } = await admin
    .from('catalogo_presentes')
    .select('id, titulo, valor_centavos, imagem_path, permite_valor_livre, ordem')
    .eq('grupo', grupo)
    .eq('ativo', true)
    .order('ordem');

  if (error) {
    console.error('❌ Falha ao ler catálogo de presentes:', error);
    return NextResponse.json({ erro: 'Falha ao carregar o catálogo.' }, { status: 500 });
  }

  return NextResponse.json({
    itens: (data ?? []).map((p) => ({
      catalogoId: p.id as string,
      titulo: p.titulo as string,
      valorCentavos: p.valor_centavos as number,
      permiteValorLivre: p.permite_valor_livre as boolean,
      // `imagem_path` ainda e nulo em todo o catalogo. A URL so e montada
      // quando existe arquivo — o cartao sem imagem tem estado proprio, e
      // mandar uma URL quebrada faria o navegador exibir icone de foto ausente.
      imagemUrl: p.imagem_path
        ? admin.storage.from(BUCKET).getPublicUrl(p.imagem_path as string).data.publicUrl
        : null,
    })),
  });
}
