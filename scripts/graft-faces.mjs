#!/usr/bin/env node
/**
 * Enxerta os olhos de fotos avulsas na base, com Poisson blending.
 *
 *   node scripts/graft-eyes.mjs ./raw/eyes ./raw/neutra.png ./raw/eyes-grafted
 *
 * Mesma ideia do enxerto das bocas, com um passo a mais: as fotos de olho vêm
 * de um enquadramento diferente, então além da translação é preciso encontrar a
 * escala. Ela é resolvida pela distância entre os reflexos da córnea, que é a
 * medida mais estável do rosto.
 *
 * Por que Poisson de novo: copiar o retângulo direto traria o tom de pele da
 * outra foto. O Poisson copia o gradiente e deixa a cor absoluta ser ditada
 * pela borda, que é a pele da base — o desenho vem da foto nova, a cor vem da
 * base.
 */

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import sharp from 'sharp';

const eyesDir = resolve(process.argv[2] || './raw/eyes');
const basePath = resolve(process.argv[3] || './raw/neutra.png');
const outDir = resolve(process.argv[4] || './raw/eyes-grafted');
mkdirSync(outDir, { recursive: true });

const meta = await sharp(basePath).metadata();
const W = meta.width;
const H = meta.height;
const base = await sharp(basePath).ensureAlpha().raw().toBuffer();

/** Janela em volta dos dois olhos, generosa, em pixels da base. */
const WINDOW = { left: 280, top: 150, width: 490, height: 500 };
/** Faixa usada só para alinhar; não recebe transplante. */
const FRAME = 55;

const lum = (buf, i, stride = 4) =>
  0.2126 * buf[i * stride] + 0.7152 * buf[i * stride + 1] + 0.0722 * buf[i * stride + 2];

/** Distância entre os reflexos da córnea, em pixels. */
function corneaSpread(buf, w, h, channels) {
  const cols = new Float64Array(w);
  const rows = new Float64Array(h);
  // Busca limitada ao terco superior. Indo ate 60% da altura, os dentes de um
  // sorriso aberto — brancos e dessaturados, exatamente o criterio da cornea —
  // ganhavam a votacao e a linha dos olhos caia na boca.
  for (let y = Math.round(h * 0.1); y < Math.round(h * 0.24); y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * channels;
      const r = buf[p], g = buf[p + 1], b = buf[p + 2];
      const max = Math.max(r, g, b);
      const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
      if (0.2126 * r + 0.7152 * g + 0.0722 * b > 170 && sat < 0.22) { cols[x] += 1; rows[y] += 1; }
    }
  }
  const peak = (from, to) => {
    let best = from;
    for (let i = from; i < to; i++) if (cols[i] > cols[best]) best = i;
    return best;
  };
  const middle = w >> 1;
  const left = peak(Math.round(w * 0.1), middle);
  const right = peak(middle, Math.round(w * 0.9));
  let cy = Math.round(h * 0.1);
  for (let y = Math.round(h * 0.1); y < Math.round(h * 0.24); y++) if (rows[y] > rows[cy]) cy = y;
  return { left, right, cy, spread: right - left };
}

/**
 * Centros medidos uma vez na expressao neutra e reusados nas demais.
 *
 * Deixar cada expressao se medir sozinha falhava: nas que mostram dentes, o
 * branco deles ganhava a votacao da cornea e a distancia entre olhos saia em
 * 255 pixels em vez de 102. A elipse de enxerto ficava tres vezes maior que o
 * olho. Como as quatro expressoes vem no mesmo enquadramento, medir uma vez
 * basta — e e mais estavel do que qualquer filtro.
 */
const fixedEyes = process.env.EYES
  ? (() => {
      const [left, right, cy] = process.env.EYES.split(',').map(Number);
      return { left, right, cy, spread: right - left };
    })()
  : null;

const baseEyes = fixedEyes || corneaSpread(base, W, H, 4);
console.log(`\n  base: córneas em ${baseEyes.left} e ${baseEyes.right}, linha em y=${baseEyes.cy}, distância ${baseEyes.spread}`);

const files = readdirSync(eyesDir).filter(f => f.toLowerCase().endsWith('.png')).sort();

for (const file of files) {
  const src = join(eyesDir, file);
  const srcMeta = await sharp(src).metadata();
  const raw = await sharp(src).ensureAlpha().raw().toBuffer();
  /**
   * Escala pela largura da cabeca.
   *
   * Enxertar em 1:1 deixava o rosto do sorriso 4,8% maior que o da neutra — a
   * cabeca media 374 pixels contra 357. Como o corpo passou a ser sempre o da
   * neutra, esse rosto maior aparecia como olhos e boca de tamanho diferente a
   * cada troca de expressao.
   *
   * A cabeca e medida logo abaixo do topo da silhueta, onde so ha cranio e
   * headset. E mais estavel que a distancia entre corneas, que falha nas
   * expressoes com dentes — no sorriso ela devolvia 104 pixels em vez de 134.
   */
  const headWidth = async (file) => {
    const meta = await sharp(file).metadata();
    const buf = await sharp(file).ensureAlpha().raw().toBuffer();
    let top = -1;
    for (let y = 0; y < meta.height && top < 0; y++) {
      for (let x = 0; x < meta.width; x++) {
        if (buf[(y * meta.width + x) * 4 + 3] > 128) { top = y; break; }
      }
    }
    const row = top + 140;
    let left = meta.width, right = 0;
    for (let x = 0; x < meta.width; x++) {
      if (buf[(row * meta.width + x) * 4 + 3] > 128) { if (x < left) left = x; right = x; }
    }
    return right - left;
  };

  const baseHead = await headWidth(basePath);
  const srcHead = await headWidth(src);
  const headScale = baseHead / srcHead;

  /**
   * Escala fixa em 1: os arquivos vem no mesmo enquadramento da base.
   *
   * A primeira versao media a escala pela distancia entre os reflexos da
   * cornea. Funciona para olho aberto e falha para olho fechado, que e
   * justamente metade do lote — sem reflexo, a deteccao pegava qualquer outro
   * ponto claro e devolvia escalas de 0,24 a 2,10. Como o enquadramento ja
   * bate, sobra so a translacao de poucos pixels.
   */
  const scale = headScale;
  const sw = Math.round(srcMeta.width * scale);
  const sh = Math.round(srcMeta.height * scale);
  const scaled = Math.abs(scale - 1) < 0.002
    ? raw
    : await sharp(src).resize(sw, sh, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();

  // --- alinhamento por translação, medido só na moldura ---
  let best = { error: Infinity, dx: 0, dy: 0 };
  // Busca curta: os arquivos vem no mesmo enquadramento da base, entao o
  // desvio e de poucos pixels. Com janela larga a busca encontrava minimos
  // espurios e parava no limite do intervalo.
  for (let dy = -24; dy <= 24; dy += 2) {
    for (let dx = -24; dx <= 24; dx += 2) {
      let acc = 0;
      let n = 0;
      for (let y = 0; y < WINDOW.height; y += 3) {
        for (let x = 0; x < WINDOW.width; x += 3) {
          const inFrame =
            x < FRAME || x >= WINDOW.width - FRAME ||
            y < FRAME || y >= WINDOW.height - FRAME;
          if (!inFrame) continue;
          const bx = WINDOW.left + x;
          const by = WINDOW.top + y;
          const fx = bx + dx;
          const fy = by + dy;
          if (fx < 0 || fy < 0 || fx >= sw || fy >= sh) continue;
          const d = lum(base, by * W + bx) - lum(scaled, fy * sw + fx);
          acc += d * d;
          n++;
        }
      }
      if (n < 200) continue;
      acc /= n;
      if (acc < best.error) best = { error: acc, dx, dy };
    }
  }

  // refino de um pixel
  const coarse = { ...best };
  for (let dy = coarse.dy - 2; dy <= coarse.dy + 2; dy++) {
    for (let dx = coarse.dx - 2; dx <= coarse.dx + 2; dx++) {
      let acc = 0;
      let n = 0;
      for (let y = 0; y < WINDOW.height; y += 2) {
        for (let x = 0; x < WINDOW.width; x += 2) {
          const inFrame =
            x < FRAME || x >= WINDOW.width - FRAME ||
            y < FRAME || y >= WINDOW.height - FRAME;
          if (!inFrame) continue;
          const bx = WINDOW.left + x;
          const by = WINDOW.top + y;
          const fx = bx + dx;
          const fy = by + dy;
          if (fx < 0 || fy < 0 || fx >= sw || fy >= sh) continue;
          const d = lum(base, by * W + bx) - lum(scaled, fy * sw + fx);
          acc += d * d;
          n++;
        }
      }
      if (n < 200) continue;
      acc /= n;
      if (acc < best.error) best = { error: acc, dx, dy };
    }
  }

  // --- região: elipse dupla em volta dos dois olhos ---
  const w = WINDOW.width;
  const h = WINDOW.height;
  const region = new Uint8Array(w * h);

  /**
   * A regiao e o rosto inteiro, nao duas elipses nos olhos.
   *
   * Normalizar as expressoes pela silhueta nao resolveu o salto de tamanho: a
   * cabeca ficou igual, mas o ombro variava 26 pixels entre elas e a linha dos
   * olhos, 12. Sao geracoes independentes e a anatomia nao sai igual — nao ha
   * escala que corrija isso sem deformar alguem.
   *
   * Enxertando so o rosto, o corpo passa a ser sempre o da neutra. A troca de
   * expressao deixa de mexer em ombro, braco ou enquadramento, e some a
   * variacao que sobrava.
   */
  {
    const cx = w / 2;
    const cy = h * 0.52;
    const rx = w * 0.34;
    const ry = h * 0.40;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) region[y * w + x] = 1;
      }
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < FRAME || x >= w - FRAME || y < FRAME || y >= h - FRAME) region[y * w + x] = 0;
    }
  }

  let count = 0;
  for (let i = 0; i < w * h; i++) if (region[i]) count++;

  // --- Poisson ---
  const out = Buffer.from(base);

  for (let c = 0; c < 3; c++) {
    const value = new Float64Array(w * h);
    const divergence = new Float64Array(w * h);

    const baseAt = (x, y) => base[((WINDOW.top + y) * W + WINDOW.left + x) * 4 + c];
    const srcAt = (x, y) => {
      const fx = WINDOW.left + x + best.dx;
      const fy = WINDOW.top + y + best.dy;
      if (fx < 0 || fy < 0 || fx >= sw || fy >= sh) return baseAt(x, y);
      return scaled[(fy * sw + fx) * 4 + c];
    };

    for (let i = 0; i < w * h; i++) value[i] = baseAt(i % w, (i / w) | 0);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (!region[y * w + x]) continue;
        divergence[y * w + x] =
          4 * srcAt(x, y) - srcAt(x - 1, y) - srcAt(x + 1, y) - srcAt(x, y - 1) - srcAt(x, y + 1);
      }
    }

    const omega = 1.9;
    for (let pass = 0; pass < 400; pass++) {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!region[i]) continue;
          const next =
            (value[i - 1] + value[i + 1] + value[i - w] + value[i + w] + divergence[i]) / 4;
          value[i] = value[i] + omega * (next - value[i]);
        }
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!region[y * w + x]) continue;
        const target = ((WINDOW.top + y) * W + WINDOW.left + x) * 4 + c;
        out[target] = Math.max(0, Math.min(255, Math.round(value[y * w + x])));
      }
    }
  }

  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(join(outDir, basename(file)));

  console.log(`    ${basename(file).padEnd(34)} escala ${scale.toFixed(2)}  desloc ${String(best.dx).padStart(4)},${String(best.dy).padStart(4)}  ·  ${count} px`);
}

console.log('');
