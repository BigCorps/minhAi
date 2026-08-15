import type { ConviteConfig } from './tipos';
import { urlDoConvite } from './marca';

function dataGoogle(data: Date) {
  return data
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function localDoConvite(cfg: ConviteConfig) {
  return [
    cfg.local?.nome,
    cfg.local?.logradouro,
    cfg.local?.bairro,
    cfg.local?.cidade,
    cfg.local?.cep,
  ]
    .map((x) => x?.trim())
    .filter(Boolean)
    .join(', ');
}

export function urlGoogleAgenda(
  cfg: ConviteConfig,
  slug: string
) {
  const inicio = new Date(cfg.evento.dataIso);

  if (Number.isNaN(inicio.getTime())) {
    return null;
  }

  // O contrato atual do convite guarda início, mas não duração.
  // Quatro horas é apenas a janela exibida no item criado pelo convidado;
  // ele pode ajustá-la livremente no Google Agenda.
  const fim = new Date(
    inicio.getTime() + 4 * 60 * 60 * 1000
  );

  const conviteUrl = urlDoConvite(slug);
  const titulo =
    cfg.anfitrioes.exibicao?.trim() ||
    'Evento';

  const detalhes = [
    'Presença confirmada pela ConviteIA.',
    '',
    `Convite: ${conviteUrl}`,
  ].join('\n');

  const url = new URL(
    'https://calendar.google.com/calendar/render'
  );

  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', titulo);
  url.searchParams.set(
    'dates',
    `${dataGoogle(inicio)}/${dataGoogle(fim)}`
  );
  url.searchParams.set('details', detalhes);
  url.searchParams.set(
    'ctz',
    'America/Sao_Paulo'
  );

  const local = localDoConvite(cfg);

  if (local) {
    url.searchParams.set('location', local);
  }

  return url.toString();
}
