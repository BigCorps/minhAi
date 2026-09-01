#!/usr/bin/env node
/**
 * Gera os frames de piscada (half.png e closed.png) a partir da base.
 *
 *   node scripts/build-blink-frames.mjs
 *
 * Lê as bases em public/funcionaria/avatar-packs/raw/<option>/base.png e os
 * eyesRect de lib/funcionaria-avatar-options.ts, e escreve os recortes em
 * public/funcionaria/avatar-packs/processed-v3/<option>/eyes/.
 *
 * Por que sintetizar em vez de gerar por IA: os frames de piscada gerados por
 * inpainting erravam o alvo — mascaravam a faixa da sobrancelha em vez da
 * pálpebra, apagando a sobrancelha sem fechar o olho. Como a piscada é só pele
 * descendo sobre a abertura, dá para construí-la a partir da própria base, e
 * assim a borda do recorte fica idêntica por construção: nenhuma emenda.
 *
 * A pele da pálpebra vem de BAIXO do olho, espelhada. É contraintuitivo, mas
 * entre a sobrancelha e o olho quase não há pálpebra visível nestas poses;
 * puxar de cima arrasta a sobrancelha para dentro do olho, que é exatamente o
 * defeito que este script existe para evitar. A região infraorbital tem o mesmo
 * tom e é lisa, então serve de pálpebra sem emenda.
 */

import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve('public/funcionaria/avatar-packs');

/** Precisa espelhar o eyesRect de lib/funcionaria-avatar-options.ts. */
const OPTIONS = [
  { id: 'option-1', eyesRect: { left: 491, top: 319, width: 449, height: 113 } },
  { id: 'option-2', eyesRect: { left: 516, top: 293, width: 394, height: 91 } },
  { id: 'option-3', eyesRect: { left: 488, top: 358, width: 503, height: 129 } },
];

const LID_SOURCE_GAP = 6;  // px abaixo da abertura onde a pele da pálpebra começa

for (const option of OPTIONS) {
  const basePath = join(ROOT, 'raw', option.id, 'base.png');
  const meta = await sharp(basePath).metadata();
  const W = meta.width;
  const H = meta.height;
  const rgba = await sharp(basePath).ensureAlpha().raw().toBuffer();

  const rect = option.eyesRect;

  // -------------------------------------------------------------------------
  // Localiza as duas aberturas oculares
  // -------------------------------------------------------------------------

  /**
   * Posição dos olhos derivada da geometria do eyesRect, não de detecção.
   *
   * A detecção por pixel escuro parecia mais precisa, mas era contaminada por
   * cabelo dentro do recorte: na opção 1 ela colocava o olho direito em x=862
   * quando o real fica em ~819, e a pálpebra descia ao lado do olho em vez de
   * sobre ele. O eyesRect já enquadra os dois olhos com folga uniforme — é uma
   * âncora mais estável do que qualquer limiar de luminância.
   */
  /**
   * Posição dos olhos por projeção de pixels escuros dentro do eyesRect.
   *
   * A versão anterior fixava os centros em 27% e 73% da largura e a linha dos
   * olhos em 50% da altura. Funcionava na opção 2, mas as opções 1 e 3 têm
   * recortes proporcionalmente mais altos, com mais testa incluída — a linha
   * caía acima do olho e a pálpebra descia torta. Projetar resolve sem depender
   * de o recorte estar enquadrado da mesma forma nas três.
   */
  const base = await sharp(basePath).extract(rect).removeAlpha().raw().toBuffer();
  const w = rect.width;
  const h = rect.height;

  /**
   * Centro horizontal por geometria, linha dos olhos por projeção.
   *
   * A projeção horizontal também foi tentada e falhou: dentro do eyesRect o
   * cabelo escuro nas laterais domina a contagem, e os centros iam parar nas
   * bordas do recorte, com raios de 154px. Já a linha dos olhos precisa mesmo
   * ser medida, e é aqui que estava o defeito: fixar a linha em 50% da altura
   * do recorte acertava a opção 2 (56% real) e errava as outras duas — 63% na
   * opção 1 e 70% na opção 3. Por isso a piscada da loira saía boa e as das
   * outras duas desciam acima do olho.
   *
   * Contar apenas as colunas centrais mantém o cabelo fora da conta.
   */
  const rowLight = new Float64Array(h);
  const skipBrow = Math.round(h * 0.3);
  const fromCol = Math.round(w * 0.2);
  const toCol = Math.round(w * 0.8);

  /**
   * O alvo é a esclera, não a íris.
   *
   * Contar pixels escuros parecia natural, mas a sobrancelha é maior e mais
   * escura que a íris e vencia a votação: a linha saía em 38–42% do recorte,
   * praticamente colada no limite inferior da busca. O branco do olho é a única
   * coisa clara naquela faixa do rosto, então procurar o pico de pixels
   * quase-brancos aponta direto para a linha dos olhos.
   */
  for (let y = skipBrow; y < h; y++) {
    for (let x = fromCol; x < toCol; x++) {
      const p = (y * w + x) * 3;
      const r = base[p], g = base[p + 1], b = base[p + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (value > 175 && sat < 0.2) rowLight[y] += 1;
    }
  }

  let peakRow = skipBrow;
  for (let y = skipBrow; y < h; y++) if (rowLight[y] > rowLight[peakRow]) peakRow = y;

  const rx = w * 0.12;
  const ry = rx * 0.38;
  const cy = rect.top + peakRow;

  const eyes = [
    { cx: rect.left + w * 0.27, cy, rx, ry },
    { cx: rect.left + w * 0.73, cy, rx, ry },
  ];

  console.log(`\n  ${option.id}  ·  linha dos olhos em ${(peakRow / h * 100).toFixed(0)}% do recorte`);

  for (const eye of eyes) {
    console.log(`    olho  centro ${eye.cx.toFixed(0)},${eye.cy.toFixed(0)}  raio ${eye.rx.toFixed(0)}×${eye.ry.toFixed(0)}`);
  }

  // -------------------------------------------------------------------------
  // Desce a pálpebra
  // -------------------------------------------------------------------------

  function drape(target, eye, closeAmount) {
    const { cx, cy, rx, ry } = eye;
    const lidHeight = Math.max(6, Math.round(ry * 1.5));

    for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
      if (x < 1 || x >= W - 1) continue;

      const norm = (x - cx) / rx;
      const halfHeight = ry * Math.sqrt(Math.max(0, 1 - norm * norm));
      if (halfHeight < 1) continue;

      const top = cy - halfHeight;
      const bottom = cy + halfHeight;
      const lidBottom = top + (bottom - top) * closeAmount;

      // queda suave nos cantos: a lente some na pele em vez de terminar numa
      // aresta reta
      const near = Math.min(1, (1 - Math.abs(norm)) / 0.3);
      const edge = near * near * (3 - 2 * near);

      for (let y = Math.floor(top) - 1; y <= Math.ceil(lidBottom) + 1; y++) {
        if (y < 1 || y >= H - 1) continue;
        if (y > lidBottom + 1) continue;

        const t = Math.max(0, Math.min(1, (y - top) / Math.max(0.001, lidBottom - top)));
        const sourceY = Math.round(bottom + LID_SOURCE_GAP + (1 - t) * lidHeight);
        if (sourceY >= H - 1) continue;

        const src = (sourceY * W + x) * 4;
        const dst = (y * W + x) * 4;

        const crease = t < 0.3 ? 0.93 + t * 0.23 : 1;
        const toEdge = (lidBottom - y) / Math.max(1, lidBottom - top);
        const lash = toEdge < 0.18 ? 0.44 + Math.max(0, toEdge) * 3.1 : 1;
        const shade = Math.min(1, crease) * Math.min(1, lash);

        // desvanece no topo, senão o vinco vira um risco reto
        const feather = Math.max(2, ry * 0.3);
        const fadeTop = Math.min(1, Math.max(0, y - top + feather) / feather);
        const alpha = edge * fadeTop;

        for (let c = 0; c < 3; c++) {
          const value = rgba[src + c] * shade;
          target[dst + c] = Math.round(target[dst + c] * (1 - alpha) + value * alpha);
        }
      }
    }
  }

  const outDir = join(ROOT, 'processed-v3', option.id, 'eyes');
  mkdirSync(outDir, { recursive: true });

  for (const [name, amount] of [['open', 0], ['half', 0.55], ['closed', 1]]) {
    const frame = Buffer.from(rgba);
    if (amount > 0) for (const eye of eyes) drape(frame, eye, amount);

    await sharp(frame, { raw: { width: W, height: H, channels: 4 } })
      .extract(rect)
      .png()
      .toFile(join(outDir, `${name}.png`));

    console.log(`    → eyes/${name}.png  (${rect.width}×${rect.height})`);
  }
}

console.log('');
