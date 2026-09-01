#!/usr/bin/env node
/**
 * Regenera as máscaras de camiseta e de gola/punhos a partir da base.
 *
 *   node scripts/build-shirt-masks.mjs public/funcionaria/avatar-packs/raw/option-2
 *
 * Escreve shirt-mask.png e shirt-detail-mask.png na mesma pasta.
 *
 * Por que não dá para segmentar só por cor: o cordão do crachá corta a camiseta
 * em duas, e a sombra dos ombros escurece o cinza o bastante para cair fora de
 * qualquer limiar razoável. O resultado é a camiseta com ombros e barra de fora
 * — exatamente o buraco que aparece quando a cor é aplicada.
 *
 * A saída aqui é: classificar por cor, ficar só com o componente conectado do
 * torso, e então FECHAR a máscara morfologicamente. O fechamento engole o
 * cordão e as sombras finas sem engolir o cabelo, que é grande demais para ser
 * preenchido.
 *
 * O cordão preto voltar para dentro da máscara não é problema: a camada de cor
 * usa mix-blend-mode:color, que preserva a luminância. Preto continua preto.
 * O crachá, que é claro, precisa ficar de fora — daí o corte por luminância
 * alta.
 */

import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import sharp from 'sharp';

const dir = resolve(process.argv[2] || '.');

/**
 * Retângulo do crachá, em pixels da base, com margem. Precisa espelhar o
 * badgeRect de lib/funcionaria-avatar-options.ts, engordado o bastante para
 * pegar a moldura preta em volta da janela branca.
 *
 * Sem isso, a moldura — escura e neutra — passava na regra de gola e punhos e
 * recebia a cor de detalhe: era a "silhueta do recorte" que aparecia em volta
 * do crachá.
 */
const BADGE_EXCLUDE = {
  'option-1': { left: 600, top: 1560, width: 205, height: 300 },
  'option-2': { left: 592, top: 1665, width: 210, height: 305 },
  'option-3': { left: 620, top: 1660, width: 210, height: 315 },
};
const basePath = join(dir, 'base.png');

if (!existsSync(basePath)) {
  console.error(`\n  base.png não encontrada em ${dir}\n`);
  process.exit(1);
}

const meta = await sharp(basePath).metadata();
const W = meta.width;
const H = meta.height;
const rgba = await sharp(basePath).ensureAlpha().raw().toBuffer();
const N = W * H;

console.log(`\n  ${basename(dir)}  ·  ${W}×${H}`);

// ---------------------------------------------------------------------------
// 1. Classificação por cor
// ---------------------------------------------------------------------------

const SAT_MAX = 0.24;   // camiseta é cinza; pele e cabelo castanho são saturados
const LUM_MIN = 78;     // abaixo disso é cordão, cabelo escuro ou sombra dura
const LUM_MAX = 218;    // acima disso é o crachá branco

const candidate = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const p = i * 4;
  if (rgba[p + 3] < 128) continue;

  const r = rgba[p], g = rgba[p + 1], b = rgba[p + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  if (sat < SAT_MAX && value > LUM_MIN && value < LUM_MAX) candidate[i] = 1;
}

// ---------------------------------------------------------------------------
// 2. Componente conectado do torso
// ---------------------------------------------------------------------------

/**
 * Rotula todos os componentes conectados e mantém os que são grandes e ficam na
 * metade de baixo. Flood a partir de sementes no torso não serve: o cabelo cai
 * sobre os ombros e corta as mangas do corpo da camiseta, e elas ficavam de
 * fora — o buraco cinza que aparecia nos ombros.
 */
const mask = new Uint8Array(N);
const labelStack = [];
const seen = new Uint8Array(N);
let kept = 0;
let parts = 0;

for (let start = 0; start < N; start++) {
  if (seen[start] || !candidate[start]) continue;

  const pixels = [];
  labelStack.push(start);
  seen[start] = 1;

  while (labelStack.length) {
    const i = labelStack.pop();
    pixels.push(i);
    const x = i % W;
    const y = (i / W) | 0;
    if (x > 0 && candidate[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; labelStack.push(i - 1); }
    if (x < W - 1 && candidate[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; labelStack.push(i + 1); }
    if (y > 0 && candidate[i - W] && !seen[i - W]) { seen[i - W] = 1; labelStack.push(i - W); }
    if (y < H - 1 && candidate[i + W] && !seen[i + W]) { seen[i + W] = 1; labelStack.push(i + W); }
  }

  if (pixels.length < N * 0.004) continue;
  let sumY = 0;
  for (const i of pixels) sumY += (i / W) | 0;
  if (sumY / pixels.length < H * 0.34) continue;

  for (const i of pixels) mask[i] = 1;
  kept += pixels.length;
  parts++;
}

if (!kept) {
  console.error('  nenhum componente de camiseta encontrado — confira SAT_MAX e LUM_MIN\n');
  process.exit(1);
}

console.log(`  ${parts} regiões de camiseta  ·  ${kept} pixels`);

// ---------------------------------------------------------------------------
// 3. Fechamento morfológico — engole o cordão sem engolir o cabelo
// ---------------------------------------------------------------------------

/** Dilatação/erosão separável, aproximada por distância de Chebyshev. */
function morph(src, radius, grow) {
  const out = new Uint8Array(N);
  const tmp = new Uint8Array(N);
  const want = grow ? 1 : 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let hit = grow ? 0 : 1;
      for (let d = -radius; d <= radius; d++) {
        const nx = x + d;
        if (nx < 0 || nx >= W) continue;
        if (src[y * W + nx] === want) { hit = want; break; }
      }
      tmp[y * W + x] = hit;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let hit = grow ? 0 : 1;
      for (let d = -radius; d <= radius; d++) {
        const ny = y + d;
        if (ny < 0 || ny >= H) continue;
        if (tmp[ny * W + x] === want) { hit = want; break; }
      }
      out[y * W + x] = hit;
    }
  }
  return out;
}

const closeRadius = Math.max(6, Math.round(W * 0.012));
let shirt = morph(morph(mask, closeRadius, true), closeRadius, false);

// o fechamento pode vazar da silhueta; recorta de volta
for (let i = 0; i < N; i++) if (rgba[i * 4 + 3] < 128) shirt[i] = 0;

// O fechamento engole mechas de cabelo que caem sobre o ombro junto com o
// cordão. O cordão é neutro e pode ficar (luminância baixa continua preta sob
// mix-blend-mode:color); cabelo castanho é saturado e viraria mecha colorida.
// Filtro de saturação separa os dois.
let strands = 0;
for (let i = 0; i < N; i++) {
  if (!shirt[i]) continue;
  const p = i * 4;
  const r = rgba[p], g = rgba[p + 1], b = rgba[p + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (value > 212 || sat > 0.30) { shirt[i] = 0; strands++; }
}
console.log(`  cabelo e realces removidos: ${strands} pixels`);

console.log(`  fechamento raio ${closeRadius}px  ·  pixels finais: ${shirt.reduce((a, b) => a + b, 0)}`);

// ---------------------------------------------------------------------------
// 4. Crachá fora das duas máscaras
// ---------------------------------------------------------------------------

const bright = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  if (!shirt[i]) continue;
  const p = i * 4;
  const r = rgba[p], g = rgba[p + 1], b = rgba[p + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (value > 190 && sat < 0.22) bright[i] = 1;
}
const badge = morph(morph(bright, 4, true), 3, false);
let badgeCount = 0;
for (let i = 0; i < N; i++) if (badge[i]) { shirt[i] = 0; badgeCount++; }
console.log(`  crachá removido por luminância: ${badgeCount} pixels`);

const excludeRect = BADGE_EXCLUDE[basename(dir)];
if (excludeRect) {
  let cleared = 0;
  for (let y = excludeRect.top; y < excludeRect.top + excludeRect.height; y++) {
    for (let x = excludeRect.left; x < excludeRect.left + excludeRect.width; x++) {
      if (y < 0 || y >= H || x < 0 || x >= W) continue;
      const i = y * W + x;
      const p = i * 4;
      const value = 0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2];
      // só o crachá em si: a camiseta ao redor dele continua colorindo
      if (value < 96 || value > 175) { shirt[i] = 0; cleared++; }
    }
  }
  console.log(`  moldura do crachá removida: ${cleared} pixels`);
}

// ---------------------------------------------------------------------------
// 5. Gola e punhos
//
// O trim é escuro demais para passar em LUM_MIN, então ele nunca esteve em
// `candidate` — quem o trouxe para dentro foi o fechamento morfológico. Ou
// seja: gola e punhos são exatamente os pixels escuros que estão dentro da
// máscara fechada. Procurar "borda mais escura que a mediana" pegava sombra de
// dobra junto e espalhava verde pela silhueta inteira.
// ---------------------------------------------------------------------------

const detail = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  if (!shirt[i]) continue;
  const p = i * 4;
  const r = rgba[p], g = rgba[p + 1], b = rgba[p + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (value < LUM_MIN && sat < 0.25) detail[i] = 1;
}

/**
 * Mechas de cabelo escuro que caíram sobre o ombro sobrevivem ao filtro de
 * saturação quando estão em sombra, e viravam riscos coloridos no ombro e no
 * braço. Gola e punhos são regiões grandes e contíguas; mecha é pequena. Corte
 * por área resolve o que o corte por cor não pegou.
 */
const MIN_DETAIL_AREA = Math.round(N * 0.0016);
{
  const visited = new Uint8Array(N);
  const queue = [];
  let dropped = 0;
  for (let start = 0; start < N; start++) {
    if (visited[start] || !detail[start]) continue;
    const group = [];
    queue.push(start);
    visited[start] = 1;
    while (queue.length) {
      const i = queue.pop();
      group.push(i);
      const x = i % W;
      const y = (i / W) | 0;
      if (x > 0 && detail[i - 1] && !visited[i - 1]) { visited[i - 1] = 1; queue.push(i - 1); }
      if (x < W - 1 && detail[i + 1] && !visited[i + 1]) { visited[i + 1] = 1; queue.push(i + 1); }
      if (y > 0 && detail[i - W] && !visited[i - W]) { visited[i - W] = 1; queue.push(i - W); }
      if (y < H - 1 && detail[i + W] && !visited[i + W]) { visited[i + W] = 1; queue.push(i + W); }
    }
    if (group.length < MIN_DETAIL_AREA) {
      for (const i of group) detail[i] = 0;
      dropped++;
    }
  }
  console.log(`  ${dropped} fragmentos de detalhe descartados (< ${MIN_DETAIL_AREA} px)`);
}

/**
 * Gola e punhos ficam na borda da camiseta; dobra no meio do peito, não. Sem
 * essa restrição, toda sombra profunda do tecido caía na regra de "escuro
 * dentro da máscara" e a camisa aparecia com manchas na cor de detalhe.
 */
{
  const band = Math.max(6, Math.round(W * 0.028));
  const inner = morph(shirt, band, false);
  let removed = 0;
  for (let i = 0; i < N; i++) if (inner[i] && detail[i]) { detail[i] = 0; removed++; }
  console.log(`  sombras internas fora do detalhe: ${removed} pixels (banda ${band}px)`);
}

let detailCount = 0;
for (let i = 0; i < N; i++) if (detail[i]) detailCount++;
console.log(`  gola e punhos: ${detailCount} pixels (luminância < ${LUM_MIN})`);

// ---------------------------------------------------------------------------
// 5. Grava com borda suavizada
// ---------------------------------------------------------------------------

async function write(bits, name) {
  const buf = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = 255;
    buf[i * 4 + 3] = bits[i] ? 255 : 0;
  }
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
    .blur(1.2)
    .png()
    .toFile(join(dir, name));
  console.log(`  → ${name}`);
}

await write(shirt, 'shirt-mask.png');
await write(detail, 'shirt-detail-mask.png');
console.log('');
