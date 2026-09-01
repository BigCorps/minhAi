#!/usr/bin/env node
/**
 * Transplanta a boca de cada frame para a base, com Poisson blending.
 *
 *   node scripts/graft-mouths.mjs ./raw/mouths ./raw/neutra.png
 *
 * Por que isto existe: o agente de imagem não consegue fazer inpainting. Nas
 * quatro tentativas ele devolveu gerações independentes — medindo, cada arquivo
 * diferia da base em 74 a 128 mil pixels, espalhados pela imagem inteira, e nem
 * entre si os frames eram consistentes. Um inpainting correto daria zero.
 *
 * Copiar o retângulo da boca direto não resolve: o tom de pele e a geometria do
 * queixo mudam de frame para frame, e a emenda aparece como remendo.
 *
 * Poisson blending resolve exatamente esse caso. Em vez de copiar as cores do
 * recorte, ele copia o **gradiente** — a variação entre pixels vizinhos — e
 * deixa a cor absoluta ser determinada pela borda, que é a pele da base. O
 * resultado tem o desenho da boca nova com o tom de pele da base, sem costura.
 *
 * A equação resolvida é ∇²f = ∇²g dentro da região, com f = base na borda. Aqui
 * ela é resolvida por Gauss-Seidel com sobre-relaxação, que numa região de
 * ~300×300 converge em algumas centenas de iterações.
 */

import { readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import sharp from 'sharp';

const mouthDir = resolve(process.argv[2] || './raw/mouths');
const basePath = resolve(process.argv[3] || './raw/neutra.png');
const outDir = resolve(process.argv[4] || './raw/grafted');

const { mkdirSync } = await import('node:fs');
mkdirSync(outDir, { recursive: true });

const meta = await sharp(basePath).metadata();
const W = meta.width;
const H = meta.height;
const base = await sharp(basePath).ensureAlpha().raw().toBuffer();

/** Janela generosa em volta da boca, em pixels da base. */
const WINDOW = { left: 380, top: 300, width: 300, height: 260 };
/** Faixa da janela usada só para alinhar; não recebe transplante. */
const FRAME = 34;

console.log(`\n  base ${W}×${H}  ·  janela ${WINDOW.width}×${WINDOW.height} em ${WINDOW.left},${WINDOW.top}`);

const files = readdirSync(mouthDir).filter(f => f.toLowerCase().endsWith('.png')).sort();
if (!files.length) {
  console.error(`\n  nenhum PNG em ${mouthDir}\n`);
  process.exit(1);
}

const lum = (buf, i) => 0.2126 * buf[i * 4] + 0.7152 * buf[i * 4 + 1] + 0.0722 * buf[i * 4 + 2];

for (const file of files) {
  const frame = await sharp(join(mouthDir, file)).ensureAlpha().raw().toBuffer();

  // -------------------------------------------------------------------------
  // 1. Alinhamento por translação, medido só na moldura
  // -------------------------------------------------------------------------

  let best = { error: Infinity, dx: 0, dy: 0 };
  for (let dy = -26; dy <= 26; dy++) {
    for (let dx = -26; dx <= 26; dx++) {
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
          if (fx < 0 || fy < 0 || fx >= W || fy >= H) continue;
          const d = lum(base, by * W + bx) - lum(frame, fy * W + fx);
          acc += d * d;
          n++;
        }
      }
      if (!n) continue;
      acc /= n;
      if (acc < best.error) best = { error: acc, dx, dy };
    }
  }

  // -------------------------------------------------------------------------
  // 2. Máscara: onde o frame alinhado difere da base
  // -------------------------------------------------------------------------

  const w = WINDOW.width;
  const h = WINDOW.height;
  const inside = new Uint8Array(w * h);

  for (let y = FRAME; y < h - FRAME; y++) {
    for (let x = FRAME; x < w - FRAME; x++) {
      const bx = WINDOW.left + x;
      const by = WINDOW.top + y;
      const fx = bx + best.dx;
      const fy = by + best.dy;
      if (fx < 1 || fy < 1 || fx >= W - 1 || fy >= H - 1) continue;
      const bi = (by * W + bx) * 4;
      const fi = (fy * W + fx) * 4;
      const delta =
        Math.abs(base[bi] - frame[fi]) +
        Math.abs(base[bi + 1] - frame[fi + 1]) +
        Math.abs(base[bi + 2] - frame[fi + 2]);
      if (delta > 34) inside[y * w + x] = 1;
    }
  }

  /**
   * Fecha e engorda a região: o interesse é a boca como um bloco, não os
   * pixels avulsos que a diferença de ruído produz. Sem fechar, o Poisson
   * recebe uma região esburacada e resolve cada buraco separadamente.
   */
  const grow = (bits, radius) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = 0;
        for (let d = -radius; d <= radius && !hit; d++) {
          const nx = x + d;
          if (nx >= 0 && nx < w && bits[y * w + nx]) hit = 1;
        }
        out[y * w + x] = hit;
      }
    }
    const out2 = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = 0;
        for (let d = -radius; d <= radius && !hit; d++) {
          const ny = y + d;
          if (ny >= 0 && ny < h && out[ny * w + x]) hit = 1;
        }
        out2[y * w + x] = hit;
      }
    }
    return out2;
  };
  const shrink = (bits, radius) => {
    const inv = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) inv[i] = bits[i] ? 0 : 1;
    const g = grow(inv, radius);
    const out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = g[i] ? 0 : 1;
    return out;
  };

  let region = shrink(grow(inside, 9), 9);
  region = grow(region, 10);

  // não deixa encostar na moldura: o Poisson precisa de borda de base
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < FRAME || x >= w - FRAME || y < FRAME || y >= h - FRAME) region[y * w + x] = 0;
    }
  }

  let count = 0;
  for (let i = 0; i < w * h; i++) if (region[i]) count++;

  if (count < 400) {
    console.log(`    ${basename(file).padEnd(16)} região vazia — pulado`);
    continue;
  }

  // -------------------------------------------------------------------------
  // 3. Poisson: copia o gradiente, deixa a borda ditar a cor
  // -------------------------------------------------------------------------

  const out = Buffer.from(base);

  for (let c = 0; c < 3; c++) {
    const value = new Float64Array(w * h);
    const divergence = new Float64Array(w * h);

    const baseAt = (x, y) => base[((WINDOW.top + y) * W + WINDOW.left + x) * 4 + c];
    const frameAt = (x, y) => {
      const fx = WINDOW.left + x + best.dx;
      const fy = WINDOW.top + y + best.dy;
      return frame[(fy * W + fx) * 4 + c];
    };

    for (let i = 0; i < w * h; i++) value[i] = baseAt(i % w, (i / w) | 0);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (!region[y * w + x]) continue;
        divergence[y * w + x] =
          4 * frameAt(x, y) -
          frameAt(x - 1, y) - frameAt(x + 1, y) -
          frameAt(x, y - 1) - frameAt(x, y + 1);
      }
    }

    // Gauss-Seidel com sobre-relaxação. 420 passadas levam o resíduo a menos de
    // um nível de cor numa região deste tamanho.
    const omega = 1.9;
    for (let pass = 0; pass < 420; pass++) {
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

  console.log(`    ${basename(file).padEnd(16)} desloc ${String(best.dx).padStart(3)},${String(best.dy).padStart(3)}  ·  ${count} px transplantados`);
}

console.log('');
