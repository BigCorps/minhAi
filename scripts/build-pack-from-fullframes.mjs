#!/usr/bin/env node
/**
 * Constrói um pack completo a partir dos 12 frames em tamanho cheio.
 *
 *   node scripts/build-pack-from-fullframes.mjs option-1 ./raw/piloto
 *
 * Espera na pasta de entrada, todos em 1400×2020 e sem recorte:
 *
 *   base.png  mouth-PP.png  mouth-FF.png  mouth-DD.png  mouth-kk.png
 *   mouth-SS.png  mouth-nn.png  mouth-aa.png  mouth-E.png  mouth-I.png
 *   mouth-O.png  mouth-U.png
 *
 * Faz tudo o que antes estava espalhado em quatro scripts e um punhado de
 * coordenadas escritas à mão:
 *
 *   1. remove o fundo liso
 *   2. descobre sozinho onde a boca foi editada e define o recorte
 *   3. recorta os 12 visemes e suaviza a borda da edição
 *   4. gera as máscaras de camiseta e de gola/punhos
 *   5. sintetiza os frames de piscada
 *   6. imprime a entrada pronta para lib/funcionaria-avatar-options.ts
 *
 * A mudança que faz isso funcionar é a segunda: nenhuma coordenada de boca é
 * informada. Ela é medida comparando cada frame com a base. Coordenada errada
 * e recorte curto demais foram os dois defeitos das rodadas anteriores, e os
 * dois deixam de existir quando ninguém precisa digitá-las.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const VISEMES = ['sil', 'PP', 'FF', 'DD', 'kk', 'SS', 'nn', 'aa', 'E', 'I', 'O', 'U'];

const packId = process.argv[2];
const rawDir = resolve(process.argv[3] || '.');

if (!packId) {
  console.error('\n  uso: node scripts/build-pack-from-fullframes.mjs <id> <pastaBruta>\n');
  process.exit(1);
}

const outRoot = resolve('public/funcionaria/avatar-packs');
const outRaw = join(outRoot, 'raw', packId);
const outProcessed = join(outRoot, 'processed-v3', packId);

for (const dir of [outRaw, join(outProcessed, 'mouth'), join(outProcessed, 'eyes'), join(outProcessed, 'masks')]) {
  mkdirSync(dir, { recursive: true });
}

const basePath = join(rawDir, 'base.png');
if (!existsSync(basePath)) {
  console.error(`\n  base.png não encontrada em ${rawDir}\n`);
  process.exit(1);
}

const meta = await sharp(basePath).metadata();
const W = meta.width;
const H = meta.height;
const N = W * H;
const baseRGB = await sharp(basePath).removeAlpha().raw().toBuffer();

console.log(`\n  pack "${packId}"  ·  ${W}×${H}`);

const lumAt = (buf, i) => 0.2126 * buf[i * 3] + 0.7152 * buf[i * 3 + 1] + 0.0722 * buf[i * 3 + 2];
const satAt = (buf, i) => {
  const r = buf[i * 3], g = buf[i * 3 + 1], b = buf[i * 3 + 2];
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
};

// ---------------------------------------------------------------------------
// 1. Fundo
// ---------------------------------------------------------------------------

/**
 * Flood a partir das bordas, não limiar global. O fundo é claro e liso, mas a
 * ribana clara da camiseta e o branco do olho também são — e um limiar simples
 * abriria buracos dentro da pessoa. Partindo da borda, só sai o que está
 * ligado ao fundo de verdade.
 */
const bg = new Uint8Array(N);
const stack = [];
const isBg = (i) => lumAt(baseRGB, i) > 196 && satAt(baseRGB, i) < 0.12;

for (let x = 0; x < W; x++) {
  for (const i of [x, (H - 1) * W + x]) if (!bg[i] && isBg(i)) { bg[i] = 1; stack.push(i); }
}
for (let y = 0; y < H; y++) {
  for (const i of [y * W, y * W + W - 1]) if (!bg[i] && isBg(i)) { bg[i] = 1; stack.push(i); }
}

while (stack.length) {
  const i = stack.pop();
  const x = i % W;
  const y = (i / W) | 0;
  if (x > 0 && !bg[i - 1] && isBg(i - 1)) { bg[i - 1] = 1; stack.push(i - 1); }
  if (x < W - 1 && !bg[i + 1] && isBg(i + 1)) { bg[i + 1] = 1; stack.push(i + 1); }
  if (y > 0 && !bg[i - W] && isBg(i - W)) { bg[i - W] = 1; stack.push(i - W); }
  if (y < H - 1 && !bg[i + W] && isBg(i + W)) { bg[i + W] = 1; stack.push(i + W); }
}

/**
 * Vãos internos: o triângulo entre braço e tronco é fundo, mas está cercado
 * pela pessoa, então o flood vindo das bordas nunca chega nele. Ele sobrava
 * opaco no recorte e aparecia como mancha clara ao lado do corpo, recebendo a
 * cor da camiseta.
 *
 * O limiar aqui é 186, não 228: o fundo dentro do vão fica em sombra e não
 * chega a branco. Com 228 ele sobrava, e como sua luminância cai dentro da
 * faixa que define camiseta (até 218), a máscara o adotava — daí as duas faixas
 * claras que apareciam ao lado do tronco quando a cor era aplicada.
 *
 * Duas travas impedem que isso coma o que não deve: área mínima de 2500px e
 * apenas abaixo da linha do queixo. Sem elas, a esclera dos olhos — clara,
 * dessaturada e cercada por pele — seria lida como vão e viraria buraco.
 */
{
  /**
   * DESLIGADO. Ver LEIA-ME: vão e camiseta têm a mesma cor, então tanto o
   * limiar por saturação quanto o por R−B acabam comendo pedaço do braço na
   * transição antisserrilhada. Fica no código porque volta a ser útil quando a
   * foto tiver fundo destacável no vão.
   */
  const REMOVE_HOLES_BY_COLOR = false;
  const holeFloor = Math.round(H * 0.4);
  /**
   * Neutralidade medida por R−B, não por saturação.
   *
   * Com `sat < 0.16` a transição antisserrilhada entre braço e fundo abria um
   * caminho fino por onde o flood entrava e comia pedaço do braço. Medindo: a
   * pele tem R−B entre 99 e 121 mesmo em pleno realce, enquanto o fundo tem
   * entre 0 e 4. É uma separação muito mais larga do que a saturação oferece.
   */
  const isHole = (i) => {
    if (((i / W) | 0) <= holeFloor) return false;
    if (lumAt(baseRGB, i) < 186) return false;
    const p = i * 3;
    return Math.abs(baseRGB[p] - baseRGB[p + 2]) < 14 && Math.abs(baseRGB[p] - baseRGB[p + 1]) < 12;
  };

  const seen = new Uint8Array(N);
  const queue = [];
  let holes = 0;
  let cleared = 0;
  for (let start = 0; start < N; start++) {
    if (seen[start] || bg[start]) continue;
    if (!isHole(start)) continue;
    const group = [];
    queue.push(start); seen[start] = 1;
    while (queue.length) {
      const i = queue.pop();
      group.push(i);
      const x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0 || seen[j] || bg[j]) continue;
        if (!isHole(j)) continue;
        seen[j] = 1;
        queue.push(j);
      }
    }
    if (group.length < 1200) continue;
    if (!REMOVE_HOLES_BY_COLOR) continue;
    for (const i of group) bg[i] = 1;
    holes++;
    cleared += group.length;
  }
  if (holes) console.log(`  ${holes} vãos internos removidos (${cleared} px)`);
}

/** Meio-tom na borda: sem isso o recorte fica com serrilha dura no cabelo. */
const alpha = new Float32Array(N);
for (let i = 0; i < N; i++) alpha[i] = bg[i] ? 0 : 1;

const softAlpha = new Float32Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let sum = 0;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        sum += alpha[ny * W + nx];
        n++;
      }
    }
    softAlpha[i] = sum / n;
  }
}

const baseRGBA = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  baseRGBA[i * 4] = baseRGB[i * 3];
  baseRGBA[i * 4 + 1] = baseRGB[i * 3 + 1];
  baseRGBA[i * 4 + 2] = baseRGB[i * 3 + 2];
  baseRGBA[i * 4 + 3] = Math.round(softAlpha[i] * 255);
}

await sharp(baseRGBA, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .toFile(join(outRaw, 'base.png'));

let opaque = 0;
let top = -1, bottom = -1, left = W, right = -1;
for (let i = 0; i < N; i++) {
  if (softAlpha[i] < 0.5) continue;
  opaque++;
  const x = i % W, y = (i / W) | 0;
  if (top < 0) top = y;
  bottom = y;
  if (x < left) left = x;
  if (x > right) right = x;
}
console.log(`  fundo removido  ·  silhueta y ${top}–${bottom}  x ${left}–${right}`);

// ---------------------------------------------------------------------------
// 2. Onde a boca foi editada
// ---------------------------------------------------------------------------

const frames = {};
let mx0 = W, mx1 = -1, my0 = H, my1 = -1;

for (const viseme of VISEMES) {
  if (viseme === 'sil') { frames.sil = baseRGB; continue; }
  const file = join(rawDir, `mouth-${viseme}.png`);
  if (!existsSync(file)) {
    console.error(`\n  faltando: mouth-${viseme}.png\n`);
    process.exit(1);
  }
  const buf = await sharp(file).removeAlpha().raw().toBuffer();
  frames[viseme] = buf;

  for (let i = 0; i < N; i++) {
    const p = i * 3;
    const delta =
      Math.abs(baseRGB[p] - buf[p]) +
      Math.abs(baseRGB[p + 1] - buf[p + 1]) +
      Math.abs(baseRGB[p + 2] - buf[p + 2]);
    if (delta <= 16) continue;
    const x = i % W, y = (i / W) | 0;
    if (x < mx0) mx0 = x;
    if (x > mx1) mx1 = x;
    if (y < my0) my0 = y;
    if (y > my1) my1 = y;
  }
}

const MARGIN = 22;
const mouthRect = {
  left: Math.max(0, mx0 - MARGIN),
  top: Math.max(0, my0 - MARGIN),
  width: Math.min(W, mx1 + MARGIN) - Math.max(0, mx0 - MARGIN) + 1,
  height: Math.min(H, my1 + MARGIN) - Math.max(0, my0 - MARGIN) + 1,
};

console.log(`  edições em x ${mx0}–${mx1} y ${my0}–${my1}  →  recorte ${mouthRect.width}×${mouthRect.height} com ${MARGIN}px de margem`);

// ---------------------------------------------------------------------------
// 3. Recortes de boca, com a borda da edição derretida na base
// ---------------------------------------------------------------------------

/**
 * Proporcionais à imagem. Os valores fixos de 4px vinham de packs de 334px de
 * largura; em 1400px equivalem a menos de um quarto do desfoque, e a borda da
 * edição voltava a aparecer.
 */
/**
 * A boca sai ~7% menor que o frame original. O inpainting desenha lábios um
 * pouco maiores que os da base, e no rosto montado isso lê como boca grande
 * demais para o rosto — some quando encolhe um pouco em torno do próprio
 * centro.
 */
const DROP_NARROW_RUNS = false;
const MOUTH_SCALE = 0.88;
const GROW = Math.max(4, Math.round(W * 0.005));
const FEATHER = Math.max(4, Math.round(W * 0.006));
const mw = mouthRect.width;
const mh = mouthRect.height;
const editCenterX = (mx0 + mx1) / 2;
const editCenterY = (my0 + my1) / 2;

const boxBlur = (src, radius, w, h) => {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, n = 0;
      for (let d = -radius; d <= radius; d++) {
        const nx = x + d;
        if (nx < 0 || nx >= w) continue;
        sum += src[y * w + nx]; n++;
      }
      tmp[y * w + x] = sum / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, n = 0;
      for (let d = -radius; d <= radius; d++) {
        const ny = y + d;
        if (ny < 0 || ny >= h) continue;
        sum += tmp[ny * w + x]; n++;
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
};

for (const viseme of VISEMES) {
  const frame = frames[viseme];
  const out = Buffer.alloc(mw * mh * 4);

  const changed = new Float32Array(mw * mh);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const src = ((mouthRect.top + y) * W + mouthRect.left + x) * 3;
      const delta =
        Math.abs(baseRGB[src] - frame[src]) +
        Math.abs(baseRGB[src + 1] - frame[src + 1]) +
        Math.abs(baseRGB[src + 2] - frame[src + 2]);
      if (delta > 16) changed[y * mw + x] = 1;
    }
  }

  const dilated = new Float32Array(mw * mh);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      let hit = 0;
      for (let dy = -GROW; dy <= GROW && !hit; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= mh) continue;
        for (let dx = -GROW; dx <= GROW; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= mw) continue;
          if (changed[ny * mw + nx]) { hit = 1; break; }
        }
      }
      dilated[y * mw + x] = hit;
    }
  }

  const soft = boxBlur(boxBlur(dilated, FEATHER, mw, mh), FEATHER, mw, mh);

  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const i = y * mw + x;
      const src = ((mouthRect.top + y) * W + mouthRect.left + x);
      // A máscara é amostrada NA MESMA coordenada escalada do conteúdo.
      //
      // Antes só o conteúdo era escalado e a máscara ficava no lugar: na faixa
      // de feather, que passa dos 30px, entrava pixel vindo de 30px mais longe,
      // e queixo, bochecha e narina se deslocavam junto com a boca. Era isso
      // que fazia "parte do rosto se mover".
      const gx = mouthRect.left + x;
      const gy = mouthRect.top + y;
      const sx = editCenterX + (gx - editCenterX) / MOUTH_SCALE;
      const sy = editCenterY + (gy - editCenterY) / MOUTH_SCALE;
      const x0 = Math.max(0, Math.min(W - 2, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(H - 2, Math.floor(sy)));
      const fx = sx - x0;
      const fy = sy - y0;

      const lx = sx - mouthRect.left;
      const ly = sy - mouthRect.top;
      let a = 0;
      if (lx >= 0 && ly >= 0 && lx < mw - 1 && ly < mh - 1) {
        const lx0 = Math.floor(lx);
        const ly0 = Math.floor(ly);
        const gxf = lx - lx0;
        const gyf = ly - ly0;
        a = Math.min(1,
          soft[ly0 * mw + lx0] * (1 - gxf) * (1 - gyf) +
          soft[ly0 * mw + lx0 + 1] * gxf * (1 - gyf) +
          soft[(ly0 + 1) * mw + lx0] * (1 - gxf) * gyf +
          soft[(ly0 + 1) * mw + lx0 + 1] * gxf * gyf);
      }

      for (let c = 0; c < 3; c++) {
        const p00 = frame[(y0 * W + x0) * 3 + c];
        const p10 = frame[(y0 * W + x0 + 1) * 3 + c];
        const p01 = frame[((y0 + 1) * W + x0) * 3 + c];
        const p11 = frame[((y0 + 1) * W + x0 + 1) * 3 + c];
        const value =
          p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) +
          p01 * (1 - fx) * fy + p11 * fx * fy;
        out[i * 4 + c] = Math.round(baseRGB[src * 3 + c] * (1 - a) + value * a);
      }
      out[i * 4 + 3] = 255;
    }
  }

  await sharp(out, { raw: { width: mw, height: mh, channels: 4 } })
    .png()
    .toFile(join(outProcessed, 'mouth', `${viseme}.png`));
}
console.log(`  12 recortes de boca gravados`);

// ---------------------------------------------------------------------------
// 4. Máscaras de camiseta
// ---------------------------------------------------------------------------

const SAT_MAX = 0.24;
const LUM_MIN = 78;
const LUM_MAX = 218;

/**
 * `softAlpha > 0.92`, não 0.5. Na borda da silhueta o alpha é meio-tom e a cor
 * ali é mistura de pessoa com fundo claro — cinza médio e dessaturado, ou seja,
 * exatamente a assinatura da camiseta. Isso criava um halo de máscara contornando
 * cabelo e headset, e o halo, ao ser dilatado na busca da ribana, alcançava o
 * headset inteiro e o pintava.
 */
const candidate = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  if (softAlpha[i] < 0.92) continue;
  const value = lumAt(baseRGB, i);
  if (satAt(baseRGB, i) < SAT_MAX && value > LUM_MIN && value < LUM_MAX) candidate[i] = 1;
}

const shirtSeed = new Uint8Array(N);
{
  const seen = new Uint8Array(N);
  const queue = [];
  for (let start = 0; start < N; start++) {
    if (seen[start] || !candidate[start]) continue;
    const group = [];
    queue.push(start); seen[start] = 1;
    while (queue.length) {
      const i = queue.pop();
      group.push(i);
      const x = i % W, y = (i / W) | 0;
      if (x > 0 && candidate[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; queue.push(i - 1); }
      if (x < W - 1 && candidate[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; queue.push(i + 1); }
      if (y > 0 && candidate[i - W] && !seen[i - W]) { seen[i - W] = 1; queue.push(i - W); }
      if (y < H - 1 && candidate[i + W] && !seen[i + W]) { seen[i + W] = 1; queue.push(i + W); }
    }
    if (group.length < N * 0.004) continue;
    let sumY = 0;
    for (const i of group) sumY += (i / W) | 0;
    if (sumY / group.length < H * 0.34) continue;
    for (const i of group) shirtSeed[i] = 1;
  }
}

function morph(src, radius, grow) {
  const want = grow ? 1 : 0;
  const tmp = new Uint8Array(N);
  const out = new Uint8Array(N);
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

/**
 * Sem cordão de crachá na foto, o fechamento pode ser bem menor do que os 17px
 * que as fotos anteriores exigiam — ele existia só para costurar as duas
 * metades da camiseta que o cordão separava. Menor significa menos chance de
 * engolir o que não é camiseta.
 */
const closeRadius = Math.max(3, Math.round(W * 0.004));
let shirt = morph(morph(shirtSeed, closeRadius, true), closeRadius, false);

for (let i = 0; i < N; i++) {
  if (!shirt[i]) continue;
  if (softAlpha[i] < 0.92) { shirt[i] = 0; continue; }
  if (lumAt(baseRGB, i) > 212 || satAt(baseRGB, i) > 0.3) shirt[i] = 0;
}

/** Só o maior componente: a camiseta é uma peça só. */
{
  const seen = new Uint8Array(N);
  const queue = [];
  let best = null;
  for (let start = 0; start < N; start++) {
    if (seen[start] || !shirt[start]) continue;
    const group = [];
    queue.push(start); seen[start] = 1;
    while (queue.length) {
      const i = queue.pop();
      group.push(i);
      const x = i % W, y = (i / W) | 0;
      if (x > 0 && shirt[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; queue.push(i - 1); }
      if (x < W - 1 && shirt[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; queue.push(i + 1); }
      if (y > 0 && shirt[i - W] && !seen[i - W]) { seen[i - W] = 1; queue.push(i - W); }
      if (y < H - 1 && shirt[i + W] && !seen[i + W]) { seen[i + W] = 1; queue.push(i + W); }
    }
    if (!best || group.length > best.length) best = group;
  }
  const kept = new Uint8Array(N);
  for (const i of best) kept[i] = 1;
  shirt = kept;
}

let shirtTop = H, shirtBottom = 0;
for (let i = 0; i < N; i++) {
  if (!shirt[i]) continue;
  const y = (i / W) | 0;
  if (y < shirtTop) shirtTop = y;
  if (y > shirtBottom) shirtBottom = y;
}

/**
 * Descarta blocos estreitos linha por linha.
 *
 * O vão entre braço e tronco tem luminância 105–140 e saturação 0,03 — os
 * mesmos números da camiseta, que mede 139 e 0,01. Nenhum critério de cor
 * consegue separar os dois, e foi por isso que o vão continuava sendo adotado
 * como tecido.
 *
 * A geometria separa: na altura em que os braços já estão nus, cada linha
 * atravessa um tronco largo e, no máximo, dois vãos estreitos. Manter só o
 * bloco contíguo dominante resolve sem depender de cor nenhuma.
 *
 * DESLIGADO. Nas laterais baixas do tronco a camiseta legitimamente aparece
 * como blocos separados, com o braço passando na frente, e o descarte comia
 * esses blocos — as manchas cinza que apareceram nas laterais.
 *
 * Como o vão saindo da máscara também libera os punhos — que antes ficavam
 * cercados por "camiseta" acima e abaixo e eram engolidos pelo preenchimento de
 * buracos — isso tem que rodar antes do preenchimento.
 */
if (DROP_NARROW_RUNS) {
  const from = shirtTop + Math.round((shirtBottom - shirtTop) * 0.4);
  let dropped = 0;
  for (let y = from; y <= shirtBottom; y++) {
    const runs = [];
    let start = -1;
    for (let x = 0; x <= W; x++) {
      const on = x < W && shirt[y * W + x] === 1;
      if (on && start < 0) start = x;
      if (!on && start >= 0) { runs.push([start, x - 1]); start = -1; }
    }
    if (runs.length < 2) continue;
    const widest = Math.max(...runs.map(([a, b]) => b - a + 1));
    for (const [a, b] of runs) {
      if (b - a + 1 >= widest * 0.25) continue;
      for (let x = a; x <= b; x++) { shirt[y * W + x] = 0; dropped++; }
    }
  }
  if (dropped) console.log(`  blocos estreitos descartados: ${dropped} px`);
}

/**
 * Preenche buracos: qualquer região não-camiseta que não alcance a borda da
 * imagem está cercada por camiseta e é sombra profunda ou vinco, não outro
 * objeto. Sem isso, as dobras mais escuras ficavam de fora da máscara e
 * apareciam como manchas cinza no meio da camiseta colorida — que lidas de
 * longe pareciam "sombra com a cor errada", quando na verdade eram sombra
 * sem cor nenhuma.
 */
{
  const outside = new Uint8Array(N);
  const queue = [];
  const push = (i) => { if (!outside[i] && !shirt[i]) { outside[i] = 1; queue.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (queue.length) {
    const i = queue.pop();
    const x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }
  let filled = 0;
  for (let i = 0; i < N; i++) {
    if (shirt[i] || outside[i]) continue;
    if (softAlpha[i] < 0.5) continue;
    shirt[i] = 1;
    filled++;
  }
  if (filled) console.log(`  buracos de sombra preenchidos: ${filled} px`);
}


/**
 * A ribana é procurada FORA da máscara de camiseta, na faixa imediatamente ao
 * redor dela.
 *
 * Antes ela era "o que é escuro dentro da máscara", o que só funcionava porque
 * o fechamento morfológico de 17px — necessário para costurar as duas metades
 * que o cordão do crachá separava — acabava engolindo a ribana junto. Sem
 * cordão na foto o fechamento caiu para 6px, a ribana deixou de ser engolida e
 * a máscara de detalhe saiu vazia. Procurar na vizinhança não depende desse
 * efeito colateral.
 */
/**
 * A ribana é o escuro que faz fronteira com PELE.
 *
 * "Escuro e perto da camiseta" pegava junto as dobras de sombra do peito. Mas
 * gola e punhos têm uma propriedade que sombra não tem: a gola encosta no
 * pescoço, os punhos encostam no braço. Sombra interna é cercada por tecido dos
 * quatro lados.
 */
const detail = new Uint8Array(N);
{
  const skin = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (softAlpha[i] < 0.92) continue;
    const value = lumAt(baseRGB, i);
    if (satAt(baseRGB, i) > 0.3 && value > 90 && value < 235) skin[i] = 1;
  }

  const reach = Math.max(8, Math.round(W * 0.018));
  const nearShirt = morph(shirt, reach, true);
  const nearSkin = morph(skin, reach, true);

  for (let i = 0; i < N; i++) {
    if (shirt[i] || !nearShirt[i] || !nearSkin[i]) continue;
    if (softAlpha[i] < 0.92) continue;
    const y = (i / W) | 0;
    // 0,82 e não 0,62: nesta pose a manga curta desce até 62% da altura da
    // peça, e o corte antigo caía exatamente sobre os punhos — a gola trocava
    // de cor e os punhos não. A barra fica em ~99%, então ainda sobra folga.
    if (y < shirtTop - reach || y > shirtTop + (shirtBottom - shirtTop) * 0.82) continue;
    if (lumAt(baseRGB, i) < LUM_MIN && satAt(baseRGB, i) < 0.28) detail[i] = 1;
  }
}

{
  const minArea = Math.round(N * 0.0008);
  const seen = new Uint8Array(N);
  const queue = [];
  for (let start = 0; start < N; start++) {
    if (seen[start] || !detail[start]) continue;
    const group = [];
    queue.push(start); seen[start] = 1;
    while (queue.length) {
      const i = queue.pop();
      group.push(i);
      const x = i % W, y = (i / W) | 0;
      if (x > 0 && detail[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; queue.push(i - 1); }
      if (x < W - 1 && detail[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; queue.push(i + 1); }
      if (y > 0 && detail[i - W] && !seen[i - W]) { seen[i - W] = 1; queue.push(i - W); }
      if (y < H - 1 && detail[i + W] && !seen[i + W]) { seen[i + W] = 1; queue.push(i + W); }
    }
    if (group.length < minArea) for (const i of group) detail[i] = 0;
  }
}

async function writeMask(bits, path) {
  const buf = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = 255;
    buf[i * 4 + 3] = bits[i] ? 255 : 0;
  }
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).blur(1.2).png().toFile(path);
}

await writeMask(shirt, join(outProcessed, 'masks', 'shirt.png'));
await writeMask(detail, join(outProcessed, 'masks', 'shirt-detail.png'));

let shirtCount = 0, detailCount = 0;
for (let i = 0; i < N; i++) { if (shirt[i]) shirtCount++; if (detail[i]) detailCount++; }
console.log(`  camiseta ${shirtCount} px  ·  gola e punhos ${detailCount} px  ·  fechamento ${closeRadius}px`);

// ---------------------------------------------------------------------------
// 5. Olhos
// ---------------------------------------------------------------------------

/** Cabeça: faixa da silhueta acima do ombro, onde a largura ainda é pequena. */
let headTop = top;
let eyesRect = null;
{
  const widths = [];
  for (let y = top; y < top + Math.round(H * 0.35); y++) {
    let a = -1, b = -1;
    for (let x = 0; x < W; x++) if (softAlpha[y * W + x] > 0.5) { if (a < 0) a = x; b = x; }
    widths.push({ y, a, b, w: b - a });
  }
  const headWidth = Math.max(...widths.slice(0, Math.round(widths.length * 0.6)).map(r => r.w));
  const face = widths.filter(r => r.w > headWidth * 0.55);
  const faceLeft = Math.min(...face.map(r => r.a));
  const faceRight = Math.max(...face.map(r => r.b));

  // olhos ficam no terço superior da cabeça, contando do topo do crânio
  const headHeight = headWidth * 1.35;
  eyesRect = {
    left: Math.round(faceLeft + (faceRight - faceLeft) * 0.16),
    top: Math.round(headTop + headHeight * 0.30),
    width: Math.round((faceRight - faceLeft) * 0.68),
    height: Math.round(headHeight * 0.26),
  };
}

const eyeCrop = await sharp(basePath).extract(eyesRect).removeAlpha().raw().toBuffer();
{
  const w = eyesRect.width, h = eyesRect.height;
  const rowLight = new Float64Array(h);
  const skipBrow = Math.round(h * 0.3);
  for (let y = skipBrow; y < h; y++) {
    for (let x = Math.round(w * 0.2); x < Math.round(w * 0.8); x++) {
      const p = (y * w + x) * 3;
      const r = eyeCrop[p], g = eyeCrop[p + 1], b = eyeCrop[p + 2];
      const max = Math.max(r, g, b);
      const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
      const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (value > 175 && sat < 0.2) rowLight[y] += 1;
    }
  }
  let peakRow = skipBrow;
  for (let y = skipBrow; y < h; y++) if (rowLight[y] > rowLight[peakRow]) peakRow = y;

  const rx = w * 0.12;
  const ry = rx * 0.38;
  const cy = eyesRect.top + peakRow;
  const eyes = [
    { cx: eyesRect.left + w * 0.27, cy, rx, ry },
    { cx: eyesRect.left + w * 0.73, cy, rx, ry },
  ];

  console.log(`  olhos: recorte ${w}×${h}, linha em ${(peakRow / h * 100).toFixed(0)}% do recorte`);

  function drape(target, eye, closeAmount) {
    const { cx, cy, rx, ry } = eye;
    const lidHeight = Math.max(6, Math.round(ry * 1.5));
    for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
      if (x < 1 || x >= W - 1) continue;
      const norm = (x - cx) / rx;
      const halfHeight = ry * Math.sqrt(Math.max(0, 1 - norm * norm));
      if (halfHeight < 1) continue;
      const t0 = cy - halfHeight;
      const b0 = cy + halfHeight;
      const lidBottom = t0 + (b0 - t0) * closeAmount;
      const near = Math.min(1, (1 - Math.abs(norm)) / 0.3);
      const edge = near * near * (3 - 2 * near);

      for (let y = Math.floor(t0) - 1; y <= Math.ceil(lidBottom) + 1; y++) {
        if (y < 1 || y >= H - 1 || y > lidBottom + 1) continue;
        const t = Math.max(0, Math.min(1, (y - t0) / Math.max(0.001, lidBottom - t0)));
        const sourceY = Math.round(b0 + 6 + (1 - t) * lidHeight);
        if (sourceY >= H - 1) continue;
        const src = (sourceY * W + x) * 4;
        const dst = (y * W + x) * 4;
        const crease = t < 0.3 ? 0.93 + t * 0.23 : 1;
        const toEdge = (lidBottom - y) / Math.max(1, lidBottom - t0);
        const lash = toEdge < 0.18 ? 0.44 + Math.max(0, toEdge) * 3.1 : 1;
        const shade = Math.min(1, crease) * Math.min(1, lash);
        const feather = Math.max(2, ry * 0.3);
        const a = edge * Math.min(1, Math.max(0, y - t0 + feather) / feather);
        for (let c = 0; c < 3; c++) {
          target[dst + c] = Math.round(target[dst + c] * (1 - a) + baseRGBA[src + c] * shade * a);
        }
      }
    }
  }

  for (const [name, amount] of [['open', 0], ['half', 0.55], ['closed', 1]]) {
    const frame = Buffer.from(baseRGBA);
    if (amount > 0) for (const eye of eyes) drape(frame, eye, amount);
    await sharp(frame, { raw: { width: W, height: H, channels: 4 } })
      .extract(eyesRect)
      .png()
      .toFile(join(outProcessed, 'eyes', `${name}.png`));
  }
}

// ---------------------------------------------------------------------------
// 6. Configuração
// ---------------------------------------------------------------------------

/** Crachá desenhado por software: fica no peito, abaixo da gola, à esquerda. */
/**
 * Crachá logo abaixo da gola, no lado esquerdo do peito de quem olha —
 * onde ficaria preso por clipe. Ancorado no topo da camiseta, não na
 * silhueta inteira, para não descer junto com a barra da foto.
 */
const shirtWidth = (() => {
  let a = W, b = 0;
  for (let i = 0; i < N; i++) {
    if (!shirt[i]) continue;
    const x = i % W;
    if (x < a) a = x;
    if (x > b) b = x;
  }
  return { left: a, right: b };
})();

const badgeWidth = Math.round((shirtWidth.right - shirtWidth.left) * 0.17);
const badgeRect = {
  left: Math.round(shirtWidth.left + (shirtWidth.right - shirtWidth.left) * 0.16),
  top: Math.round(shirtTop + (shirtBottom - shirtTop) * 0.20),
  width: badgeWidth,
  height: Math.round(badgeWidth * 1.4),
};

const entry = {
  id: packId,
  label: packId,
  basePath: `/funcionaria/avatar-packs/raw/${packId}`,
  canvas: { width: W, height: H },
  mouthRect,
  eyesRect,
  badgeRect,
  displayScale: 1,
};

console.log('\n  cole em FUNCIONARIA_AVATAR_OPTIONS, em lib/funcionaria-avatar-options.ts:\n');
console.log(JSON.stringify(entry, null, 2).replace(/"([a-zA-Z]+)":/g, '$1:'));
console.log('');
