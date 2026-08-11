// opentype.js e CommonJS puro e le arquivo do disco. Precisa estar em
// `serverExternalPackages` no next.config.mjs: sem isso o webpack tenta
// empacotar, avisa que nao ha default export e o `fs` some no bundle.
import opentype from 'opentype.js';
import type * as OpenType from 'opentype.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Converte o monograma em contorno vetorial, centralizado pela TINTA.
 *
 * Historia: no convite do casamento o monograma saia torto porque
 * `text-anchor="middle"` centraliza pela largura de avanco, e o "M" do Pinyon
 * Script tem entrada fina a esquerda enquanto o "I" tem floreio pesado a
 * direita. Na epoca eu medi o desvio a mao (-1,91 / +3,79) e cravei constantes
 * — que so valiam para "MI".
 *
 * Aqui o bounding box da tinta e calculado, entao qualquer par de iniciais
 * sai centralizado. E o resultado e um `<path>`, nao `<text>`: o convite
 * publicado nao depende da fonte carregar no navegador de quem abre.
 */

const CAIXA = 100;      // viewBox do lacre
const LARGURA_ALVO = 62; // diametro util dentro do anel interno
const ALTURA_ALVO = 34;

let fonteCache: OpenType.Font | null = null;

function carregarFonte(): OpenType.Font {
  if (fonteCache) return fonteCache;
  // Arquivo versionado no repo. Nao baixe em runtime: se o Google Fonts cair,
  // a publicacao para.
  const arquivo = path.join(process.cwd(), 'public', 'fontes', 'PinyonScript-Regular.ttf');
  const buffer = readFileSync(arquivo);
  fonteCache = opentype.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  );
  return fonteCache;
}

export interface Monograma {
  /** `d` de um <path>, ja centralizado no viewBox 0 0 100 100. */
  d: string;
  iniciais: string;
}

export function gerarMonograma(entrada: string): Monograma {
  const iniciais = entrada
    .replace(/[^A-Za-zÀ-ÿ]/g, '')
    .slice(0, 3)
    .toUpperCase();

  if (!iniciais) return { d: '', iniciais: '' };

  const fonte = carregarFonte();
  const bruto = fonte.getPath(iniciais, 0, 0, 100);
  const bb = bruto.getBoundingBox();

  const largura = bb.x2 - bb.x1;
  const altura = bb.y2 - bb.y1;
  if (largura <= 0 || altura <= 0) return { d: '', iniciais };

  // Cabe pelos dois eixos: com 3 letras a largura manda, com 1 a altura manda.
  const escala = Math.min(LARGURA_ALVO / largura, ALTURA_ALVO / altura);

  // Reposiciona pelo centro da tinta, nao pela origem da baseline.
  const cx = (bb.x1 + bb.x2) / 2;
  const cy = (bb.y1 + bb.y2) / 2;
  const dx = CAIXA / 2 - cx * escala;
  const dy = CAIXA / 2 - cy * escala;

  const p = fonte.getPath(iniciais, dx, dy, 100 * escala);
  return { d: p.toPathData(2), iniciais };
}
