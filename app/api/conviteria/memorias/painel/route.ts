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

  return NextResponse.json({
    ativo,
    status: pacote?.status ?? 'nao_contratado',
    precoCentavos: MEMORIAS_PRECO_CENTAVOS,
    aprovacaoManual: Boolean(pacote?.aprovacao_manual),
    expiraEm: pacote?.expira_em ?? null,
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
  } | null;
  const admin = adminConviteria();

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
  const memoriaId = new URL(req.url).searchParams.get('memoriaId');
  if (!memoriaId) return NextResponse.json({ erro: 'Memória não informada.' }, { status: 400 });

  const admin = adminConviteria();
  const { data: memoria } = await admin.from('evento_memorias')
    .select('id,storage_path')
    .eq('id', memoriaId).eq('evento_id', d.eventoId).neq('status', 'excluido').maybeSingle();
  if (!memoria) return NextResponse.json({ ok: true });

  const { error: storageError } = await adminPublic().storage.from(MEMORIAS_BUCKET).remove([memoria.storage_path]);
  if (storageError) return NextResponse.json({ erro: 'Não foi possível excluir o arquivo.' }, { status: 502 });

  await admin.from('evento_memorias').update({
    status: 'excluido', updated_at: new Date().toISOString(),
  }).eq('id', memoria.id);
  return NextResponse.json({ ok: true });
}
