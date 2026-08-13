import { acharTipo } from './tiposEvento';

export function gruposCatalogoDoTipo(tipoEventoId: string): string[] {
  const tipo = acharTipo(tipoEventoId);
  return Array.from(new Set([tipo.id, tipo.grupo].filter(Boolean)));
}

export const LIMITE_PRESENTES_CONVITE = 24;
export type FaixaCatalogo = 'todos' | 'ate-100' | '100-250' | 'acima-250' | 'livre';

export function pertenceFaixa(valorCentavos: number, permiteValorLivre: boolean, faixa: FaixaCatalogo) {
  if (faixa === 'todos') return true;
  if (faixa === 'livre') return permiteValorLivre || valorCentavos === 0;
  if (permiteValorLivre || valorCentavos === 0) return false;
  if (faixa === 'ate-100') return valorCentavos <= 10000;
  if (faixa === '100-250') return valorCentavos > 10000 && valorCentavos <= 25000;
  return valorCentavos > 25000;
}
