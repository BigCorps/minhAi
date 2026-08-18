import {
  NextResponse,
  type NextRequest,
} from 'next/server';
import {
  adminConviteria,
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

  const admin =
    adminConviteria();

  const {
    data: evento,
  } = await admin
    .from('eventos')
    .select('id')
    .eq(
      'id',
      eventoId
    )
    .not(
      'publicado_em',
      'is',
      null
    )
    .eq(
      'arquivado',
      false
    )
    .maybeSingle();

  if (!evento) {
    return NextResponse.json(
      {
        erro:
          'Convite indisponível.',
      },
      { status: 404 }
    );
  }

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
