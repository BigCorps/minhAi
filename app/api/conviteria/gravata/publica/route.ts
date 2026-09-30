import { NextResponse, type NextRequest } from 'next/server';
import {
  adminConviteria,
  buscarEventoAcessivelPorId,
  hashIp,
  ipDaRequisicao,
} from '@/lib/conviteria/servidor';
import { calcularTaxa } from '@/lib/conviteria/precos';
import { resolverLinkGravataWhatsApp } from '@/lib/conviteria/gravata-whatsapp-servidor';
import {
  HORA_GRAVATA_MAX_CONTRIBUICAO_CENTAVOS,
  HORA_GRAVATA_MIN_CONTRIBUICAO_CENTAVOS,
} from '@/lib/conviteria/gravata-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_TENTATIVAS_10_MIN = 6;

function inteiroSeguro(valor: unknown) {
  const n = Number(valor);
  return Number.isSafeInteger(n) ? n : null;
}

function origemValida(valor: unknown) {
  return ['qr', 'whatsapp', 'memorias', 'link'].includes(String(valor))
    ? String(valor)
    : 'link';
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Evento não informado.' }, { status: 400 });

  const acesso = await buscarEventoAcessivelPorId(eventoId);
  if (!acesso) return NextResponse.json({ erro: 'Convite indisponível.' }, { status: 404 });


  const admin = adminConviteria();
  const [{ data: cfg }, { data: resumo }] = await Promise.all([
    admin.from('evento_gravata_config')
      .select('status,nome_acao,texto_publico,valores_sugeridos_centavos,meta_centavos,mostrar_total,mostrar_valor_individual,permitir_anonimo,arrecadacao_aberta')
      .eq('evento_id', eventoId)
      .maybeSingle(),
    admin.rpc('resumo_hora_gravata_evento', { p_evento_id: eventoId }),
  ]);

  if (!cfg || cfg.status !== 'ativo') {
    return NextResponse.json({ ativo: false, aberto: false });
  }

  const totais = Array.isArray(resumo) ? resumo[0] : resumo;
  const totalCentavos = Number(totais?.bruto_centavos ?? 0);
  const participantes = Number(totais?.quantidade ?? 0);
  const mostrarTotal = cfg.mostrar_total !== false;

  return NextResponse.json({
    ativo: true,
    aberto: cfg.arrecadacao_aberta === true,
    nomeAcao: cfg.nome_acao || 'Hora da Gravata',
    textoPublico: cfg.texto_publico || '',
    valoresSugeridosCentavos: Array.isArray(cfg.valores_sugeridos_centavos)
      ? cfg.valores_sugeridos_centavos.map(Number)
      : [1000, 2000, 5000, 10000],
    metaCentavos: cfg.meta_centavos == null ? null : Number(cfg.meta_centavos),
    mostrarTotal,
    mostrarValorIndividual: cfg.mostrar_valor_individual === true,
    permitirAnonimo: cfg.permitir_anonimo === true,
    totalCentavos: mostrarTotal ? totalCentavos : null,
    participantes,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = String(body?.eventoId ?? '').trim();
  const valorCentavos = inteiroSeguro(body?.valorCentavos);
  const anonimo = body?.anonimo === true;
  const nome = String(body?.nome ?? '').trim().replace(/\s+/g, ' ').slice(0, 100);
  let origem = origemValida(body?.origem);
  const linkToken = String(body?.linkToken ?? '').trim();

  if (!eventoId || valorCentavos == null) {
    return NextResponse.json({ erro: 'Dados da contribuição inválidos.' }, { status: 400 });
  }

  if (
    valorCentavos < HORA_GRAVATA_MIN_CONTRIBUICAO_CENTAVOS ||
    valorCentavos > HORA_GRAVATA_MAX_CONTRIBUICAO_CENTAVOS
  ) {
    return NextResponse.json({ erro: 'O valor informado está fora do limite permitido.' }, { status: 400 });
  }

  const acesso = await buscarEventoAcessivelPorId(eventoId);
  if (!acesso) return NextResponse.json({ erro: 'Convite indisponível.' }, { status: 404 });

  let familiaId: string | null = null;
  let convidadoId: string | null = null;
  let nomeFinal = nome;
  if (linkToken) {
    const link = await resolverLinkGravataWhatsApp(linkToken);
    if (!link || link.eventoId !== eventoId) {
      return NextResponse.json({ erro: 'O link do WhatsApp é inválido ou não está mais disponível.' }, { status: 400 });
    }
    familiaId = link.familiaId;
    convidadoId = link.convidadoId;
    nomeFinal = link.nome;
    origem = 'whatsapp';
  }

  const admin = adminConviteria();
  const { data: cfg } = await admin.from('evento_gravata_config')
    .select('status,nome_acao,permitir_anonimo,arrecadacao_aberta')
    .eq('evento_id', eventoId)
    .maybeSingle();

  if (!cfg || cfg.status !== 'ativo') {
    return NextResponse.json({ erro: 'A Hora da Gravata não está ativa neste evento.' }, { status: 409 });
  }
  if (cfg.arrecadacao_aberta !== true) {
    return NextResponse.json({ erro: 'As contribuições estão encerradas neste momento.' }, { status: 409 });
  }
  if (anonimo && cfg.permitir_anonimo !== true) {
    return NextResponse.json({ erro: 'Este evento não aceita contribuição anônima.' }, { status: 400 });
  }
  if (!anonimo && nomeFinal.length < 2) {
    return NextResponse.json({ erro: 'Informe seu nome para continuar.' }, { status: 400 });
  }

  const ipHash = hashIp(ipDaRequisicao(req));
  const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await admin.from('evento_gravata_contribuicoes')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', desde);

  if ((count ?? 0) >= MAX_TENTATIVAS_10_MIN) {
    return NextResponse.json({ erro: 'Muitas tentativas de pagamento. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
  }

  const { taxa, liquido } = calcularTaxa(valorCentavos);
  const { data: contribuicao, error: erroInsert } = await admin.from('evento_gravata_contribuicoes')
    .insert({
      evento_id: eventoId,
      origem,
      familia_id: familiaId,
      convidado_lista_id: convidadoId,
      nome: anonimo ? null : nomeFinal,
      anonimo,
      valor_centavos: valorCentavos,
      taxa_centavos: taxa,
      liquido_centavos: liquido,
      ip_hash: ipHash,
      status: 'pendente',
    })
    .select('id')
    .single();

  if (erroInsert || !contribuicao) {
    console.error('[ConviteIA/gravata] Falha ao criar contribuição:', erroInsert);
    return NextResponse.json({ erro: 'Não foi possível preparar sua contribuição.' }, { status: 500 });
  }

  const evento = acesso.evento as any;
  const titulo = String(cfg.nome_acao || 'Hora da Gravata').slice(0, 80);
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-pix-assistente`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      origem: 'conviteria',
      referencia_id: contribuicao.id,
      valor_centavos: valorCentavos,
      descricao: `${titulo} · ${evento.slug}`,
      // Reusa a categoria financeira já suportada pelas Edge Functions.
      // O referencia_id aponta para evento_gravata_contribuicoes e o webhook
      // distingue a origem pela tabela, sem exigir novo deploy de Function.
      tipo: 'presente',
      purpose: 'conviteria_presente',
      brand: 'conviteia',
      ...(evento.mp_user_id ? { mp_user_id: evento.mp_user_id } : {}),
    }),
  });

  const pix = await r.json().catch(() => null) as any;
  if (!r.ok || !pix?.transaction_id || !(pix?.copia_e_cola || pix?.pix_code)) {
    await admin.from('evento_gravata_contribuicoes')
      .update({ status: 'expirado', updated_at: new Date().toISOString() })
      .eq('id', contribuicao.id)
      .eq('status', 'pendente');
    return NextResponse.json({ erro: pix?.message || pix?.error || 'Não foi possível gerar o PIX.' }, { status: 502 });
  }

  const { error: erroPix } = await admin.from('evento_gravata_contribuicoes')
    .update({
      pix_transaction_id: pix.transaction_id,
      txid: pix.txid ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contribuicao.id)
    .eq('status', 'pendente');

  if (erroPix) {
    console.error('[ConviteIA/gravata] Falha ao vincular PIX:', erroPix);
    return NextResponse.json({ erro: 'O PIX foi criado, mas não conseguimos finalizar o vínculo. Tente novamente.' }, { status: 500 });
  }

  return NextResponse.json({
    contribuicaoId: contribuicao.id,
    transactionId: pix.transaction_id,
    valorCentavos,
    taxaCentavos: taxa,
    liquidoCentavos: liquido,
    qrcode: pix.qrcode ?? pix.qr_code_url ?? null,
    copiaECola: pix.copia_e_cola ?? pix.pix_code,
    expiresAt: pix.expires_at ?? null,
  });
}
