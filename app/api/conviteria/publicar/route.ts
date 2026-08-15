import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { MENSAGEM_ERRO, normalizarSlug, validarSlug } from '@/lib/conviteria/slug';
import { PLANOS } from '@/lib/conviteria/precos';
import { urlDoConvite } from '@/lib/conviteria/marca';
import type { ConviteConfig } from '@/lib/conviteria/tipos';

export const runtime = 'nodejs';

interface Corpo {
  rascunhoToken: string;
  slug: string;
  planoId: 'avulso' | 'mensal';
  cfg: ConviteConfig;
}

export async function POST(req: NextRequest) {
  // Cliente criado DENTRO do handler: no escopo do módulo, o construtor roda
  // durante "collecting page data" do build, quando as env vars não existem.
  const admin = adminConviteria();

  // Identidade vem do token de sessão, nunca do corpo: aceitar user_id do
  // cliente deixaria qualquer um publicar na conta de outro.
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ erro: 'Faça login para publicar.' }, { status: 401 });

  const { data: auth, error: erroAuth } = await admin.auth.getUser(token);
  if (erroAuth || !auth.user) {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }

  const slug = normalizarSlug(corpo.slug ?? '');
  const erroSlug = validarSlug(slug);
  if (erroSlug) return NextResponse.json({ erro: MENSAGEM_ERRO[erroSlug] }, { status: 400 });

  const plano = PLANOS.find((p) => p.id === corpo.planoId);
  if (!plano) return NextResponse.json({ erro: 'Plano inválido.' }, { status: 400 });

  // 1. Conta
  const { data: conta, error: erroConta } = await admin
    .from('contas')
    .upsert(
      {
        user_id: auth.user.id,
        nome: (auth.user.user_metadata?.nome as string) ?? auth.user.email ?? 'Sem nome',
        email: auth.user.email,
      },
      { onConflict: 'user_id' }
    )
    .select('id, plano, plano_expira_em')
    .single();

  if (erroConta || !conta) {
    return NextResponse.json({ erro: 'Não foi possível criar a conta.' }, { status: 500 });
  }

  // 2. Direito de criar. Plano vencido bloqueia CRIAR; nunca derruba o que já
  //    está publicado — quem tem o link é o convidado, não o cliente.
  const mensalAtivo =
    conta.plano === 'mensal' &&
    conta.plano_expira_em != null &&
    new Date(conta.plano_expira_em) > new Date();

  if (plano.id === 'mensal' && !mensalAtivo) {
    return NextResponse.json(
      { erro: 'Plano mensal inativo.', acao: 'assinar', centavos: plano.centavos },
      { status: 402 }
    );
  }

  // 3. Slug ainda livre? Checar de novo: entre a digitação e o pagamento,
  //    outra pessoa pode ter levado.
  const { data: ocupado } = await admin
    .from('eventos').select('id').eq('slug', slug).maybeSingle();
  if (ocupado) {
    return NextResponse.json(
      { erro: 'Esse endereço acabou de ser usado. Escolha outro.' },
      { status: 409 }
    );
  }

  // 4. O lacre agora e arte em WebP com as iniciais sobrepostas em texto
  //    (LacreArte.tsx). O monograma vetorial gerado aqui ficou desnecessario:
  //    custava ler a fonte do disco a cada publicacao — e era justamente o
  //    `fill="var(...)"` dele que virava borrao preto quando as variaveis do
  //    tema nao chegavam ao contexto da capa.
  const cfgLimpa: ConviteConfig = {
    ...corpo.cfg,
    // Dado sensível nunca entra aqui: este jsonb é legível por anônimo
    // quando o evento está publicado.
  } as ConviteConfig;

  // 5. Cria em rascunho. `publicado_em` só é gravado pelo webhook de
  //    pagamento no plano avulso, para não existir convite no ar sem
  //    cobrança confirmada.
  const { data: evento, error: erroEvento } = await admin
    .from('eventos')
    .insert({
      conta_id: conta.id,
      slug,
      tipo_evento_id: cfgLimpa.tipoEventoId,
      tema_id: cfgLimpa.temaId,
      fonte_id: cfgLimpa.fonteId,
      config: cfgLimpa,
      data_evento: cfgLimpa.evento?.dataIso ?? null,
      origem_plano: plano.id,
      publicado_em: plano.id === 'mensal' ? new Date().toISOString() : null,
    })
    .select('id, slug')
    .single();

  if (erroEvento || !evento) {
    // O erro do banco precisa aparecer no log. Sem isto, uma violacao de chave
    // estrangeira (catalogo de temas/fontes vazio, por exemplo) chega ao
    // usuario como "Não foi possível criar o convite" e nao ha como descobrir
    // a causa sem reproduzir o insert na mao.
    console.error('❌ Falha ao inserir evento:', erroEvento);
    return NextResponse.json({ erro: 'Não foi possível criar o convite.' }, { status: 500 });
  }

  // 5b. Presentes escolhidos viram linhas proprias. Tabela separada porque
  //     cada item tem cotas e recebe pagamento — dentro do jsonb nao daria
  //     para contar venda com integridade.
  const escolhidos = cfgLimpa.presentesEscolhidos ?? [];
  if (escolhidos.length > 0) {
    const { error: erroPresentes } = await admin.from('presentes').insert(
      escolhidos.map((p, i) => ({
        evento_id: evento.id,
        // Chave estavel do diff na edicao. Sem ela, a rota PATCH cai no
        // casamento por titulo — e trocar so a foto de um presente nao
        // atualizaria a linha, porque o titulo continuaria o mesmo.
        catalogo_id: p.catalogoId,
        titulo: p.titulo,
        valor_centavos: p.valorCentavos,
        permite_valor_livre: p.permiteValorLivre ?? false,
        imagem_url: p.imagemUrl ?? null,
        ordem: (i + 1) * 10,
      }))
    );
    // Nao-critico: o convite ja existe. Sem a lista ele publica igual, e o
    // casal pode reabrir a edicao para tentar de novo.
    if (erroPresentes) {
      console.error('⚠️ Falha ao criar presentes (não-crítico):', erroPresentes);
    }
  }

  // 6. Seções em tabela própria: o wizard reordena, e ordenar dentro de um
  //    jsonb tornaria a consulta da página pública mais cara.
  await admin.from('evento_secoes').insert(
    (cfgLimpa.secoes ?? []).map((s) => ({
      evento_id: evento.id,
      tipo: s.tipo,
      ordem: s.ordem,
      ativo: s.ativo,
      config: s.config ?? {},
    }))
  );

  if (corpo.rascunhoToken) {
    await admin.from('rascunhos').delete().eq('token', corpo.rascunhoToken);
  }

  // Mensal já sai publicado. Avulso vai para o PIX e o webhook publica.
  return NextResponse.json({
    eventoId: evento.id,
    slug: evento.slug,
    url: urlDoConvite(evento.slug),
    publicado: plano.id === 'mensal',
    cobranca: plano.id === 'avulso' ? { centavos: plano.centavos } : null,
  });
}