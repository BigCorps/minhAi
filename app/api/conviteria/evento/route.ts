import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import {
  normalizarPresentesEscolhidos,
} from '@/lib/conviteria/catalogo';
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
  if (error || !auth.user) {
    return { erro: 'Sessão inválida.', status: 401 as const };
  }

  const { data: evento } = await admin
    .from('eventos')
    .select('id, slug, config, publicado_em, tipo_evento_id, contas!inner(user_id)')
    .eq('id', eventoId)
    .maybeSingle();

  if (!evento) {
    return { erro: 'Convite não encontrado.', status: 404 as const };
  }

  const dono =
    (evento as unknown as { contas: { user_id: string } })
      .contas?.user_id;

  if (dono !== auth.user.id) {
    return { erro: 'Convite não encontrado.', status: 404 as const };
  }

  return { evento };
}

// ── GET: carrega o convite para edicao ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.headers
    .get('authorization')
    ?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { erro: 'Faça login.' },
      { status: 401 }
    );
  }

  const id =
    new URL(req.url).searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { erro: 'Convite não informado.' },
      { status: 400 }
    );
  }

  const admin = adminConviteria();
  const r = await eventoDoUsuario(admin, token, id);

  if ('erro' in r) {
    return NextResponse.json(
      { erro: r.erro },
      { status: r.status }
    );
  }

  return NextResponse.json({
    id: r.evento.id,
    slug: r.evento.slug,
    publicado: !!r.evento.publicado_em,
    cfg: r.evento.config,
  });
}

// ── PATCH: salva alteracoes ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const token = req.headers
    .get('authorization')
    ?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { erro: 'Faça login.' },
      { status: 401 }
    );
  }

  let corpo: {
    id?: string;
    cfg?: ConviteConfig;
  };

  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json(
      { erro: 'Requisição inválida.' },
      { status: 400 }
    );
  }

  if (
    !corpo.id ||
    !corpo.cfg ||
    typeof corpo.cfg !== 'object'
  ) {
    return NextResponse.json(
      { erro: 'Dados incompletos.' },
      { status: 400 }
    );
  }

  if (JSON.stringify(corpo.cfg).length > LIMITE_CONFIG) {
    return NextResponse.json(
      { erro: 'Convite grande demais.' },
      { status: 413 }
    );
  }

  const admin = adminConviteria();
  const r = await eventoDoUsuario(
    admin,
    token,
    corpo.id
  );

  if ('erro' in r) {
    return NextResponse.json(
      { erro: r.erro },
      { status: r.status }
    );
  }

  const atual =
    (r.evento.config ?? {}) as ConviteConfig;

  // ── Campos que a edicao nao muda ──────────────────────────────────────────
  //
  // publicacao / anfitrioes / tipo do evento permanecem congelados.
  // A lista de presentes, ao contrário, é normalizada aqui no servidor:
  // máximo 50 e nunca dois itens com o mesmo catalogoId.
  const escolhidos =
    normalizarPresentesEscolhidos(
      corpo.cfg.presentesEscolhidos
    );

  const cfgNova: ConviteConfig = {
    ...corpo.cfg,
    presentesEscolhidos: escolhidos,
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
      data_evento:
        cfgNova.evento?.dataIso ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', corpo.id);

  if (erroUpdate) {
    console.error(
      '❌ Falha ao atualizar evento:',
      erroUpdate
    );

    return NextResponse.json(
      { erro: 'Não foi possível salvar.' },
      { status: 500 }
    );
  }

  // ── Presentes ─────────────────────────────────────────────────────────────
  //
  // Nunca apagamos uma linha porque `presente_pagamentos` pode referenciá-la.
  // O estado público, porém, precisa refletir EXATAMENTE o config atual:
  // removido = ativo false, tenha ou não venda. O histórico financeiro
  // continua existindo na mesma linha e nos pagamentos, só sai da vitrine.
  const { data: atuaisPresentes, error: erroLeitura } =
    await admin
      .from('presentes')
      .select(
        'id, catalogo_id, titulo, valor_centavos, permite_valor_livre, imagem_url, ordem, cotas_vendidas, ativo'
      )
      .eq('evento_id', corpo.id);

  if (erroLeitura) {
    console.error(
      '❌ Falha ao ler presentes do evento:',
      erroLeitura
    );

    return NextResponse.json(
      {
        erro:
          'O convite foi salvo, mas não foi possível sincronizar a lista de presentes. Tente salvar novamente.',
      },
      { status: 500 }
    );
  }

  const porCatalogo =
    new Map<string, (typeof atuaisPresentes)[number]>();

  const porTitulo =
    new Map<string, (typeof atuaisPresentes)[number]>();

  for (const p of atuaisPresentes ?? []) {
    if (p.catalogo_id) {
      porCatalogo.set(
        p.catalogo_id as string,
        p
      );
    }

    porTitulo.set(
      p.titulo as string,
      p
    );
  }

  const usados = new Set<string>();

  /** Casa por catalogo_id; cai no titulo so para linha legada. */
  function achar(cat: string, titulo: string) {
    const porId = porCatalogo.get(cat);

    if (
      porId &&
      !usados.has(porId.id as string)
    ) {
      return porId;
    }

    const porNome = porTitulo.get(titulo);

    return (
      porNome &&
      !usados.has(porNome.id as string)
        ? porNome
        : undefined
    );
  }

  for (const [i, p] of escolhidos.entries()) {
    const existente =
      achar(p.catalogoId, p.titulo);

    if (!existente) {
      const { error } = await admin
        .from('presentes')
        .insert({
          evento_id: corpo.id,
          catalogo_id: p.catalogoId,
          titulo: p.titulo,
          valor_centavos: p.valorCentavos,
          permite_valor_livre:
            p.permiteValorLivre ?? false,
          imagem_url: p.imagemUrl ?? null,
          ordem: (i + 1) * 10,
          ativo: true,
        });

      if (error) {
        console.error(
          '❌ Falha ao inserir presente:',
          error
        );

        return NextResponse.json(
          {
            erro:
              'O convite foi salvo, mas um presente não pôde ser sincronizado. Tente salvar novamente.',
          },
          { status: 500 }
        );
      }

      continue;
    }

    usados.add(existente.id as string);

    const mudou =
      existente.catalogo_id !==
        p.catalogoId ||
      existente.titulo !== p.titulo ||
      existente.valor_centavos !==
        p.valorCentavos ||
      !!existente.permite_valor_livre !==
        !!p.permiteValorLivre ||
      (existente.imagem_url ?? null) !==
        (p.imagemUrl ?? null) ||
      !existente.ativo;

    if (mudou) {
      const { error } = await admin
        .from('presentes')
        .update({
          catalogo_id: p.catalogoId,
          titulo: p.titulo,
          valor_centavos: p.valorCentavos,
          permite_valor_livre:
            p.permiteValorLivre ?? false,
          imagem_url: p.imagemUrl ?? null,
          ordem: (i + 1) * 10,
          ativo: true,
        })
        .eq('id', existente.id);

      if (error) {
        console.error(
          '❌ Falha ao atualizar presente:',
          error
        );

        return NextResponse.json(
          {
            erro:
              'O convite foi salvo, mas um presente não pôde ser atualizado. Tente salvar novamente.',
          },
          { status: 500 }
        );
      }
    } else if (
      existente.ordem !==
      (i + 1) * 10
    ) {
      const { error } = await admin
        .from('presentes')
        .update({
          ordem: (i + 1) * 10,
        })
        .eq('id', existente.id);

      if (error) {
        console.error(
          '❌ Falha ao reordenar presente:',
          error
        );
      }
    }
  }

  // Removido do config = removido da lista pública.
  //
  // Antes havia uma exceção para `cotas_vendidas > 0`, que deixava o presente
  // ativo e fazia fotos/títulos antigos reaparecerem no convite. O histórico
  // da venda não depende de `ativo=true`, então a linha permanece no banco
  // apenas como histórico.
  for (const p of atuaisPresentes ?? []) {
    if (usados.has(p.id as string)) {
      continue;
    }

    if (!p.ativo) continue;

    const { error } = await admin
      .from('presentes')
      .update({ ativo: false })
      .eq('id', p.id);

    if (error) {
      console.error(
        '❌ Falha ao desativar presente removido:',
        error
      );
    }
  }

  // Secoes: apaga e reinsere.
  await admin
    .from('evento_secoes')
    .delete()
    .eq('evento_id', corpo.id);

  await admin
    .from('evento_secoes')
    .insert(
      (cfgNova.secoes ?? []).map((s) => ({
        evento_id: corpo.id,
        tipo: s.tipo,
        ordem: s.ordem,
        ativo: s.ativo,
        config: s.config ?? {},
      }))
    );

  return NextResponse.json({
    ok: true,
    slug: r.evento.slug,
  });
}
