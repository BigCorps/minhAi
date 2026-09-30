export const HORA_GRAVATA_PRECO_CENTAVOS = 1990;

export const HORA_GRAVATA_MIN_CONTRIBUICAO_CENTAVOS = 100;
export const HORA_GRAVATA_MAX_CONTRIBUICAO_CENTAVOS = 1_000_000;

export const HORA_GRAVATA_NOME_PADRAO = 'Hora da Gravata';

export const HORA_GRAVATA_NOMES_SUGERIDOS = [
  'Hora da Gravata',
  'Sapato',
  'PIX',
  'Contribuição',
  'Presente',
] as const;

export const HORA_GRAVATA_VALORES_PADRAO_CENTAVOS = [
  1000,
  2000,
  5000,
  10000,
] as const;

export const HORA_GRAVATA_TEMPLATE_WHATSAPP = 'conviteia_atividade_evento';

export type HoraGravataStatus =
  | 'nao_contratado'
  | 'aguardando_pagamento'
  | 'ativo';

export type HoraGravataOrigemContribuicao =
  | 'qr'
  | 'whatsapp'
  | 'memorias'
  | 'link';

export type HoraGravataStatusContribuicao =
  | 'pendente'
  | 'pago'
  | 'expirado'
  | 'estornado';

export function horaGravataEstaAtiva(status: string | null | undefined) {
  return status === 'ativo';
}
