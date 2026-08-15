import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import type { ConviteConfig } from '@/lib/conviteria/tipos';

export const runtime = 'nodejs';

/** Teto do config, igual ao da rota de rascunho. */
const LIMITE_CONFIG = 256 * 1024;

/**
 * Confere que o evento pertence a quem esta pedindo.
 *
 * Devolve 404, e nao 403, quando o dono e outro: responder "existe mas nao e
 * seu" transforma o endpoint num verificador de uuid alheio.
 */
async function eventoDoUsuario(
  admin: ReturnType<typeof adminConviteria>,
  token: string,
  eventoId: string
) {
  const { data: auth, error } = await admin.auth.getUser(token);
  if (error || !auth.user) return { erro: 'Sessão inválida.', status: 401 as const };

  const { data: evento } = await admin
    .from('eventos')
    .select('id, slug, config, publicado_em, tipo_evento_id, contas!inner(user_id)')
    .eq('id', eventoId)
    .maybeSingle();

  if (!evento) return { erro: 'Convite não encontrado.', status: 404 as const };

  const dono = (evento as unknown as { contas: { user_id: string } }).contas?.user_id;
  if (dono !== auth.user.id) {
    return { erro: 'Convite não encontrado.', status: 404 as const };
  }

  return { evento };
}

// ── GET: carrega o convite para edicao ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ erro: 'Faça login.' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });

  const admin = adminConviteria();
  const r = await eventoDoUsuario(admin, token, id);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  return NextResponse.json({
    id: r.evento.id,
    slug: r.evento.slug,
    publicado: !!r.evento.publicado_em,
    cfg: r.evento.config,
  });
}

// ── PATCH: salva alteracoes ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ erro: 'Faça login.' }, { status: 401 });

  let corpo: { id?: string; cfg?: ConviteConfig };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }

  if (!corpo.id || !corpo.cfg || typeof corpo.cfg !== 'object') {
    return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 });
  }

  if (JSON.stringify(corpo.cfg).length > LIMITE_CONFIG) {
    return NextResponse.json({ erro: 'Convite grande demais.' }, { status: 413 });
  }

  const admin = adminConviteria();
  const r = await eventoDoUsuario(admin, token, corpo.id);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const atual = (r.evento.config ?? {}) as ConviteConfig;

  // ── Campos que a edicao nao muda ──────────────────────────────────────────
  //
  // Sao ignorados em silencio, e nao recusados: o resto das alteracoes da
  // pessoa e legitimo, e derrubar o PATCH inteiro puniria por algo que ela
  // provavelmente nem tentou fazer.
  //
  //   publicacao   slug ja divulgado no WhatsApp, no impresso, na legenda do
  //                Instagram. Trocar quebraria todo link ja compartilhado.
  //   anfitrioes   nome e iniciais definem de quem e o convite. Liberar a
  //                troca e liberar reaproveitar um convite pago em outro
  //                evento. Erro de digitacao se resolve pelo suporte.
  //   tipoEventoId casamento nao vira aniversario. Mesma razao.
  //
  // Como `anfitrioes` esta congelado, o monograma tambem esta: nao ha o que
  // regerar, e `lacrePath` e simplesmente preservado.
  const cfgNova: ConviteConfig = {
    ...corpo.cfg,
    publicacao: atual.publicacao,
    anfitrioes: atual.anfitrioes,
    tipoEventoId: atual.tipoEventoId,
    lacrePath: atual.lacrePath,
  };

  const { error: erroUpdate } = await admin
    .from('eventos')
    .update({
      config: cfgNova,
      tema_id: cfgNova.temaId,
      fonte_id: cfgNova.fonteId,
      tipo_evento_id: cfgNova.tipoEventoId,
      data_evento: cfgNova.evento?.dataIso ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', corpo.id);

  if (erroUpdate) {
    console.error('❌ Falha ao atualizar evento:', erroUpdate);
    return NextResponse.json({ erro: 'Não foi possível salvar.' }, { status: 500 });
  }

  // ── Presentes ─────────────────────────────────────────────────────────────
  //
  // Aqui NAO se apaga e reinsere como nas secoes. `presentes` tem
  // `cotas_vendidas` e e referenciada por `presente_pagamentos`: apagar uma
  // linha ja comprada destruiria historico de dinheiro recebido.
  //
  // Regra: item novo entra; item existente e ATUALIZADO; item removido pela
  // pessoa e apenas DESATIVADO, e so quando ninguem comprou. Item com venda
  // permanece visivel, porque quem pagou tem direito de ver o presente que
  // deu no convite.
  //
  // O casamento e por `catalogo_id`, nao por titulo. Com titulo, trocar so a
  // foto mantinha o titulo, o item nao entrava como "novo" e nada acontecia —
  // a imagem antiga ficava no banco para sempre. Era por isso que a previa
  // mostrava a foto nova (le o config) e o convite publicado nao (le a
  // tabela). O mesmo valia para preco e valor livre.
  const escolhidos = cfgNova.presentesEscolhidos ?? [];

  const { data: atuaisPresentes } = await admin
    .from('presentes')
    .select('id, catalogo_id, titulo, valor_centavos, permite_valor_livre, imagem_url, ordem, cotas_vendidas, ativo')
    .eq('evento_id', corpo.id);

  // Linhas antigas nao tem `catalogo_id`. Para elas o titulo ainda e a unica
  // chave disponivel — entao mantemos os dois indices e preenchemos o
  // `catalogo_id` na primeira atualizacao, migrando sozinho.
  const porCatalogo = new Map<string, (typeof atuaisPresentes)[number]>();
  const porTitulo = new Map<string, (typeof atuaisPresentes)[number]>();
  for (const p of atuaisPresentes ?? []) {
    if (p.catalogo_id) porCatalogo.set(p.catalogo_id as string, p);
    porTitulo.set(p.titulo as string, p);
  }

  const usados = new Set<string>();

  /** Casa por catalogo_id; cai no titulo so para linha legada sem a coluna. */
  function achar(cat: string, titulo: string) {
    const porId = porCatalogo.get(cat);
    if (porId) return porId;
    const porNome = porTitulo.get(titulo);
    // Duas escolhas nao podem casar com a mesma linha: sem esta guarda, dois
    // itens de titulo igual sobrescreveriam um ao outro.
    return porNome && !usados.has(porNome.id as string) ? porNome : undefined;
  }

  for (const [i, p] of escolhidos.entries()) {
    const existente = achar(p.catalogoId, p.titulo);

    if (!existente) {
      await admin.from('presentes').insert({
        evento_id: corpo.id,
        catalogo_id: p.catalogoId,
        titulo: p.titulo,
        valor_centavos: p.valorCentavos,
        permite_valor_livre: p.permiteValorLivre ?? false,
        imagem_url: p.imagemUrl ?? null,
        ordem: (i + 1) * 10,
        ativo: true,
      });
      continue;
    }

    usados.add(existente.id as string);

    // So grava se algo mudou de fato: um PATCH sem alteracao em presentes nao
    // precisa tocar em nenhuma linha.
    const mudou =
      existente.catalogo_id !== p.catalogoId ||
      existente.titulo !== p.titulo ||
      existente.valor_centavos !== p.valorCentavos ||
      !!existente.permite_valor_livre !== !!p.permiteValorLivre ||
      (existente.imagem_url ?? null) !== (p.imagemUrl ?? null) ||
      !existente.ativo;

    if (mudou) {
      await admin
        .from('presentes')
        .update({
          catalogo_id: p.catalogoId,
          titulo: p.titulo,
          valor_centavos: p.valorCentavos,
          permite_valor_livre: p.permiteValorLivre ?? false,
          imagem_url: p.imagemUrl ?? null,
          ordem: (i + 1) * 10,
          // Reativa item que a pessoa tirou e recolocou depois.
          ativo: true,
        })
        .eq('id', existente.id);
    } else if (existente.ordem !== (i + 1) * 10) {
      await admin.from('presentes').update({ ordem: (i + 1) * 10 }).eq('id', existente.id);
    }
  }

  // Removidos: desativa, nunca apaga — e so quando ninguem comprou.
  for (const p of atuaisPresentes ?? []) {
    if (usados.has(p.id as string)) continue;
    if ((p.cotas_vendidas as number) > 0) continue;
    if (!p.ativo) continue;
    await admin.from('presentes').update({ ativo: false }).eq('id', p.id);
  }

  // Secoes: apaga e reinsere. Fazer diff por tipo daria o mesmo resultado com
  // muito mais codigo, e a lista tem no maximo 15 linhas.
  await admin.from('evento_secoes').delete().eq('evento_id', corpo.id);
  await admin.from('evento_secoes').insert(
    (cfgNova.secoes ?? []).map((s) => ({
      evento_id: corpo.id,
      tipo: s.tipo,
      ordem: s.ordem,
      ativo: s.ativo,
      config: s.config ?? {},
    }))
  );

  return NextResponse.json({ ok: true, slug: r.evento.slug });
}
