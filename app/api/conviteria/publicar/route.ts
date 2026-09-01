import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { MENSAGEM_ERRO, normalizarSlug, validarSlug } from '@/lib/conviteria/slug';
import { PLANOS } from '@/lib/conviteria/precos';
import { urlDoConvite } from '@/lib/conviteria/marca';
import { normalizarPresentesEscolhidos } from '@/lib/conviteria/catalogo';
import type { ConviteConfig } from '@/lib/conviteria/tipos';

export const runtime = 'nodejs';

interface Corpo {
  rascunhoToken: string;
  slug: string;
  planoId: 'avulso' | 'mensal';
  cfg: ConviteConfig;
}

export async function POST(req: NextRequest) {
  const admin = adminConviteria();

  const token = req.headers
    .get('authorization')
    ?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { erro: 'Faça login para publicar.' },
      { status: 401 }
    );
  }

  const { data: auth, error: erroAuth } =
    await admin.auth.getUser(token);

  if (erroAuth || !auth.user) {
    return NextResponse.json(
      { erro: 'Sessão inválida.' },
      { status: 401 }
    );
  }

  let corpo: Corpo;

  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return NextResponse.json(
      { erro: 'Requisição inválida.' },
      { status: 400 }
    );
  }

  if (!corpo.cfg || typeof corpo.cfg !== 'object') {
    return NextResponse.json(
      { erro: 'Configuração do convite ausente.' },
      { status: 400 }
    );
  }

  const slug = normalizarSlug(
    corpo.slug ?? ''
  );

  const erroSlug = validarSlug(slug);

  if (erroSlug) {
    return NextResponse.json(
      { erro: MENSAGEM_ERRO[erroSlug] },
      { status: 400 }
    );
  }

  const plano = PLANOS.find(
    (p) => p.id === corpo.planoId
  );

  if (!plano) {
    return NextResponse.json(
      { erro: 'Plano inválido.' },
      { status: 400 }
    );
  }

  // 1. Conta
  const { data: conta, error: erroConta } =
    await admin
      .from('contas')
      .upsert(
        {
          user_id: auth.user.id,
          nome:
            (auth.user.user_metadata?.nome as string) ??
            auth.user.email ??
            'Sem nome',
          email: auth.user.email,
        },
        { onConflict: 'user_id' }
      )
      .select(
        'id, plano, plano_expira_em'
      )
      .single();

  if (erroConta || !conta) {
    return NextResponse.json(
      { erro: 'Não foi possível criar a conta.' },
      { status: 500 }
    );
  }

  // 2. Direito de criar.
  const mensalAtivo =
    conta.plano === 'mensal' &&
    conta.plano_expira_em != null &&
    new Date(conta.plano_expira_em) >
      new Date();

  if (
    plano.id === 'mensal' &&
    !mensalAtivo
  ) {
    return NextResponse.json(
      {
        erro: 'Plano mensal inativo.',
        acao: 'assinar',
        centavos: plano.centavos,
      },
      { status: 402 }
    );
  }

  // 3. Slug ainda livre?
  const { data: ocupado } = await admin
    .from('eventos')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (ocupado) {
    return NextResponse.json(
      {
        erro:
          'Esse endereço acabou de ser usado. Escolha outro.',
      },
      { status: 409 }
    );
  }

  // A lista é normalizada no servidor também: no máximo 50 e sem
  // catalogoId repetido, mesmo se alguém chamar a rota fora do wizard.
  const escolhidos =
    normalizarPresentesEscolhidos(
      corpo.cfg?.presentesEscolhidos
    );

  const cfgLimpa: ConviteConfig = {
    ...corpo.cfg,
    presentesEscolhidos: escolhidos,
  } as ConviteConfig;

  // 4. Cria em rascunho. `publicado_em` só é gravado pelo webhook de
  // pagamento no plano avulso.
  const { data: evento, error: erroEvento } =
    await admin
      .from('eventos')
      .insert({
        conta_id: conta.id,
        slug,
        tipo_evento_id:
          cfgLimpa.tipoEventoId,
        tema_id: cfgLimpa.temaId,
        fonte_id: cfgLimpa.fonteId,
        config: cfgLimpa,
        data_evento:
          cfgLimpa.evento?.dataIso ?? null,
        origem_plano: plano.id,
        publicado_em:
          plano.id === 'mensal'
            ? new Date().toISOString()
            : null,
      })
      .select('id, slug')
      .single();

  if (erroEvento || !evento) {
    console.error(
      '❌ Falha ao inserir evento:',
      erroEvento
    );

    return NextResponse.json(
      {
        erro:
          'Não foi possível criar o convite.',
      },
      { status: 500 }
    );
  }

  // 5. Presentes escolhidos viram linhas próprias.
  if (escolhidos.length > 0) {
    const { error: erroPresentes } =
      await admin
        .from('presentes')
        .insert(
          escolhidos.map((p, i) => ({
            evento_id: evento.id,
            catalogo_id: p.catalogoId,
            titulo: p.titulo,
            valor_centavos:
              p.valorCentavos,
            permite_valor_livre:
              p.permiteValorLivre ??
              false,
            imagem_url:
              p.imagemUrl ?? null,
            ordem: (i + 1) * 10,
            ativo: true,
          }))
        );

    if (erroPresentes) {
      console.error(
        '⚠️ Falha ao criar presentes:',
        erroPresentes
      );

      // Ainda não existe pagamento nem convite entregue. Libera o slug e
      // evita deixar um evento órfão que falharia de novo na tentativa.
      await admin
        .from('eventos')
        .delete()
        .eq('id', evento.id);

      return NextResponse.json(
        {
          erro:
            'A lista de presentes não pôde ser salva. Tente publicar novamente.',
        },
        { status: 500 }
      );
    }
  }

  // 6. Seções em tabela própria.
  const { error: erroSecoes } = await admin
    .from('evento_secoes')
    .insert(
      (cfgLimpa.secoes ?? []).map(
        (s) => ({
          evento_id: evento.id,
          tipo: s.tipo,
          ordem: s.ordem,
          ativo: s.ativo,
          config: s.config ?? {},
        })
      )
    );

  if (erroSecoes) {
    console.error(
      '⚠️ Falha ao criar seções:',
      erroSecoes
    );
  }

  if (corpo.rascunhoToken) {
    await admin
      .from('rascunhos')
      .delete()
      .eq(
        'token',
        corpo.rascunhoToken
      );
  }

  return NextResponse.json({
    eventoId: evento.id,
    slug: evento.slug,
    url: urlDoConvite(evento.slug),
    publicado:
      plano.id === 'mensal',
    cobranca:
      plano.id === 'avulso'
        ? {
            centavos:
              plano.centavos,
          }
        : null,
  });
}
