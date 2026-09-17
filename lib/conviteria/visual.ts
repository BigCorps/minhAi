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
export const ETIQUETAS = [
  { id: 'caixa',  nome: 'Caixinha',     dica: 'Retângulo abaixo do lacre.' },
  { id: 'curva',  nome: 'Curvada',      dica: 'Acompanha a borda do lacre.' },
  { id: 'nenhuma', nome: 'Sem etiqueta', dica: 'Só o lacre convida ao toque.' },
] as const;

export type EtiquetaId = (typeof ETIQUETAS)[number]['id'];
export const ETIQUETA_PADRAO: EtiquetaId = 'caixa';

export type EnvelopeId = (typeof ENVELOPES)[number]['id'];

export const ORNAMENTO_PADRAO: OrnamentoId = 'casamento-original';
export const ENVELOPE_PADRAO: EnvelopeId = 'classico';
