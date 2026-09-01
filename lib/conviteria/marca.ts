// ---------------------------------------------------------------------------
// Identidade da marca em um lugar so.
//
// O dominio ja estava repetido em tres arquivos antes de virar isto aqui.
// Repeticao foi exatamente o que quebrou o monograma do lacre: tamanho num
// arquivo, deslocamento em outro, e bastou um ficar para tras.
// Trocar de dominio de novo e uma linha.
// ---------------------------------------------------------------------------

/** Como o nome aparece em texto, com espaco. */
export const MARCA = 'Convite IA';

/** Sem espaco: usado em dominio, e-mail e identificadores. */
export const MARCA_COMPACTA = 'ConviteIA';

export const SLOGAN = 'Crie seu convite com IA!';

/** Dominio base. Os convites vivem em <slug>.conviteia.com */
export const DOMINIO = 'conviteia.com';

/** Sufixo exibido no wizard, ao lado do campo de slug. */
export const SUFIXO_SLUG = `.${DOMINIO}`;

export function urlDoConvite(slug: string) {
  return `https://${slug}.${DOMINIO}`;
}
