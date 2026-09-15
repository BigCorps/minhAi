import {
  NextResponse,
  type NextRequest,
} from 'next/server';
import {
  adminConviteria,
  buscarEventoAcessivelPorId,
} from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest
) {
  const eventoId =
    new URL(req.url)
      .searchParams
      .get('evento')
      ?.trim();

  if (!eventoId) {
    return NextResponse.json(
      {
        erro:
          'Convite não informado.',
      },
      { status: 400 }
    );
  }

  // A configuração pública do cartão acompanha a mesma regra de acesso do
  // convite: publicação definitiva ou trial de 24h ainda ativo.
  const acessoEvento =
    await buscarEventoAcessivelPorId(
      eventoId
    );

  if (!acessoEvento) {
    return NextResponse.json(
      {
        erro:
          'Convite indisponível.',
      },
      { status: 404 }
    );
  }

  const admin =
    adminConviteria();

  const {
    data: config,
  } = await admin
    .from(
      'pagamento_cartao_config'
    )
    .select(
      'ativo,taxa_responsavel'
    )
    .eq(
      'evento_id',
      eventoId
    )
    .maybeSingle();

  return NextResponse.json({
    ativo:
      config?.ativo !== false,

    taxaResponsavel:
      config
        ?.taxa_responsavel ===
      'convidado'
        ? 'convidado'
        : 'anfitriao',

    maxParcelas: 6,
  });
}
