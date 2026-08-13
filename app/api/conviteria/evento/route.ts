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
