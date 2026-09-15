import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { urlDoConvite } from '@/lib/conviteria/marca';
import {
  MEMORIAS_TESTE_LIMITE_BYTES,
  MEMORIAS_TESTE_LIMITE_FOTOS,
  MEMORIAS_TESTE_LIMITE_VIDEOS,
  calcularExpiracaoTeste,
  dataEventoElegivelParaTeste,
  expiracaoEfetivaTeste,
} from '@/lib/conviteria/teste';
import {
  MEMORIAS_LIMITE_BYTES,
  MEMORIAS_LIMITE_FOTOS,
  MEMORIAS_LIMITE_VIDEOS,
  MEMORIAS_PRECO_CENTAVOS,
  MEMORIAS_VIDEO_MAX_BYTES,
  MEMORIAS_VIDEO_MAX_SEGUNDOS,
} from '@/lib/conviteria/memorias-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Corpo = { eventoId?: string };

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ erro: 'Faça login para iniciar o teste.' }, { status: 401 });

  const admin = adminConviteria();
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as Corpo | null;
  if (!corpo?.eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });

  const { data: evento } = await admin.from('eventos')
    .select('id,slug,conta_id,data_evento,publicado_em,origem_plano,arquivado,contas!inner(user_id)')
    .eq('id', corpo.eventoId)
    .maybeSingle();

  if (!evento) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
  const dono = (evento as unknown as { contas: { user_id: string } }).contas?.user_id;
  if (dono !== auth.user.id) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
  if (evento.arquivado) return NextResponse.json({ erro: 'Este convite está arquivado.' }, { status: 409 });
  if (evento.publicado_em) return NextResponse.json({ erro: 'Este convite já está publicado.' }, { status: 409 });
  if (evento.origem_plano !== 'avulso') return NextResponse.json({ erro: 'O teste é destinado ao convite avulso antes da publicação.' }, { status: 409 });

  const { data: existente } = await admin.from('evento_testes')
    .select('id,evento_id,expira_em,convertido_em')
    .eq('conta_id', evento.conta_id)
    .maybeSingle();

  if (existente) {
    const mesmoEvento = existente.evento_id === evento.id;
    const expiraEfetiva = expiracaoEfetivaTeste(
      existente.expira_em,
      evento.data_evento as string | null,
    );
    const ativo = !existente.convertido_em && new Date(expiraEfetiva).getTime() > Date.now();
    if (mesmoEvento && ativo) {
      return NextResponse.json({
        ok: true,
        reutilizado: true,
        testeId: existente.id,
        expiraEm: expiraEfetiva,
        url: urlDoConvite(evento.slug as string),
      });
    }
    return NextResponse.json({ erro: 'O teste gratuito de 24 horas já foi utilizado nesta conta.' }, { status: 409 });
  }

  if (!dataEventoElegivelParaTeste(evento.data_evento as string | null)) {
    return NextResponse.json({
      erro: 'O teste de 24 horas só pode ser iniciado quando o evento está a pelo menos 48 horas de distância.',
    }, { status: 409 });
  }

  const { data: pacote } = await admin.from('evento_memorias_config')
    .select('status')
    .eq('evento_id', evento.id)
    .maybeSingle();

  if (pacote && !['nao_contratado', 'expirado', 'teste'].includes(String(pacote.status))) {
    return NextResponse.json({
      erro: pacote.status === 'aguardando_pagamento'
        ? 'Há um pagamento de Memórias em andamento. Conclua ou aguarde esse PIX expirar antes de iniciar o teste.'
        : 'Memórias já está ativo neste convite; o teste gratuito não é necessário.',
    }, { status: 409 });
  }

  const agora = new Date();
  const expiraEm = calcularExpiracaoTeste(evento.data_evento as string | null, agora);
  if (!expiraEm) {
    return NextResponse.json({ erro: 'A data do evento não permite iniciar o teste agora.' }, { status: 409 });
  }
  const { data: teste, error: testeError } = await admin.from('evento_testes').insert({
    evento_id: evento.id,
    conta_id: evento.conta_id,
    iniciado_em: agora.toISOString(),
    expira_em: expiraEm,
    updated_at: agora.toISOString(),
  }).select('id,expira_em').single();

  if (testeError || !teste) {
    // Concorrência entre duas abas: se uma delas venceu, devolve o trial que já existe.
    const { data: concorrente } = await admin.from('evento_testes')
      .select('id,evento_id,expira_em,convertido_em')
      .eq('conta_id', evento.conta_id)
      .maybeSingle();
    const concorrenteExpira = concorrente?.evento_id === evento.id
      ? expiracaoEfetivaTeste(concorrente.expira_em, evento.data_evento as string | null)
      : null;
    if (concorrente?.evento_id === evento.id && !concorrente.convertido_em && concorrenteExpira && new Date(concorrenteExpira) > new Date()) {
      return NextResponse.json({ ok: true, reutilizado: true, testeId: concorrente.id, expiraEm: concorrenteExpira, url: urlDoConvite(evento.slug as string) });
    }
    return NextResponse.json({ erro: 'Não foi possível iniciar o teste. Tente novamente.' }, { status: 500 });
  }

  let memoriaError: any = null;
  if (!pacote) {
    const r = await admin.from('evento_memorias_config').insert({
      evento_id: evento.id,
      status: 'teste',
      limite_fotos: MEMORIAS_TESTE_LIMITE_FOTOS,
      limite_videos: MEMORIAS_TESTE_LIMITE_VIDEOS,
      limite_bytes: MEMORIAS_TESTE_LIMITE_BYTES,
      video_max_segundos: MEMORIAS_VIDEO_MAX_SEGUNDOS,
      video_max_bytes: MEMORIAS_VIDEO_MAX_BYTES,
      compra_valor_centavos: MEMORIAS_PRECO_CENTAVOS,
      expira_em: expiraEm,
      updated_at: agora.toISOString(),
    });
    memoriaError = r.error;
  } else if (['nao_contratado', 'expirado', 'teste'].includes(String(pacote.status))) {
    const r = await admin.from('evento_memorias_config').update({
      status: 'teste',
      limite_fotos: MEMORIAS_TESTE_LIMITE_FOTOS,
      limite_videos: MEMORIAS_TESTE_LIMITE_VIDEOS,
      limite_bytes: MEMORIAS_TESTE_LIMITE_BYTES,
      video_max_segundos: MEMORIAS_VIDEO_MAX_SEGUNDOS,
      video_max_bytes: MEMORIAS_VIDEO_MAX_BYTES,
      compra_valor_centavos: MEMORIAS_PRECO_CENTAVOS,
      comprado_em: null,
      expira_em: expiraEm,
      pix_transaction_id: null,
      pix_txid: null,
      updated_at: agora.toISOString(),
    }).eq('evento_id', evento.id);
    memoriaError = r.error;
  }

  if (memoriaError) {
    // Nada foi exposto ainda; desfaz o trial para não consumir a única chance por uma falha interna.
    await admin.from('evento_testes').delete().eq('id', teste.id);
    // Mantém limites comerciais seguros caso um update parcial tenha ocorrido.
    await admin.from('evento_memorias_config').update({
      status: 'nao_contratado',
      limite_fotos: MEMORIAS_LIMITE_FOTOS,
      limite_videos: MEMORIAS_LIMITE_VIDEOS,
      limite_bytes: MEMORIAS_LIMITE_BYTES,
      video_max_segundos: MEMORIAS_VIDEO_MAX_SEGUNDOS,
      video_max_bytes: MEMORIAS_VIDEO_MAX_BYTES,
      expira_em: null,
      updated_at: new Date().toISOString(),
    }).eq('evento_id', evento.id).eq('status', 'teste');
    return NextResponse.json({ erro: 'Não foi possível preparar os recursos do teste. Tente novamente.' }, { status: 500 });
  }

  revalidatePath(`/convite/${evento.slug}`);

  return NextResponse.json({
    ok: true,
    testeId: teste.id,
    expiraEm: teste.expira_em,
    url: urlDoConvite(evento.slug as string),
    memoriasTeste: pacote?.status !== 'ativo' && pacote?.status !== 'aguardando_pagamento',
  });
}
