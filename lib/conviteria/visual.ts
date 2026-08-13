export const ORNAMENTOS = [
  { id: 'floral', nome: 'Floral' },
  { id: 'classico', nome: 'Clássico' },
  { id: 'geometrico', nome: 'Geométrico' },
  { id: 'minimal', nome: 'Minimalista' },
  { id: 'festivo', nome: 'Festivo' },
  { id: 'rustico', nome: 'Rústico' },
] as const;

export const ENVELOPES = [
  { id: 'classico', nome: 'Clássico' },
  { id: 'arco', nome: 'Arco' },
  { id: 'diamante', nome: 'Diamante' },
  { id: 'reto', nome: 'Reto' },
  { id: 'onda', nome: 'Onda' },
  { id: 'organico', nome: 'Orgânico' },
] as const;

export type OrnamentoId = (typeof ORNAMENTOS)[number]['id'];
export type EnvelopeId = (typeof ENVELOPES)[number]['id'];

export const ORNAMENTO_PADRAO: OrnamentoId = 'floral';
export const ENVELOPE_PADRAO: EnvelopeId = 'classico';
