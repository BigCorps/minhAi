import type { PresenteEscolhido } from './tipos';
import { acharTipo } from './tiposEvento';

export function gruposCatalogoDoTipo(tipoEventoId: string): string[] {
  const tipo = acharTipo(tipoEventoId);
  return Array.from(new Set([tipo.id, tipo.grupo].filter(Boolean)));
}

/** Máximo de presentes que o anfitrião pode manter em um convite. */
export const LIMITE_PRESENTES_CONVITE = 50;

/** Máximo de itens em um único PIX. A pessoa pode fazer outro pagamento depois. */
export const LIMITE_PRESENTES_POR_PIX = 12;

/** Faixa aceita para um presente de valor fixo ou valor livre. */
export const MIN_VALOR_PRESENTE_CENTAVOS = 500;
export const MAX_VALOR_PRESENTE_CENTAVOS = 2_000_000;

/** Proteção adicional do checkout inteiro. */
export const MAX_TOTAL_PRESENTES_PIX_CENTAVOS = 6_000_000;

export type FaixaCatalogo =
  | 'todos'
  | 'ate-100'
  | '100-250'
  | 'acima-250'
  | 'livre';

export function pertenceFaixa(
  valorCentavos: number,
  permiteValorLivre: boolean,
  faixa: FaixaCatalogo
) {
  if (faixa === 'todos') return true;
  if (faixa === 'livre') return permiteValorLivre || valorCentavos === 0;
  if (permiteValorLivre || valorCentavos === 0) return false;
  if (faixa === 'ate-100') return valorCentavos <= 10000;
  if (faixa === '100-250') return valorCentavos > 10000 && valorCentavos <= 25000;
  return valorCentavos > 25000;
}

/**
 * Normaliza a lista vinda do cliente antes de gravar no evento.
 *
 * O wizard já impede passar do limite, mas as rotas não confiam nisso:
 * alguém pode chamar a API diretamente ou um estado antigo pode conter
 * catalogoIds repetidos. O primeiro item de cada catalogoId vence e a lista
 * nunca passa de 50.
 *
 * Metadados do snapshot (tituloOriginal, imagemOriginalUrl etc.) são
 * preservados para o botão "Restaurar" continuar funcionando.
 */
export function normalizarPresentesEscolhidos(
  entrada: unknown
): PresenteEscolhido[] {
  if (!Array.isArray(entrada)) return [];

  const unicos = new Map<string, PresenteEscolhido>();

  for (const bruto of entrada) {
    if (!bruto || typeof bruto !== 'object') continue;

    const item = bruto as PresenteEscolhido;
    const catalogoId =
      typeof item.catalogoId === 'string'
        ? item.catalogoId.trim().slice(0, 160)
        : '';
    const titulo =
      typeof item.titulo === 'string'
        ? item.titulo.trim().slice(0, 90)
        : '';

    if (!catalogoId || !titulo || unicos.has(catalogoId)) continue;

    const permiteValorLivre = !!item.permiteValorLivre;
    const valor = Number(item.valorCentavos);

    if (
      !permiteValorLivre &&
      (
        !Number.isSafeInteger(valor) ||
        valor < MIN_VALOR_PRESENTE_CENTAVOS ||
        valor > MAX_VALOR_PRESENTE_CENTAVOS
      )
    ) {
      continue;
    }

    unicos.set(catalogoId, {
      ...item,
      catalogoId,
      titulo,
      valorCentavos: permiteValorLivre ? 0 : valor,
      permiteValorLivre,
      imagemUrl:
        typeof item.imagemUrl === 'string'
          ? item.imagemUrl.trim().slice(0, 2048)
          : item.imagemUrl ?? null,
    });

    if (unicos.size >= LIMITE_PRESENTES_CONVITE) break;
  }

  return [...unicos.values()];
}
