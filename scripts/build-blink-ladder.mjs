/**
 * Gera os quadros intermediarios da piscada (Piscada v8).
 *
 * Estrategia da v8:
 * - continua usando imagens originais da avatar;
 * - separa olho esquerdo e direito;
 * - aumenta o feather superior do olho esquerdo;
 * - usa uma area de substituicao menor;
 * - suaviza mais os frames 2, 3 e 4, que eram os mais sensiveis.
 */

import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(here, '..', 'public', 'funcionaria');
const AVATAR_DIR = join(PUBLIC_DIR, 'avatar');
const SOURCE_DIR = join(PUBLIC_DIR, 'avatar-source');
const EYES_RECT = { left: 319, top: 210, width: 409, height: 148 };
const WEBP = { quality: 92, effort: 6 };

// Duas janelas de olho dentro do eyesRect geral.
const LEFT_EYE = { x0: 22, x1: 182, y0: 16, y1: 108 };
const RIGHT_EYE = { x0: 222, x1: 386, y0: 16, y1: 108 };

const CFG = {
  left: {
    topFeather: 18,
    sideFeather: 12,
    bottomFeather: 10,
    diffThreshold: 8,
    diffGain: 4.8,
    alphaBlur: 5,
    topOpacity: 0.78,
  },
  right: {
    topFeather: 13,
    sideFeather: 11,
    bottomFeather: 10,
    diffThreshold: 8,
    diffGain: 4.5,
    alphaBlur: 4,
    topOpacity: 0.88,
  },
  middleGapSoftness: 18,
};

const SOURCES = {
  neutra: {
    open: 'neutral-open.png',
    stages: [
      { kind: 'mix', a: 'neutral-open.png', b: 'neutral-half-soft.png', t: 0.24 },
      { kind: 'mix', a: 'neutral-open.png', b: 'neutral-half-soft.png', t: 0.50 },
      { kind: 'mix', a: 'neutral-half-soft.png', b: 'neutral-half-deeper.png', t: 0.28 },
      { kind: 'mix', a: 'neutral-half-soft.png', b: 'neutral-half-deeper.png', t: 0.58 },
      { kind: 'mix', a: 'neutral-half-deeper.png', b: 'neutral-closed.png', t: 0.52 },
      { kind: 'image', file: 'neutral-closed.png' },
    ],
  },
  atenta: {
    open: 'neutral-open-2.png',
    stages: [
      { kind: 'mix', a: 'neutral-open-2.png', b: 'neutral-half-soft.png', t: 0.24 },
      { kind: 'mix', a: 'neutral-open-2.png', b: 'neutral-half-soft.png', t: 0.50 },
      { kind: 'mix', a: 'neutral-half-soft.png', b: 'neutral-half-deeper.png', t: 0.28 },
      { kind: 'mix', a: 'neutral-half-soft.png', b: 'neutral-half-deeper.png', t: 0.58 },
      { kind: 'mix', a: 'neutral-half-deeper.png', b: 'neutral-closed.png', t: 0.52 },
      { kind: 'image', file: 'neutral-closed.png' },
    ],
  },
  sorriso: {
    open: 'smile-open.png',
    stages: [
      { kind: 'mix', a: 'smile-open.png', b: 'smile-half.png', t: 0.24 },
      { kind: 'mix', a: 'smile-open.png', b: 'smile-half.png', t: 0.50 },
      { kind: 'mix', a: 'smile-half.png', b: 'smile-closed.png', t: 0.26 },
      { kind: 'mix', a: 'smile-half.png', b: 'smile-closed.png', t: 0.52 },
      { kind: 'mix', a: 'smile-half.png', b: 'smile-closed.png', t: 0.78 },
      { kind: 'image', file: 'smile-closed.png' },
    ],
  },
  'sorriso-aberto': {
    open: 'smile-open.png',
    stages: [
      { kind: 'mix', a: 'smile-open.png', b: 'smile-half.png', t: 0.24 },
      { kind: 'mix', a: 'smile-open.png', b: 'smile-half.png', t: 0.50 },
      { kind: 'mix', a: 'smile-half.png', b: 'smile-closed.png', t: 0.26 },
      { kind: 'mix', a: 'smile-half.png', b: 'smile-closed.png', t: 0.52 },
      { kind: 'mix', a: 'smile-half.png', b: 'smile-closed.png', t: 0.78 },
      { kind: 'image', file: 'smile-closed.png' },
    ],
  },
};

function lerp(a, b, t) {
  return a * (1 - t) + b * t;
}

async function cropRaw(fullPath) {
  const { left, top, width, height } = EYES_RECT;
  const { data, info } = await sharp(fullPath)
    .ensureAlpha()
    .extract({ left, top, width, height })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function blurAlpha(alpha, width, height, radius) {
  if (radius <= 0) return alpha;
  const temp = new Float64Array(alpha.length);
  const out = new Uint8ClampedArray(alpha.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let k = x - radius; k <= x + radius; k++) {
        if (k < 0 || k >= width) continue;
        sum += alpha[y * width + k];
        n += 1;
      }
      temp[y * width + x] = n ? sum / n : alpha[y * width + x];
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let k = y - radius; k <= y + radius; k++) {
        if (k < 0 || k >= height) continue;
        sum += temp[k * width + x];
        n += 1;
      }
      out[y * width + x] = Math.round(n ? sum / n : temp[y * width + x]);
    }
  }

  return out;
}

function edgeFeather(pos, start, end, feather) {
  if (pos < start - feather || pos > end + feather) return 0;
  if (pos >= start && pos <= end) return 1;
  if (pos < start) return Math.max(0, Math.min(1, (pos - (start - feather)) / feather));
  return Math.max(0, Math.min(1, ((end + feather) - pos) / feather));
}

function topFeatherMask(y, y0, topFeather, topOpacity) {
  const t = edgeFeather(y, y0, Infinity, topFeather);
  return lerp(topOpacity, 1, t);
}

function centerGapMask(x) {
  const gapCenter = 204;
  const d = Math.abs(x - gapCenter);
  if (d >= CFG.middleGapSoftness) return 1;
  return Math.max(0.55, d / CFG.middleGapSoftness);
}

function regionMask(x, y, box, cfg) {
  const mx = Math.min(
    edgeFeather(x, box.x0, box.x1, cfg.sideFeather),
    edgeFeather(y, box.y0, box.y1, cfg.bottomFeather),
  );
  const top = topFeatherMask(y, box.y0, cfg.topFeather, cfg.topOpacity);
  return mx * top * centerGapMask(x);
}

async function loadStage(stage, cache) {
  if (stage.kind === 'image') return cache.get(stage.file);
  const a = cache.get(stage.a);
  const b = cache.get(stage.b);
  const out = Buffer.alloc(a.data.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.round(lerp(a.data[i], b.data[i], stage.t));
  return { data: out, width: a.width, height: a.height };
}

function alphaForPixel(openData, targetData, p, box, cfg, x, y, stageIndex) {
  const dr = Math.abs(targetData[p + 0] - openData[p + 0]);
  const dg = Math.abs(targetData[p + 1] - openData[p + 1]);
  const db = Math.abs(targetData[p + 2] - openData[p + 2]);
  const d = Math.max(dr, dg, db);
  let a = (d - cfg.diffThreshold) * cfg.diffGain;
  a = Math.max(0, Math.min(255, a));

  // Reduz um pouco os frames centrais para a transicao nao ficar tao dura.
  if (stageIndex === 1 || stageIndex === 2 || stageIndex === 3) a *= 0.90;
  if (stageIndex === 0) a *= 0.84;

  a *= regionMask(x, y, box, cfg);
  return Math.max(0, Math.min(255, a));
}

async function buildExpression(expression) {
  const def = SOURCES[expression];
  if (!def) throw new Error(`Sem definicao para ${expression}`);

  const allFiles = new Set([def.open]);
  for (const stage of def.stages) {
    if (stage.kind === 'image') allFiles.add(stage.file);
    else {
      allFiles.add(stage.a);
      allFiles.add(stage.b);
    }
  }

  const cache = new Map();
  for (const file of allFiles) {
    const full = join(SOURCE_DIR, file);
    if (!existsSync(full)) throw new Error(`Arquivo fonte ausente: ${full}`);
    cache.set(file, await cropRaw(full));
  }

  const open = cache.get(def.open);
  const w = open.width;
  const h = open.height;

  for (let idx = 0; idx < def.stages.length; idx++) {
    const target = await loadStage(def.stages[idx], cache);
    const out = Buffer.alloc(w * h * 4);
    const alphaLeft = new Uint8ClampedArray(w * h);
    const alphaRight = new Uint8ClampedArray(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        out[p + 0] = target.data[p + 0];
        out[p + 1] = target.data[p + 1];
        out[p + 2] = target.data[p + 2];

        if (x >= LEFT_EYE.x0 && x <= LEFT_EYE.x1 && y >= LEFT_EYE.y0 && y <= LEFT_EYE.y1 + CFG.left.bottomFeather) {
          alphaLeft[y * w + x] = Math.round(alphaForPixel(open.data, target.data, p, LEFT_EYE, CFG.left, x, y, idx));
        }
        if (x >= RIGHT_EYE.x0 && x <= RIGHT_EYE.x1 && y >= RIGHT_EYE.y0 && y <= RIGHT_EYE.y1 + CFG.right.bottomFeather) {
          alphaRight[y * w + x] = Math.round(alphaForPixel(open.data, target.data, p, RIGHT_EYE, CFG.right, x, y, idx));
        }
      }
    }

    const leftBlurred = blurAlpha(alphaLeft, w, h, CFG.left.alphaBlur);
    const rightBlurred = blurAlpha(alphaRight, w, h, CFG.right.alphaBlur);

    for (let i = 0; i < w * h; i++) {
      out[i * 4 + 3] = Math.max(leftBlurred[i], rightBlurred[i]);
    }

    const outPath = join(AVATAR_DIR, `${expression}-eyes-${idx + 1}.webp`);
    await sharp(out, { raw: { width: w, height: h, channels: 4 } })
      .webp(WEBP)
      .toFile(outPath);
  }

  console.log(`  ${expression}: ${def.stages.length} quadros gerados (v8 por olho)`);
}

async function main() {
  console.log('Piscada v8 — gerando ladder com blend por olho');
  for (const expression of Object.keys(SOURCES)) {
    await buildExpression(expression);
  }
  console.log('\nConcluido. Validar principalmente os frames intermediarios do olho esquerdo.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
