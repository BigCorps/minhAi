import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { adminConviteria, adminPublic, hashIp, ipDaRequisicao } from '@/lib/conviteria/servidor';
import {
  buscarEventoMemoriasPublicado,
  pacoteDoEvento,
} from '@/lib/conviteria/memorias-servidor';
import {
  MEMORIAS_ARQUIVO_MAX_BYTES,
  MEMORIAS_BUCKET,
  MEMORIAS_MIMES_FOTO,
  MEMORIAS_MIMES_VIDEO,
  MEMORIAS_RESERVA_MINUTOS,
  type MemoriaTipo,
} from '@/lib/conviteria/memorias-config';
import {
  MEMORIAS_NOME_ERRO,
  nomeConvidadoValido,
  normalizarNomeConvidado,
} from '@/lib/conviteria/memorias-nome';

export const runtime = 'nodejs';

function extensao(tipo: MemoriaTipo, mime: string) {
  if (tipo === 'video') {
    if (mime === 'video/webm') return 'webm';
    if (mime === 'video/quicktime') return 'mov';
    return 'mp4';
  }
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic') return 'heic';
  if (mime === 'image/heif') return 'heif';
  return 'jpg';
}

export async function POST(req: NextRequest) {
  const corpo = (await req.json().catch(() => null)) as {
    slug?: string;
    tipo?: MemoriaTipo;
    mimeType?: string;
    tamanhoBytes?: number;
    duracaoSegundos?: number | null;
    largura?: number | null;
    altura?: number | null;
    nomeConvidado?: string | null;
  } | null;

  if (!corpo?.slug || !corpo.tipo || !corpo.mimeType || !Number.isFinite(corpo.tamanhoBytes)) {
    return NextResponse.json({ erro: 'Arquivo inválido.' }, { status: 400 });
  }

  const nomeConvidado = normalizarNomeConvidado(corpo.nomeConvidado);
  if (!nomeConvidadoValido(nomeConvidado)) {
    return NextResponse.json({ erro: MEMORIAS_NOME_ERRO }, { status: 400 });
  }

  const evento = await buscarEventoMemoriasPublicado(corpo.slug.trim().toLowerCase());
  if (!evento) return NextResponse.json({ erro: 'Memórias indisponíveis.' }, { status: 404 });

  const pacote = await pacoteDoEvento(evento.id);
  if (!pacote || pacote.status !== 'ativo') {
    return NextResponse.json({ erro: 'O álbum não está ativo.' }, { status: 403 });
  }

  const mimeOk = corpo.tipo === 'foto'
    ? (MEMORIAS_MIMES_FOTO as readonly string[]).includes(corpo.mimeType)
    : (MEMORIAS_MIMES_VIDEO as readonly string[]).includes(corpo.mimeType);
  if (!mimeOk) return NextResponse.json({ erro: 'Formato de arquivo não aceito.' }, { status: 415 });

  const tamanho = Math.trunc(Number(corpo.tamanhoBytes));
  if (tamanho <= 0) return NextResponse.json({ erro: 'Arquivo vazio.' }, { status: 400 });
  if (tamanho > MEMORIAS_ARQUIVO_MAX_BYTES) {
    return NextResponse.json({ erro: 'O arquivo excede 8 MB após a compactação.' }, { status: 413 });
  }
  if (corpo.tipo === 'video') {
    if (tamanho > Number(pacote.video_max_bytes)) {
      return NextResponse.json({ erro: `O vídeo excede ${Math.round(Number(pacote.video_max_bytes) / 1024 / 1024)} MB após a compactação.` }, { status: 413 });
    }
    const duracao = Number(corpo.duracaoSegundos ?? 0);
    if (!Number.isFinite(duracao) || duracao <= 0 || duracao > Number(pacote.video_max_segundos) + 0.25) {
      return NextResponse.json({ erro: 'O vídeo precisa ter no máximo 30 segundos.' }, { status: 400 });
    }
  }

  const admin = adminConviteria();
  const ipHash = hashIp(ipDaRequisicao(req));
  const umaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: enviosIp } = await admin.from('evento_memorias')
    .select('id', { count: 'exact', head: true })
    .eq('evento_id', evento.id)
    .eq('ip_hash', ipHash)
    .gte('created_at', umaHora)
    .neq('status', 'excluido');

  if ((enviosIp ?? 0) >= 120) {
    return NextResponse.json({ erro: 'Muitos envios deste dispositivo. Tente novamente mais tarde.' }, { status: 429 });
  }

  const id = randomUUID();
  const agora = new Date();
  const reservaExpira = new Date(agora.getTime() + MEMORIAS_RESERVA_MINUTOS * 60_000);
  const mes = agora.toISOString().slice(0, 7);
  const storagePath = `${evento.id}/${mes}/${id}.${extensao(corpo.tipo, corpo.mimeType)}`;
  const largura = corpo.largura && corpo.largura > 0 ? Math.round(corpo.largura) : null;
  const altura = corpo.altura && corpo.altura > 0 ? Math.round(corpo.altura) : null;

  const { data: resultadoReserva, error: reservaError } = await admin.rpc(
    'reservar_evento_memoria',
    {
      p_id: id,
      p_evento_id: evento.id,
      p_tipo: corpo.tipo,
      p_storage_path: storagePath,
      p_mime_type: corpo.mimeType,
      p_tamanho_bytes: tamanho,
      p_duracao_segundos: corpo.tipo === 'video' ? Number(corpo.duracaoSegundos) : null,
      p_largura: largura,
      p_altura: altura,
      p_nome_convidado: nomeConvidado,
      p_ip_hash: ipHash,
      p_reserva_expira_em: reservaExpira.toISOString(),
    },
  );

  if (reservaError) {
    console.error('Falha ao reservar Memória:', reservaError);
    return NextResponse.json({ erro: 'Não foi possível preparar o envio.' }, { status: 500 });
  }

  const codigo = String(resultadoReserva ?? '');
  if (codigo !== 'ok') {
    if (codigo === 'limite_fotos') return NextResponse.json({ erro: 'O limite de fotos deste evento foi atingido.' }, { status: 409 });
    if (codigo === 'limite_videos') return NextResponse.json({ erro: 'O limite de vídeos deste evento foi atingido.' }, { status: 409 });
    if (codigo === 'limite_bytes') return NextResponse.json({ erro: 'O espaço de Memórias deste evento foi preenchido.' }, { status: 409 });
    if (codigo === 'pacote_inativo') return NextResponse.json({ erro: 'O álbum não está mais ativo.' }, { status: 403 });
    if (codigo === 'conflito') return NextResponse.json({ erro: 'Houve outro envio ao mesmo tempo. Tente novamente.' }, { status: 409 });
    return NextResponse.json({ erro: 'Não foi possível reservar espaço para o arquivo.' }, { status: 500 });
  }

  const storage = adminPublic().storage.from(MEMORIAS_BUCKET);
  const { data: signed, error: signedError } = await storage.createSignedUploadUrl(storagePath);
  if (signedError || !signed?.token) {
    await admin.from('evento_memorias').update({ status: 'excluido' }).eq('id', id);
    return NextResponse.json({ erro: 'Não foi possível preparar o upload.' }, { status: 500 });
  }

  return NextResponse.json({
    memoriaId: id,
    bucket: MEMORIAS_BUCKET,
    path: storagePath,
    token: signed.token,
    reservaExpiraEm: reservaExpira.toISOString(),
  });
}
