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
 * pessoa reescrever parte da frase, nao errar letras.
 */
export function semelhanca(a: string, b: string): number {
  const pa = palavras(a);
  const pb = palavras(b);
  if (pa.size === 0 || pb.size === 0) return 0;

  let comuns = 0;
  for (const p of pa) if (pb.has(p)) comuns++;

  return comuns / (pa.size + pb.size - comuns);
}

export const LIMIAR = 0.45;

function origemDiferente(a: PresenteEscolhido, b: PresenteEscolhido) {
  const proprio = (p: PresenteEscolhido) =>
    !!p.personalizado || !usaFotoDoCatalogo(p);
  return proprio(a) !== proprio(b);
}

export function ehProvavelDuplicata(a: PresenteEscolhido, b: PresenteEscolhido) {
  return semelhanca(a.titulo, b.titulo) >= LIMIAR && origemDiferente(a, b);
}

/** Itens ja escolhidos parecidos com o que esta sendo digitado. */
export function parecidos(
  titulo: string,
  escolhidos: PresenteEscolhido[],
  ignorarId?: string
): PresenteEscolhido[] {
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
 * True quando o item ainda usa a imagem que veio do catálogo.
 *
 * Não usamos mais o formato da URL para decidir isso. O catálogo agora pode
 * apontar tanto para o bucket padrão quanto para fotos reais reaproveitadas
 * pelo ConviteIA, e algumas dessas URLs também terminam em
 * `presente-<timestamp>.jpg`.
 *
 * A origem confiável já está no próprio snapshot:
 * - `personalizado=true` => item criado pelo anfitrião;
 * - `imagemOriginalUrl` presente => item de catálogo cuja imagem foi editada;
 * - sem esses sinais => imagem atual é a imagem do catálogo.
 */
export function usaFotoDoCatalogo(p: PresenteEscolhido): boolean {
  if (p.personalizado) return false;

  if (p.imagemOriginalUrl !== undefined) {
    return (p.imagemUrl ?? null) === (p.imagemOriginalUrl ?? null);
  }

  return true;
}
