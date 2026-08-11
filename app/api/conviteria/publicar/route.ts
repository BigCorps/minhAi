import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MENSAGEM_ERRO, normalizarSlug, validarSlug } from '@/lib/conviteria/slug';
import { PLANOS } from '@/lib/conviteria/precos';
import { urlDoConvite } from '@/lib/conviteria/marca';
import { gerarMonograma } from '@/lib/conviteria/lacre';
import type { ConviteConfig } from '@/lib/conviteria/tipos';

export const runtime = 'nodejs';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'conviteria' }, auth: { persistSession: false } }
);

interface Corpo {
  rascunhoToken: string;
  slug: string;
  planoId: 'avulso' | 'mensal';
  cfg: ConviteConfig;
}

export async function POST(req: NextRequest) {
  // Identidade vem do cookie de sessao do Supabase, nunca do corpo: aceitar
  // user_id do cliente deixaria qualquer um publicar na conta de outro.
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

  // 2. Direito de criar. Plano vencido bloqueia CRIAR; nunca derruba o que
  //    ja esta publicado — quem tem o link e o convidado, nao o cliente.
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

  // 3. Slug ainda livre? Checar de novo: entre a digitacao e o pagamento,
  //    outra pessoa pode ter levado.
  const { data: ocupado } = await admin
    .from('eventos').select('id').eq('slug', slug).maybeSingle();
  if (ocupado) {
    return NextResponse.json({ erro: 'Esse endereço acabou de ser usado. Escolha outro.' }, { status: 409 });
  }

  // 4. Monograma como contorno: o convite publicado nao pode depender da
  //    fonte carregar no navegador de quem abre.
  const monograma = gerarMonograma(corpo.cfg.anfitrioes?.iniciais ?? '');

  const cfgLimpa: ConviteConfig = {
    ...corpo.cfg,
    // Dado sensivel nunca entra aqui: este jsonb e legivel por anonimo
    // quando o evento esta publicado.
    lacrePath: monograma.d,
  } as ConviteConfig;

  // 5. Cria em rascunho. `publicado_em` so e gravado pelo webhook de
  //    pagamento, para nao existir convite no ar sem cobranca confirmada.
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
    return NextResponse.json({ erro: 'Não foi possível criar o convite.' }, { status: 500 });
  }

  // 6. Secoes em tabela propria: o wizard reordena, e ordenar dentro de um
  //    jsonb tornaria a consulta da pagina publica mais cara.
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

  // Mensal ja sai publicado. Avulso vai para o PIX e o webhook publica.
  return NextResponse.json({
    eventoId: evento.id,
    slug: evento.slug,
    url: urlDoConvite(evento.slug),
    publicado: plano.id === 'mensal',
    cobranca: plano.id === 'avulso' ? { centavos: plano.centavos } : null,
  });
}
