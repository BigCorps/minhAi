#!/usr/bin/env node
/**
 * Normaliza o tamanho e a posicao das expressoes contra a neutra.
 *
 *   node scripts/normalize-expressions.mjs ./raw
 *
 * As quatro expressoes vem de geracoes independentes, e a silhueta nao sai
 * igual: medindo, a largura variava de 899 a 930 pixels e a borda esquerda de
 * 57 a 82. Sao 3,5% de diferenca — pouco para notar numa imagem parada, muito
 * para notar numa troca, porque a atendente parece mudar de tamanho.
 *
 * O efeito ficava pior durante a fala, que trava a expressao em neutra: a
 * neutra e justamente a mais estreita das quatro, entao toda frase comecava com
 * um encolhimento.
 *
 * Aqui cada expressao e escalada e transladada para que a silhueta ocupe
 * exatamente a mesma caixa da neutra. Como isso roda ANTES do enxerto de olhos
 * e do build, as mascaras e os recortes saem ja alinhados.
 *
 * A neutra nao e tocada: ela e a referencia.
 */

import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const EXPRESSIONS = ['neutra', 'sorriso', 'sorriso-aberto', 'atenta'];

const rawDir = resolve(process.argv[2] || './raw');
const backupDir = join(rawDir, '_originais');
mkdirSync(backupDir, { recursive: true });

/** Caixa da silhueta: onde o alpha e opaco. */
async function silhouette(file) {
  const meta = await sharp(file).metadata();
  const W = meta.width;
  const H = meta.height;
  const buf = await sharp(file).ensureAlpha().raw().toBuffer();

  let top = -1, bottom = 0, left = W, right = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (buf[(y * W + x) * 4 + 3] < 128) continue;
      if (top < 0) top = y;
      bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  return { W, H, top, bottom, left, right, width: right - left, height: bottom - top };
}

const referencePath = join(rawDir, 'neutra.png');
if (!existsSync(referencePath)) {
  console.error(`\n  neutra.png nao encontrada em ${rawDir}\n`);
  process.exit(1);
}

const reference = await silhouette(referencePath);
console.log(`\n  referencia (neutra)  largura ${reference.width}  topo ${reference.top}  centro x ${Math.round((reference.left + reference.right) / 2)}\n`);

for (const expression of EXPRESSIONS) {
  if (expression === 'neutra') continue;

  const file = join(rawDir, `${expression}.png`);
  if (!existsSync(file)) continue;

  const backup = join(backupDir, `${expression}.png`);
  if (!existsSync(backup)) copyFileSync(file, backup);

  const current = await silhouette(backup);

  /**
   * Escala uniforme pela largura.
   *
   * Usar largura e altura em separado corrigiria a caixa com precisao, mas
   * esticaria o rosto: 3% a mais na horizontal e 1% na vertical deixam a
   * pessoa visivelmente diferente. Uma escala so preserva a proporcao, que
   * importa mais do que casar a caixa ao pixel.
   */
  const scale = reference.width / current.width;
  const W = current.W;
  const H = current.H;

  const scaledW = Math.round(W * scale);
  const scaledH = Math.round(H * scale);
  const scaled = await sharp(backup)
    .resize(scaledW, scaledH, { kernel: 'lanczos3' })
    .png()
    .toBuffer();

  // onde a silhueta caiu depois da escala
  const centerBefore = (current.left + current.right) / 2;
  const centerAfter = centerBefore * scale;
  const topAfter = current.top * scale;

  const targetCenter = (reference.left + reference.right) / 2;
  const dx = Math.round(targetCenter - centerAfter);
  const dy = Math.round(reference.top - topAfter);

  // recorta de volta para o tamanho original, aplicando o deslocamento
  const canvas = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: scaled, left: dx, top: dy }])
    .png()
    .toBuffer();

  await sharp(canvas).png().toFile(file);

  const result = await silhouette(file);
  console.log(
    `  ${expression.padEnd(16)} escala ${scale.toFixed(4)}  desloc ${String(dx).padStart(4)},${String(dy).padStart(4)}` +
    `  →  largura ${result.width} (ref ${reference.width})  topo ${result.top} (ref ${reference.top})`,
  );
}

console.log('\n  originais guardados em _originais/\n');
