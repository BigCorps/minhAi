/**
 * Normaliza olhos e sobrancelhas entre as quatro expressoes.
 *
 *   node scripts/normalize-eyes.mjs
 *
 * POR QUE ESTE SCRIPT EXISTE
 *
 * As quatro fotos de expressao sao geracoes independentes. Medindo a diferenca
 * media entre elas, faixa por faixa da cara (escala de 0 a 255):
 *
 *     testa        0,8    <- identicas, as fotos estao alinhadas
 *     sobrancelha  7,9
 *     olhos       12,7    <- o que MAIS muda
 *     nariz        4,3
 *     boca         8,3
 *     pescoco      0,8
 *
 * O olho muda mais que a boca. Isso e o contrario de uma expressao: sorrir mexe
 * na boca, nao redesenha a sobrancelha. O que esta ali nao e expressao, e ruido
 * de geracao — cada foto saiu com um olho e uma sobrancelha um pouco diferentes.
 *
 * Por isso a troca de expressao continuava aparecendo mesmo escondida atras da
 * piscada. A palpebra cobre o olho por uma fracao de segundo, mas quando ela
 * sobe o olho e outro, e continua outro. Nenhum ajuste de tempo resolve, porque
 * o problema nao esta no momento da troca, esta no material.
 *
 * O QUE ELE FAZ
 *
 * Copia a regiao de olhos e sobrancelhas da neutra para as outras tres, com
 * borda suavizada em 26px, e faz o mesmo com o quadro de olho fechado. Depois
 * disso as quatro compartilham o mesmo olhar e diferem so da boca para baixo —
 * que e exatamente o que uma expressao deveria mudar.
 *
 * A regiao nao e chutada: a diferenca entre as bases so existe entre x 367 e
 * 684 e y 190 e 360. Fora disso (cabelo, fone, pescoco, camiseta) elas ja sao
 * identicas. O retangulo abaixo tem folga em volta disso.
 *
 * ORDEM
 *
 * Rode este script ANTES do build-blink-ladder.mjs. A escada de piscada e
 * gerada a partir das bases, entao ela precisa ver as bases ja normalizadas.
 *
 *   node scripts/normalize-eyes.mjs
 *   node scripts/build-blink-ladder.mjs
 *
 * IRREVERSIVEL
 *
 * Ele sobrescreve os arquivos de base. Guarde uma copia de
 * public/funcionaria/avatar/ antes de rodar, ou confie no git.
 */

import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = join(here, '..', 'public', 'funcionaria', 'avatar');

const SOURCE = 'neutra';
const TARGETS = ['sorriso', 'sorriso-aberto', 'atenta'];

/** Retangulo do enxerto, medido na diferenca entre as bases. */
const GRAFT = { x0: 350, x1: 700, y0: 185, y1: 365 };
const FEATHER = 26;

const WEBP = { quality: 92, effort: 6 };

const smoothstep = x => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

const ramp = (v, lo, hi, feather) => {
  const up = smoothstep((v - (lo - feather)) / feather);
  const dn = 1 - smoothstep((v - hi) / feather);
  return Math.max(0, Math.min(up, dn));
};

async function readRaw(path) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Mistura `patch` sobre `into` dentro do retangulo, com borda suavizada.
 *
 * O alfa continua sendo o de `into`: o enxerto troca a aparencia do rosto, nao
 * a silhueta. Misturar alfa faria a borda do recorte comer o contorno.
 */
function blend(into, patch, width, height) {
  const out = Buffer.from(into);
  for (let y = 0; y < height; y++) {
    const vy = ramp(y, GRAFT.y0, GRAFT.y1, FEATHER);
    if (vy <= 0) continue;
    for (let x = 0; x < width; x++) {
      const w = vy * ramp(x, GRAFT.x0, GRAFT.x1, FEATHER);
      if (w <= 0) continue;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        out[i + c] = Math.round(patch[i + c] * w + into[i + c] * (1 - w));
      }
    }
  }
  return out;
}

function meanDiff(a, b, width) {
  let sum = 0, n = 0;
  for (let y = 190; y < 360; y++) {
    for (let x = 350; x < 700; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) sum += Math.abs(a[i + c] - b[i + c]);
      n += 3;
    }
  }
  return sum / n;
}

const sourceBase = await readRaw(join(AVATAR_DIR, `${SOURCE}-base.webp`));
const { width, height } = sourceBase;

/*
  O quadro de olho fechado tambem vem da neutra.

  Se as quatro bases passam a ter o mesmo olho, os quadros de piscada precisam
  ser os mesmos tambem — senao a palpebra de `atenta` desceria sobre o olho da
  `neutra` e as duas nao casam.
*/
const sourceClosedPath = join(AVATAR_DIR, `${SOURCE}-eyes-closed.webp`);
const sourceClosed = existsSync(sourceClosedPath)
  ? await sharp(sourceClosedPath).ensureAlpha().webp(WEBP).toBuffer()
  : null;

console.log('Normalizando olhos e sobrancelhas:');

for (const expression of TARGETS) {
  const basePath = join(AVATAR_DIR, `${expression}-base.webp`);
  if (!existsSync(basePath)) {
    console.log(`  ${expression}: base ausente, pulando`);
    continue;
  }

  const target = await readRaw(basePath);
  if (target.width !== width || target.height !== height) {
    throw new Error(`${expression}: base tem tamanho diferente da ${SOURCE}`);
  }

  const before = meanDiff(target.data, sourceBase.data, width);
  const merged = blend(target.data, sourceBase.data, width, height);
  const after = meanDiff(merged, sourceBase.data, width);

  await sharp(merged, { raw: { width, height, channels: 4 } })
    .webp(WEBP)
    .toFile(basePath);

  if (sourceClosed) {
    await sharp(sourceClosed).toFile(join(AVATAR_DIR, `${expression}-eyes-closed.webp`));
  }

  console.log(
    `  ${expression.padEnd(16)} olhos: ${before.toFixed(1)} -> ${after.toFixed(1)}`
  );
}

console.log('\nAgora rode: node scripts/build-blink-ladder.mjs');
