import { NextResponse, type NextRequest } from 'next/server';
import { exigirEventoDoUsuario, texto } from '@/lib/conviteria/gestao-servidor';
import {
  HORA_GRAVATA_MAX_CONTRIBUICAO_CENTAVOS,
  HORA_GRAVATA_MIN_CONTRIBUICAO_CENTAVOS,
  HORA_GRAVATA_NOME_PADRAO,
  HORA_GRAVATA_NOMES_SUGERIDOS,
  HORA_GRAVATA_PRECO_CENTAVOS,
  HORA_GRAVATA_VALORES_PADRAO_CENTAVOS,
} from '@/lib/conviteria/gravata-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function inteiroSeguro(valor: unknown) {
  const n = Number(valor);
  return Number.isSafeInteger(n) ? n : null;
}

function valoresSugeridos(valor: unknown) {
  if (!Array.isArray(valor)) return [...HORA_GRAVATA_VALORES_PADRAO_CENTAVOS];
  const lista = valor
    .slice(0, 6)
    .map(inteiroSeguro)
    .filter((n): n is number => n != null && n >= HORA_GRAVATA_MIN_CONTRIBUICAO_CENTAVOS && n <= HORA_GRAVATA_MAX_CONTRIBUICAO_CENTAVOS);
  return lista.length ? Array.from(new Set(lista)).slice(0, 6) : [...HORA_GRAVATA_VALORES_PADRAO_CENTAVOS];
}

function respostaPadrao(eventoId: string, dataEvento: string | null | undefined, whatsappAtivo: boolean) {
  return {
    config: {
      eventoId,
      status: 'nao_contratado',
      precoCentavos: HORA_GRAVATA_PRECO_CENTAVOS,
      nomeAcao: HORA_GRAVATA_NOME_PADRAO,
      textoPublico: '',
      valoresSugeridosCentavos: [...HORA_GRAVATA_VALORES_PADRAO_CENTAVOS],
      metaCentavos: null,
      mostrarTotal: true,
      mostrarValorIndividual: false,
      permitirAnonimo: false,
      arrecadacaoAberta: false,
      abertaEm: null,
      encerradaEm: null,
      compradoEm: null,
    },
    evento: { dataEvento: dataEvento ?? null },
    whatsapp: { ativo: whatsappAtivo },
    nomesSugeridos: HORA_GRAVATA_NOMES_SUGERIDOS,
  };
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });

  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const [{ data: cfg }, { data: whatsapp }] = await Promise.all([
    r.admin.from('evento_gravata_config').select('*').eq('evento_id', eventoId).maybeSingle(),
    r.admin.from('evento_whatsapp_config').select('status').eq('evento_id', eventoId).maybeSingle(),
  ]);

  const whatsappAtivo = whatsapp?.status === 'ativo';
  if (!cfg) return NextResponse.json(respostaPadrao(eventoId, r.evento.data_evento as string | null, whatsappAtivo));

  return NextResponse.json({
    config: {
      eventoId,
      status: cfg.status,
      precoCentavos: Number(cfg.preco_centavos ?? HORA_GRAVATA_PRECO_CENTAVOS),
      nomeAcao: cfg.nome_acao || HORA_GRAVATA_NOME_PADRAO,
      textoPublico: cfg.texto_publico || '',
      valoresSugeridosCentavos: Array.isArray(cfg.valores_sugeridos_centavos)
        ? cfg.valores_sugeridos_centavos.map(Number)
        : [...HORA_GRAVATA_VALORES_PADRAO_CENTAVOS],
      metaCentavos: cfg.meta_centavos == null ? null : Number(cfg.meta_centavos),
      mostrarTotal: cfg.mostrar_total !== false,
      mostrarValorIndividual: cfg.mostrar_valor_individual === true,
      permitirAnonimo: cfg.permitir_anonimo === true,
      arrecadacaoAberta: cfg.arrecadacao_aberta === true,
      abertaEm: cfg.aberta_em ?? null,
      encerradaEm: cfg.encerrada_em ?? null,
      compradoEm: cfg.comprado_em ?? null,
    },
    evento: { dataEvento: r.evento.data_evento ?? null },
    whatsapp: { ativo: whatsappAtivo },
    nomesSugeridos: HORA_GRAVATA_NOMES_SUGERIDOS,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });

  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const { data: atual } = await r.admin
    .from('evento_gravata_config')
    .select('*')
    .eq('evento_id', eventoId)
    .maybeSingle();

  if (!atual || atual.status !== 'ativo') {
    return NextResponse.json({ erro: 'Ative a Hora da Gravata antes de configurar o recurso.' }, { status: 409 });
  }

  const nomeAcao = texto(body?.nomeAcao, 80);
  if (!nomeAcao) return NextResponse.json({ erro: 'Informe o nome da atividade.' }, { status: 400 });
  const textoPublico = texto(body?.textoPublico, 500) || null;
  const valores = valoresSugeridos(body?.valoresSugeridosCentavos);

  const metaRaw = body?.metaCentavos;
  const meta = metaRaw == null || metaRaw === '' ? null : inteiroSeguro(metaRaw);
  if (meta != null && (meta <= 0 || meta > 100_000_000)) {
    return NextResponse.json({ erro: 'A meta informada é inválida.' }, { status: 400 });
  }

  const querAberta = body?.arrecadacaoAberta === true;
  const agora = new Date().toISOString();
  const patch: Record<string, unknown> = {
    nome_acao: nomeAcao,
    texto_publico: textoPublico,
    valores_sugeridos_centavos: valores,
    meta_centavos: meta,
    mostrar_total: body?.mostrarTotal !== false,
    mostrar_valor_individual: body?.mostrarValorIndividual === true,
    permitir_anonimo: body?.permitirAnonimo === true,
    arrecadacao_aberta: querAberta,
    updated_at: agora,
  };

  if (querAberta && atual.arrecadacao_aberta !== true) {
    patch.aberta_em = agora;
    patch.encerrada_em = null;
  } else if (!querAberta && atual.arrecadacao_aberta === true) {
    patch.encerrada_em = agora;
  }


  const { error } = await r.admin
    .from('evento_gravata_config')
    .update(patch)
    .eq('evento_id', eventoId)
    .eq('status', 'ativo');

  if (error) {
    console.error('[ConviteIA/gravata] Falha ao salvar configuração:', error);
    return NextResponse.json({ erro: 'Não foi possível salvar a Hora da Gravata.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
