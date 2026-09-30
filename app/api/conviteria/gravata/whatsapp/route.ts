import { NextResponse, type NextRequest } from 'next/server';
import { exigirEventoDoUsuario, texto } from '@/lib/conviteria/gestao-servidor';
import { resumoDisparoGravata, tipoParaAtividade } from '@/lib/conviteria/gravata-whatsapp-servidor';

export const runtime = 'nodejs';

function diaEventoSaoPaulo(dataEvento: string | null | undefined) {
  if (!dataEvento) return null;
  const d = new Date(dataEvento);
  if (Number.isNaN(d.getTime())) return null;
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value;
  const ano = valor('year'); const mes = valor('month'); const dia = valor('day');
  return ano && mes && dia ? `${ano}-${mes}-${dia}` : null;
}

function programacaoNoDia(dataEvento: string | null | undefined, hora: string) {
  const dia = diaEventoSaoPaulo(dataEvento);
  if (!dia || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(hora)) return null;
  const iso = `${dia}T${hora}:00-03:00`;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const acesso = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in acesso) return NextResponse.json({ erro: acesso.erro }, { status: acesso.status });

  const [{ data: gravata }, { data: whatsapp }, { data: eventoTipo }, resumo] = await Promise.all([
    acesso.admin.from('evento_gravata_config').select('*').eq('evento_id', eventoId).maybeSingle(),
    acesso.admin.from('evento_whatsapp_config').select('status').eq('evento_id', eventoId).maybeSingle(),
    acesso.admin.from('eventos').select('tipo_evento_id').eq('id', eventoId).maybeSingle(),
    resumoDisparoGravata(eventoId),
  ]);

  return NextResponse.json({
    gravataAtiva: gravata?.status === 'ativo',
    whatsappAtivo: whatsapp?.status === 'ativo',
    template: gravata?.whatsapp_template_nome ?? 'conviteia_atividade_evento',
    programadoEm: gravata?.whatsapp_programado_em ?? null,
    disparadoEm: gravata?.whatsapp_disparo_em ?? null,
    erro: gravata?.whatsapp_erro ?? null,
    nomeAcao: gravata?.nome_acao ?? 'Hora da Gravata',
    evento: {
      dataEvento: acesso.evento.data_evento ?? null,
      anfitrioes: String((acesso.evento.config as any)?.anfitrioes?.exibicao ?? 'Anfitriões'),
      tipo: tipoParaAtividade(String(eventoTipo?.tipo_evento_id ?? '')),
    },
    resumo,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  const hora = texto(body?.hora, 5);
  if (!eventoId || !hora) return NextResponse.json({ erro: 'Informe o evento e o horário.' }, { status: 400 });

  const acesso = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in acesso) return NextResponse.json({ erro: acesso.erro }, { status: acesso.status });

  const [{ data: gravata }, { data: whatsapp }] = await Promise.all([
    acesso.admin.from('evento_gravata_config').select('*').eq('evento_id', eventoId).maybeSingle(),
    acesso.admin.from('evento_whatsapp_config').select('status').eq('evento_id', eventoId).maybeSingle(),
  ]);

  if (gravata?.status !== 'ativo') return NextResponse.json({ erro: 'Ative a Hora da Gravata primeiro.' }, { status: 403 });
  if (whatsapp?.status !== 'ativo') return NextResponse.json({ erro: 'Ative o WhatsApp do Evento para agendar este aviso.' }, { status: 403 });
  if (gravata.whatsapp_disparo_em) return NextResponse.json({ erro: 'O aviso da Hora da Gravata já foi enviado neste evento.' }, { status: 409 });

  const programadoEm = programacaoNoDia(acesso.evento.data_evento as string | null, hora);
  if (!programadoEm) return NextResponse.json({ erro: 'O evento precisa ter uma data válida e o horário deve estar entre 00:00 e 23:59.' }, { status: 400 });
  if (new Date(programadoEm).getTime() <= Date.now()) {
    return NextResponse.json({ erro: 'Escolha um horário futuro no dia do evento.' }, { status: 400 });
  }

  const { error } = await acesso.admin.from('evento_gravata_config').update({
    whatsapp_programado_em: programadoEm,
    whatsapp_erro: null,
    updated_at: new Date().toISOString(),
  }).eq('evento_id', eventoId).eq('status', 'ativo');
  if (error) return NextResponse.json({ erro: 'Não foi possível salvar o horário.' }, { status: 500 });

  return NextResponse.json({ ok: true, programadoEm });
}

export async function DELETE(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const acesso = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in acesso) return NextResponse.json({ erro: acesso.erro }, { status: acesso.status });

  const { data: gravata } = await acesso.admin.from('evento_gravata_config')
    .select('whatsapp_disparo_em')
    .eq('evento_id', eventoId)
    .maybeSingle();
  if (gravata?.whatsapp_disparo_em) return NextResponse.json({ erro: 'O aviso já foi enviado e não pode ser cancelado.' }, { status: 409 });

  await acesso.admin.from('evento_gravata_config').update({
    whatsapp_programado_em: null,
    whatsapp_erro: null,
    updated_at: new Date().toISOString(),
  }).eq('evento_id', eventoId);
  await acesso.admin.from('evento_gravata_whatsapp_envios').update({
    status: 'cancelado',
    updated_at: new Date().toISOString(),
  }).eq('evento_id', eventoId).in('status', ['pendente', 'falhou']);

  return NextResponse.json({ ok: true });
}
