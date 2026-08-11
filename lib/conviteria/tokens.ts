import type { CSSProperties } from 'react';
import { acharFonte } from './fontes';
import { acharTema } from './temas';

/**
 * Converte tema + par tipografico em variaveis CSS.
 *
 * Vai como `style` inline na raiz do convite, de proposito: o cartao e
 * renderizado tanto na pagina publica quanto dentro do dashboard, que tem CSS
 * proprio. Variavel em `:root` perderia ou venceria dependendo da ordem de
 * injecao — foi exatamente esse empate que quebrou o monograma do lacre no
 * convite do casamento.
 */
export function tokensDoConvite(temaId: string, fonteId: string): CSSProperties {
  const t = acharTema(temaId);
  const f = acharFonte(fonteId);

  return {
    '--cv-fora': t.fora,
    '--cv-papel': t.papel,
    '--cv-acento': t.acento,
    '--cv-acento-texto': t.acentoTexto,
    '--cv-tinta': t.tinta,
    '--cv-tinta-suave': t.tintaSuave,
    '--cv-bloco': t.bloco,
    '--cv-bloco-texto': t.blocoTexto,

    '--cv-petala-clara': t.floral.petalaClara,
    '--cv-petala-media': t.floral.petalaMedia,
    '--cv-petala-escura': t.floral.petalaEscura,
    '--cv-folha': t.floral.folha,
    '--cv-caule': t.floral.caule,

    '--cv-display': f.display,
    '--cv-corpo': f.corpo,
    '--cv-display-peso': String(f.pesoDisplay),
    '--cv-display-escala': String(f.escalaDisplay),
  } as CSSProperties;
}

/** Famílias do Google Fonts que a pagina precisa carregar para este par. */
export function familiasGoogle(fonteId: string): string[] {
  const f = acharFonte(fonteId);
  const limpa = (v: string) => v.split(',')[0].replace(/'/g, '').trim();
  return Array.from(new Set([limpa(f.display), limpa(f.corpo)]));
}
