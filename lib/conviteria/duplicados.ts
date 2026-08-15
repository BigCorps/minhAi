// lib/conviteria/duplicados.ts
//
// Deteccao de presentes parecidos.
//
// Motivo concreto: num convite real, a pessoa queria trocar texto E foto de
// dois itens do catalogo. Em vez de editar, criou itens novos — e esqueceu de
// remover os antigos. O convite foi publicado com "Curso avancado de fechar a
// tampa da pasta" (do catalogo, foto padrao) e "Curso avancado de baixar a
// tampa" (dela, com foto), lado a lado.

import type { PresenteEscolhido } from './tipos';

/** Palavras curtas e conectivos nao ajudam a distinguir titulo de presente. */
const VAZIAS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na',
  'nos', 'nas', 'um', 'uma', 'para', 'pra', 'pro', 'por', 'com', 'sem', 'que',
  'ao', 'aos', 'se', 'ou', 'the',
]);

function palavras(texto: string): Set<string> {
  return new Set(
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((p) => p.length > 1 && !VAZIAS.has(p))
  );
}

/**
 * Semelhanca entre dois titulos, de 0 a 1.
 *
 * Jaccard sobre as palavras, e nao distancia de edicao: o caso real e a
 * pessoa reescrever parte da frase, nao errar letras. "fechar a tampa da
 * pasta" e "baixar a tampa" mudam varias letras mas mantem o miolo.
 */
export function semelhanca(a: string, b: string): number {
  const pa = palavras(a);
  const pb = palavras(b);
  if (pa.size === 0 || pb.size === 0) return 0;

  let comuns = 0;
  for (const p of pa) if (pb.has(p)) comuns++;

  return comuns / (pa.size + pb.size - comuns);
}

/**
 * Acima disto os titulos sao considerados parecidos.
 *
 * So a semelhanca NAO basta, e a calibracao com o catalogo real mostrou por
 * que: "Patrocine a despedida do noivo" e "...da noiva" dao 0,50, e "Cota da
 * lua de mel: passagem" e "...: hotel" dao 0,60. Sao pares legitimos, os dois
 * itens existem de proposito. Avisar neles treinaria a pessoa a ignorar o
 * aviso.
 *
 * Por isso o alerta exige um SEGUNDO sinal — ver `ehProvavelDuplicata`.
 */
export const LIMIAR = 0.45;

/**
 * Dois itens parecidos sao provavel duplicata quando UM veio do catalogo e o
 * outro foi criado ou editado pela pessoa.
 *
 * E exatamente a forma que o erro real tomou: ela quis mudar texto e foto,
 * criou um item novo e esqueceu de tirar o do catalogo. Ficaram os dois — um
 * com foto padrao, outro com a dela.
 *
 * Pares em que os DOIS sao do catalogo (despedida do noivo / da noiva) ou os
 * DOIS sao dela sao intencionais, e nao disparam aviso.
 */
function origemDiferente(a: PresenteEscolhido, b: PresenteEscolhido) {
  const proprio = (p: PresenteEscolhido) =>
    !!p.personalizado || !usaFotoDoCatalogo(p);
  return proprio(a) !== proprio(b);
}

export function ehProvavelDuplicata(a: PresenteEscolhido, b: PresenteEscolhido) {
  return semelhanca(a.titulo, b.titulo) >= LIMIAR && origemDiferente(a, b);
}

/** Itens ja escolhidos parecidos com o que a pessoa esta digitando. */
export function parecidos(
  titulo: string,
  escolhidos: PresenteEscolhido[],
  ignorarId?: string
): PresenteEscolhido[] {
  // Aqui o item ainda nao existe, entao nao da para comparar a origem: quem
  // esta digitando um titulo novo esta, por definicao, criando algo proprio.
  // Basta o outro lado ser do catalogo.
  return escolhidos
    .filter((p) => p.catalogoId !== ignorarId && usaFotoDoCatalogo(p))
    .map((p) => ({ p, s: semelhanca(titulo, p.titulo) }))
    .filter((x) => x.s >= LIMIAR)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}

/** Pares suspeitos dentro da lista. Usado na Revisao, antes de publicar. */
export function paresParecidos(
  escolhidos: PresenteEscolhido[]
): Array<[PresenteEscolhido, PresenteEscolhido]> {
  const pares: Array<[PresenteEscolhido, PresenteEscolhido]> = [];
  for (let i = 0; i < escolhidos.length; i++) {
    for (let j = i + 1; j < escolhidos.length; j++) {
      if (ehProvavelDuplicata(escolhidos[i], escolhidos[j])) {
        pares.push([escolhidos[i], escolhidos[j]]);
      }
    }
  }
  return pares;
}

/**
 * True quando o item ainda usa a imagem que veio do catalogo.
 *
 * Upload do usuario vai para o bucket `conviteria-presentes` com nome
 * `presente-<timestamp>.<ext>`; o catalogo usa o id do item como nome do
 * arquivo. Se a maioria da lista ja tem foto propria, quem ficou com a padrao
 * costuma ser esquecimento.
 */
export function usaFotoDoCatalogo(p: PresenteEscolhido): boolean {
  if (!p.imagemUrl) return false;
  return !/\/presente-\d+\.\w+$/.test(p.imagemUrl);
}
