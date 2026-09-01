import {
  ORNAMENTOS_ASSETS,
  type OrnamentoCatalogoId,
} from './ornamentos';

export const ORNAMENTOS = ORNAMENTOS_ASSETS.map(
  ({ id, nome }) => ({ id, nome })
);

export const ENVELOPES = [
  { id: 'classico', nome: 'Clássico' },
  { id: 'arco', nome: 'Arco' },
  { id: 'diamante', nome: 'Diamante' },
  { id: 'reto', nome: 'Reto' },
  { id: 'onda', nome: 'Onda' },
  { id: 'organico', nome: 'Orgânico' },
] as const;

export type OrnamentoId = OrnamentoCatalogoId;
export type EnvelopeId = (typeof ENVELOPES)[number]['id'];

export const ORNAMENTO_PADRAO: OrnamentoId = 'casamento-original';
export const ENVELOPE_PADRAO: EnvelopeId = 'classico';
