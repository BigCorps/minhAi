import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, adminPublic } from '@/lib/conviteria/servidor';
import {
  buscarEventoDoDono,
  midiasAssinadas,
  pacoteDoEvento,
  usoMemorias,
} from '@/lib/conviteria/memorias-servidor';
import {
  MEMORIAS_BUCKET,
  MEMORIAS_PRECO_CENTAVOS,
  urlAlbum,
  urlMemorias,
} from '@/lib/conviteria/memorias-config';
import {
  configDesafiosPublica,
  sanitizarDesafiosIds,
  sanitizarTituloDesafios,
  type MemoriasDesafiosConfig,
} from '@/lib/conviteria/memorias-desafios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function dono(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const eventoId = new URL(req.url).searchParams.get('eventoId');
  if (!token || !eventoId) return null;
  const evento = await buscarEventoDoDono(token, eventoId);
  return evento ? { token, eventoId, evento } : null;
}

export async function GET(req: NextRequest) {
  const d = await dono(req);
  if (!d) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
  const pacote = await pacoteDoEvento(d.eventoId);
  const ativo = pacote?.status === 'ativo' && (!pacote.expira_em || new Date(pacote.expira_em) > new Date());
  const uso = ativo ? await usoMemorias(d.eventoId) : { fotos: 0, videos: 0, bytes: 0 };
  const midias = ativo ? await midiasAssinadas(d.eventoId, false, 3600) : [];
  const cfg = (d.evento.config ?? {}) as Record<string, any>;

  return NextResponse.json({
    ativo,
    status: pacote?.status ?? 'nao_contratado',
    precoCentavos: MEMORIAS_PRECO_CENTAVOS,
    aprovacaoManual: Boolean(pacote?.aprovacao_manual),
    expiraEm: pacote?.expira_em ?? null,
    ornamentoId: typeof cfg.ornamentoId === 'string' ? cfg.ornamentoId : 'casamento-original',
    desafios: configDesafiosPublica(pacote),
    limites: pacote ? {
      fotos: Number(pacote.limite_fotos),
      videos: Number(pacote.limite_videos),
      bytes: Number(pacote.limite_bytes),
    } : { fotos: 300, videos: 30, bytes: 300 * 1024 * 1024 },
    uso,
    urlMemorias: urlMemorias(d.evento.slug as string),
    urlAlbum: urlAlbum(d.evento.slug as string),
    midias,
  });
}

export async function PATCH(req: NextRequest) {
  const d = await dono(req);
  if (!d) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
  const corpo = (await req.json().catch(() => null)) as {
    aprovacaoManual?: boolean;
    memoriaId?: string;
    status?: 'aprovado' | 'pendente' | 'oculto';
    desafios?: Partial<MemoriasDesafiosConfig>;
  } | null;
  const admin = adminConviteria();

  if (corpo?.desafios && typeof corpo.desafios === 'object') {
    const ids = sanitizarDesafiosIds(corpo.desafios.ids);
    const titulo = sanitizarTituloDesafios(corpo.desafios.titulo);
    const ativo = Boolean(corpo.desafios.ativo) && ids.length > 0;
    const { error } = await admin.from('evento_memorias_config').update({
      desafios_ativos: ativo,
      desafios_titulo: titulo,
      desafios_ids: ids,
      updated_at: new Date().toISOString(),
    }).eq('evento_id', d.eventoId).eq('status', 'ativo');
    if (error) return NextResponse.json({ erro: 'Não foi possível salvar os desafios.' }, { status: 500 });
    return NextResponse.json({ ok: true, desafios: { ativo, titulo, ids } });
  }

  if (typeof corpo?.aprovacaoManual === 'boolean') {
    const { error } = await admin.from('evento_memorias_config').update({
      aprovacao_manual: corpo.aprovacaoManual,
      updated_at: new Date().toISOString(),
    }).eq('evento_id', d.eventoId).eq('status', 'ativo');
    if (error) return NextResponse.json({ erro: 'Não foi possível alterar a moderação.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (corpo?.memoriaId && corpo.status && ['aprovado','pendente','oculto'].includes(corpo.status)) {
    const { error } = await admin.from('evento_memorias').update({
      status: corpo.status,
      updated_at: new Date().toISOString(),
    }).eq('id', corpo.memoriaId).eq('evento_id', d.eventoId).neq('status', 'excluido');
    if (error) return NextResponse.json({ erro: 'Não foi possível atualizar a memória.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ erro: 'Alteração inválida.' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const d = await dono(req);
  if (!d) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });

  const url = new URL(req.url);
  const memoriaId = url.searchParams.get('memoriaId');
  const corpo = (await req.json().catch(() => null)) as { memoriaIds?: string[] } | null;

  const idsDoCorpo = Array.isArray(corpo?.memoriaIds)
    ? corpo!.memoriaIds.filter((id) => typeof id === 'string' && id.length > 0).slice(0, 400)
    : [];
  const ids = memoriaId ? [memoriaId] : [...new Set(idsDoCorpo)];
  if (!ids.length) return NextResponse.json({ erro: 'Memória não informada.' }, { status: 400 });

  const admin = adminConviteria();
  const { data: memorias, error: buscaError } = await admin.from('evento_memorias')
    .select('id,storage_path')
    .eq('evento_id', d.eventoId)
    .in('id', ids)
    .neq('status', 'excluido');

  if (buscaError) return NextResponse.json({ erro: 'Não foi possível localizar os arquivos.' }, { status: 500 });
  if (!memorias?.length) return NextResponse.json({ ok: true, excluidos: 0 });

  const caminhos = memorias.map((m: any) => m.storage_path as string).filter(Boolean);
  if (caminhos.length) {
    const { error: storageError } = await adminPublic().storage.from(MEMORIAS_BUCKET).remove(caminhos);
    if (storageError) return NextResponse.json({ erro: 'Não foi possível excluir os arquivos.' }, { status: 502 });
  }

  const memoriaIds = memorias.map((m: any) => m.id as string);
  const { error: updateError } = await admin.from('evento_memorias').update({
    status: 'excluido', updated_at: new Date().toISOString(),
  }).eq('evento_id', d.eventoId).in('id', memoriaIds);

  if (updateError) return NextResponse.json({ erro: 'Os arquivos foram removidos, mas o histórico não pôde ser atualizado.' }, { status: 500 });
  return NextResponse.json({ ok: true, excluidos: memoriaIds.length });
}
