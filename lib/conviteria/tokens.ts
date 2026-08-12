import type { CSSProperties } from 'react';
import { acharFonte, FONTES } from './fontes';
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

// ---------------------------------------------------------------------------
// Carregamento de fontes do Google
// ---------------------------------------------------------------------------
//
// A API css2 recusa o request INTEIRO com 400 quando qualquer familia da lista
// recebe um peso que ela nao possui. Nao e uma falha por familia: a resposta
// toda vira erro e a pagina cai para a fonte do sistema, sem aviso nenhum.
//
// Por isso duas listas:
//   PESO_UNICO — familias que so existem em 400. Vao na URL sem `wght`.
//   PESOS      — 400..700, a faixa que TODAS as demais familias do catalogo
//                cobrem. Note que 300 ficou de fora de proposito: Lora comeca
//                em 400 e Playfair Display tambem.
//
// Se acrescentar familia nova em FONTES, confira a faixa de pesos dela no
// Google Fonts antes; e a unica manutencao que este bloco pede.

const PESO_UNICO = new Set([
  'Pinyon Script',
  'Great Vibes',
  'Parisienne',
  'Italianno',
  'Sacramento',
  'Archivo Black',
]);

const PESOS = '400;500;600;700';

/** Famílias únicas de todos os pares de um grupo de evento. */
export function familiasDoGrupo(grupo: string): string[] {
  const limpa = (v: string) => v.split(',')[0].replace(/'/g, '').trim();
  const fam = new Set<string>();
  for (const f of FONTES) {
    if (!f.grupos.includes(grupo)) continue;
    fam.add(limpa(f.display));
    fam.add(limpa(f.corpo));
  }
  return Array.from(fam).sort();
}

/** URL do css2 para uma lista de famílias, com os pesos que cada uma aceita. */
export function urlGoogleFonts(familias: string[]): string {
  const partes = familias.map((f) => {
    const nome = f.replace(/ /g, '+');
    return PESO_UNICO.has(f) ? `family=${nome}` : `family=${nome}:wght@${PESOS}`;
  });
  return `https://fonts.googleapis.com/css2?${partes.join('&')}&display=swap`;
}
