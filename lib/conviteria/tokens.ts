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

// As famílias do lacre (FAMILIAS_LACRE, em components/conviteria/LacreArte)
// são: Pinyon Script, Great Vibes, Cormorant Garamond, Playfair Display, Jost
// e Archivo. As duas primeiras já estão acima; as outras quatro têm a faixa
// 400..700 e entram no caminho normal. Se acrescentar fonte de lacre nova,
// confira a faixa de pesos dela antes — peso inexistente derruba o request
// INTEIRO com 400 e a página cai para a fonte do sistema, sem aviso.

const PESOS = '400;500;600;700';

/**
 * Famílias que a PÁGINA PUBLICADA precisa carregar: as do par tipográfico
 * mais a do carimbo do lacre.
 *
 * A do lacre é escolhida à parte, em `lacreAjuste.fonte`, e ficava de fora —
 * era esse o bug do carimbo mudando de navegador para navegador. Sem a fonte
 * baixada, a pilha `'Pinyon Script', cursive` caía no `cursive`, que cada
 * sistema resolve para uma fonte diferente.
 *
 * O wizard nunca teve o problema porque carrega FAMILIAS_LACRE inteiro — por
 * isso a prévia sempre esteve certa e só o convite publicado variava.
 *
 * Recebe a família já resolvida (não o id) para este módulo não importar de
 * `components/`, o que criaria dependência de lib para componente.
 */
export function familiasDaPagina(fonteId: string, familiaLacre?: string): string[] {
  const fam = new Set(familiasGoogle(fonteId));
  if (familiaLacre) {
    // Chega como "'Pinyon Script', cursive" — a API css2 quer só o nome.
    const nome = familiaLacre.split(',')[0].replace(/'/g, '').trim();
    if (nome) fam.add(nome);
  }
  return Array.from(fam);
}

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
