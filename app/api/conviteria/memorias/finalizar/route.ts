import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, adminPublic } from '@/lib/conviteria/servidor';
import { buscarEventoMemoriasPublicado, pacoteDoEvento } from '@/lib/conviteria/memorias-servidor';
import { MEMORIAS_BUCKET } from '@/lib/conviteria/memorias-config';

export const runtime = 'nodejs';

function mimeBase(mime: string | null | undefined) {
  return (mime ?? '').split(';')[0].trim().toLowerCase();
}

async function excluirReserva(memoria: { id: string; storage_path: string }) {
  const admin = adminConviteria();
  // Storage remove é idempotente para objeto ausente; qualquer falha não deve
  // impedir a liberação da reserva depois de expirada/inválida.
  await adminPublic().storage.from(MEMORIAS_BUCKET).remove([memoria.storage_path]).catch(() => undefined);
  await admin.from('evento_memorias').update({
    status: 'excluido',
    reserva_expira_em: null,
    updated_at: new Date().toISOString(),
  }).eq('id', memoria.id).eq('status', 'reservado');
}

export async function POST(req: NextRequest) {
  const corpo = (await req.json().catch(() => null)) as { slug?: string; memoriaId?: string } | null;
  if (!corpo?.slug || !corpo.memoriaId) {
    return NextResponse.json({ erro: 'Envio inválido.' }, { status: 400 });
  }

  const evento = await buscarEventoMemoriasPublicado(corpo.slug.trim().toLowerCase());
  if (!evento) return NextResponse.json({ erro: 'Memórias indisponíveis.' }, { status: 404 });

  const admin = adminConviteria();
  const { data: memoria } = await admin.from('evento_memorias')
    .select('id,storage_path,status,reserva_expira_em,tamanho_bytes,mime_type,tipo')
    .eq('id', corpo.memoriaId)
    .eq('evento_id', evento.id)
    .maybeSingle();

  if (!memoria || memoria.status !== 'reservado') {
    return NextResponse.json({ erro: 'Reserva de envio não encontrada.' }, { status: 404 });
  }
  if (memoria.reserva_expira_em && new Date(memoria.reserva_expira_em) <= new Date()) {
    await excluirReserva(memoria as { id: string; storage_path: string });
    return NextResponse.json({ erro: 'O envio expirou. Tente novamente.' }, { status: 410 });
  }

  const pacote = await pacoteDoEvento(evento.id);
  const pacoteAtivo = pacote?.status === 'ativo' && (!pacote.expira_em || new Date(pacote.expira_em) > new Date());
  if (!pacoteAtivo) {
    await excluirReserva(memoria as { id: string; storage_path: string });
    return NextResponse.json({ erro: 'O álbum não está mais ativo.' }, { status: 403 });
  }

  // Confere o objeto REAL no Storage. A reserva usa metadados enviados pelo
  // browser apenas para segurar quota; aqui impedimos que uma requisição
  // adulterada reserve 1 KB e faça upload de vários MB usando a URL assinada.
  const partes = (memoria.storage_path as string).split('/');
  const nome = partes.pop()!;
  const pasta = partes.join('/');
  const { data: objetos, error: listError } = await adminPublic().storage
    .from(MEMORIAS_BUCKET)
    .list(pasta, { search: nome, limit: 5 });
  const objeto = (objetos ?? []).find((o) => o.name === nome && o.id != null);
  if (listError || !objeto) {
    return NextResponse.json({ erro: 'O arquivo ainda não terminou de enviar.' }, { status: 409 });
  }

  const tamanhoReal = Number(objeto.metadata?.size ?? 0);
  const mimeReal = mimeBase(String(objeto.metadata?.mimetype ?? memoria.mime_type ?? ''));
  const tamanhoReservado = Number(memoria.tamanho_bytes ?? 0);
  const mimeReservado = mimeBase(memoria.mime_type as string);
  const limiteTipo = memoria.tipo === 'video'
    ? Number(pacote.video_max_bytes)
    : Number(pacote.limite_bytes);

  const arquivoInvalido =
    !Number.isFinite(tamanhoReal) || tamanhoReal <= 0 ||
    tamanhoReal > tamanhoReservado ||
    tamanhoReal > limiteTipo ||
    !mimeReal || mimeReal !== mimeReservado;

  if (arquivoInvalido) {
    await excluirReserva(memoria as { id: string; storage_path: string });
    return NextResponse.json({ erro: 'O arquivo recebido não corresponde ao envio preparado.' }, { status: 400 });
  }

  const novoStatus = pacote.aprovacao_manual ? 'pendente' : 'aprovado';
  const { error } = await admin.from('evento_memorias').update({
    status: novoStatus,
    tamanho_bytes: tamanhoReal,
    mime_type: mimeReal,
    reserva_expira_em: null,
    updated_at: new Date().toISOString(),
  }).eq('id', memoria.id).eq('status', 'reservado');

  if (error) return NextResponse.json({ erro: 'Não foi possível finalizar o envio.' }, { status: 500 });
  return NextResponse.json({ ok: true, status: novoStatus });
}

/** Libera imediatamente uma reserva quando o upload falha no navegador. */
export async function DELETE(req: NextRequest) {
  const corpo = (await req.json().catch(() => null)) as { slug?: string; memoriaId?: string } | null;
  if (!corpo?.slug || !corpo.memoriaId) return NextResponse.json({ ok: true });

  const evento = await buscarEventoMemoriasPublicado(corpo.slug.trim().toLowerCase());
  if (!evento) return NextResponse.json({ ok: true });

  const admin = adminConviteria();
  const { data: memoria } = await admin.from('evento_memorias')
    .select('id,storage_path,status')
    .eq('id', corpo.memoriaId)
    .eq('evento_id', evento.id)
    .maybeSingle();

  if (memoria?.status === 'reservado') {
    await excluirReserva(memoria as { id: string; storage_path: string });
  }
  return NextResponse.json({ ok: true });
}
