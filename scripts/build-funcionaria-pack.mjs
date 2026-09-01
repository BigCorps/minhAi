#!/usr/bin/env node
/**
 * Monta o pack da FuncionarIA a partir das fotos com camiseta verde.
 *
 *   node scripts/build-funcionaria-pack.mjs ./raw
 *
 * Espera na pasta de entrada um arquivo por expressão:
 *   neutra.png  sorriso.png  sorriso-aberto.png  atenta.png
 *
 * Três decisões que este script materializa:
 *
 * 1. SEGMENTAÇÃO POR MATIZ. A camiseta é verde e a ribana é azul na foto, então
 *    separar é olhar o ângulo de matiz. Com camiseta cinza isso era impossível:
 *    o vão entre braço e tronco media luminância 105–140 e saturação 0,03,
 *    contra 139 e 0,01 da camiseta. Valores idênticos, nenhum limiar separava.
 *
 * 2. SOMBRA E REALCE EM CAMADAS SEPARADAS. A recolorização usava
 *    mix-blend-mode:color, que preserva luminância e substitui matiz — e por
 *    isso branco e preto não apareciam, já que ambos têm saturação zero. Aqui
 *    as dobras saem como duas imagens, uma de sombra preta e uma de realce
 *    branco. Sobre branco a sombra desenha o caimento; sobre preto, o realce.
 *
 * 3. CADA EXPRESSÃO TEM SUAS PRÓPRIAS CAMADAS. Testei reaproveitar a máscara da
 *    neutra nas demais: sobravam de 2 a 6 mil pixels de camiseta descobertos
 *    por expressão, o que apareceria como franja verde na borda. As fotos são
 *    gerações independentes, não inpainting, e o corpo muda o suficiente.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const EXPRESSIONS = ['neutra', 'sorriso', 'sorriso-aberto', 'atenta'];
const VISEMES = ['sil', 'PP', 'FF', 'DD', 'kk', 'SS', 'nn', 'aa', 'E', 'I', 'O', 'U'];

const rawDir = resolve(process.argv[2] || './raw');
const outDir = resolve('public/funcionaria/avatar');
mkdirSync(outDir, { recursive: true });

const webp = { quality: 90, effort: 5 };

/**
 * Fracao da altura preservada. O resto sai fora.
 *
 * A foto vai ate o quadril, e o corte reto na cintura, pousado sobre o balcao
 * do fundo, lia como se ela estivesse flutuando. Cortando na altura do umbigo,
 * o corte encosta na borda inferior do cartao e desaparece — o mesmo
 * enquadramento que uma camera de videochamada daria.
 */
const KEEP_HEIGHT = 0.86;

let source = null;
let canvas = null;
let eyesRect = null;
let badgeRect = null;

for (const expression of EXPRESSIONS) {
  const file = join(rawDir, `${expression}.png`);
  if (!existsSync(file)) {
    console.error(`\n  faltando: ${expression}.png em ${rawDir}\n`);
    process.exit(1);
  }

  const meta = await sharp(file).metadata();
  const W = meta.width;
  const H = meta.height;
  const N = W * H;
  const img = await sharp(file).ensureAlpha().raw().toBuffer();

  if (!source) source = { width: W, height: H };
  else if (source.width !== W || source.height !== H) {
    console.error(`\n  ${expression}.png tem ${W}×${H}, esperado ${source.width}×${source.height}\n`);
    process.exit(1);
  }

  console.log(`\n  ${expression}  ·  ${W}×${H}`);

  const lumAt = (i) => 0.2126 * img[i * 4] + 0.7152 * img[i * 4 + 1] + 0.0722 * img[i * 4 + 2];

  /** Ângulo de matiz em graus, ou -1 quando a cor é neutra demais para ter um. */
  const hueAt = (i) => {
    const p = i * 4;
    const r = img[p], g = img[p + 1], b = img[p + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0 || (max - min) / max < 0.15) return -1;
    const d = max - min;
    let h;
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return h * 60;
  };

  const shirt = new Uint8Array(N);
  const trim = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (img[i * 4 + 3] < 128) continue;
    const hue = hueAt(i);
    if (hue < 0) continue;
    if (hue >= 75 && hue <= 175) shirt[i] = 1;
    else if (hue >= 195 && hue <= 265) trim[i] = 1;
  }

  /**
   * Só o que é grande e contíguo. Sobram pixels isolados com matiz verde ou
   * azul em reflexo de cabelo e na borda do headset — poucos, mas o bastante
   * para o topo da camiseta ser medido lá em cima e o recorte dos olhos sair
   * no lugar errado.
   */
  function keepLargest(bits, minShare) {
    const seen = new Uint8Array(N);
    const queue = [];
    const kept = new Uint8Array(N);
    let best = null;
    for (let start = 0; start < N; start++) {
      if (seen[start] || !bits[start]) continue;
      const group = [];
      queue.push(start); seen[start] = 1;
      while (queue.length) {
        const i = queue.pop();
        group.push(i);
        const x = i % W, y = (i / W) | 0;
        if (x > 0 && bits[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; queue.push(i - 1); }
        if (x < W - 1 && bits[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; queue.push(i + 1); }
        if (y > 0 && bits[i - W] && !seen[i - W]) { seen[i - W] = 1; queue.push(i - W); }
        if (y < H - 1 && bits[i + W] && !seen[i + W]) { seen[i + W] = 1; queue.push(i + W); }
      }
      if (!best || group.length > best.length) best = group;
      if (group.length >= N * minShare) for (const i of group) kept[i] = 1;
    }
    if (best) for (const i of best) kept[i] = 1;
    return kept;
  }

  shirt.set(keepLargest(shirt, 0.02));
  trim.set(keepLargest(trim, 0.002));

  let shirtCount = 0, trimCount = 0;
  for (let i = 0; i < N; i++) { if (shirt[i]) shirtCount++; if (trim[i]) trimCount++; }
  console.log(`    camiseta ${shirtCount} px  ·  gola e punhos ${trimCount} px`);

  if (shirtCount < N * 0.05) {
    console.error('\n    quase nada reconhecido como camiseta. A foto está com camiseta verde?\n');
    process.exit(1);
  }

  function midpoint(bits) {
    const values = [];
    for (let i = 0; i < N; i++) if (bits[i]) values.push(lumAt(i));
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] || 128;
  }

  async function writeFabric(bits, prefix) {
    const mid = midpoint(bits);
    const mask = Buffer.alloc(N * 4);
    const shadow = Buffer.alloc(N * 4);
    const light = Buffer.alloc(N * 4);

    for (let i = 0; i < N; i++) {
      if (!bits[i]) continue;
      const p = i * 4;
      mask[p] = mask[p + 1] = mask[p + 2] = 255;
      mask[p + 3] = 255;

      const value = lumAt(i);
      if (value < mid) {
        // teto de 0,85: sombra cheia chapa a dobra e some com a textura
        shadow[p + 3] = Math.round(Math.min(1, (mid - value) / mid) * 0.85 * 255);
      } else {
        light[p] = light[p + 1] = light[p + 2] = 255;
        light[p + 3] = Math.round(Math.min(1, (value - mid) / (255 - mid)) * 0.75 * 255);
      }
    }

    const raw = { raw: { width: W, height: H, channels: 4 } };
    const keep = { left: 0, top: 0, width: W, height: Math.round(H * KEEP_HEIGHT) };
    await sharp(mask, raw).blur(0.8).extract(keep).webp(webp).toFile(join(outDir, `${expression}-${prefix}-mask.webp`));
    await sharp(shadow, raw).extract(keep).webp(webp).toFile(join(outDir, `${expression}-${prefix}-shadow.webp`));
    await sharp(light, raw).extract(keep).webp(webp).toFile(join(outDir, `${expression}-${prefix}-light.webp`));
  }

  await writeFabric(shirt, 'shirt');
  await writeFabric(trim, 'trim');

  /**
   * A base sai com o tecido neutralizado. Se o verde continuasse embaixo, ele
   * apareceria por qualquer folga de meio pixel na borda da máscara — e verde
   * vazando sob uma camiseta vermelha é o tipo de defeito que ninguém deixa
   * passar.
   */
  const neutral = Buffer.from(img);
  for (let i = 0; i < N; i++) {
    if (!shirt[i] && !trim[i]) continue;
    const p = i * 4;
    const value = Math.round(lumAt(i));
    neutral[p] = neutral[p + 1] = neutral[p + 2] = value;
  }
  await sharp(neutral, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: 0, top: 0, width: W, height: Math.round(H * KEEP_HEIGHT) })
    .webp(webp)
    .toFile(join(outDir, `${expression}-base.webp`));

  // --- olhos ---------------------------------------------------------------

  let top = -1, bottom = 0;
  for (let i = 0; i < N; i++) {
    if (img[i * 4 + 3] < 128) continue;
    const y = (i / W) | 0;
    if (top < 0) top = y;
    bottom = y;
  }

  let shirtTop = H, shirtBottom = 0, shirtLeft = W, shirtRight = 0;
  for (let i = 0; i < N; i++) {
    if (!shirt[i] && !trim[i]) continue;
    const x = i % W, y = (i / W) | 0;
    if (y < shirtTop) shirtTop = y;
    if (y > shirtBottom) shirtBottom = y;
    if (shirt[i]) {
      if (x < shirtLeft) shirtLeft = x;
      if (x > shirtRight) shirtRight = x;
    }
  }

  const headHeight = shirtTop - top;
  const faceWidth = headHeight * 0.72;
  const faceCenter = (() => {
    const y = Math.round(top + headHeight * 0.55);
    let a = W, b = 0;
    for (let x = 0; x < W; x++) if (img[(y * W + x) * 4 + 3] > 128) { if (x < a) a = x; b = x; }
    return (a + b) / 2;
  })();

  /**
   * O retangulo dos olhos e medido na neutra e reusado nas demais.
   *
   * Medindo por expressao, ele variava de 392 a 413 pixels de largura — a
   * silhueta muda um pouco quando ela sorri. Como o componente posiciona todos
   * os frames com um unico retangulo, essa variacao viraria desalinhamento: o
   * recorte de uma expressao seria esticado para caber no espaco de outra.
   */
  const rect = eyesRect || {
    left: Math.round(faceCenter - faceWidth * 0.5),
    top: Math.round(top + headHeight * 0.34),
    width: Math.round(faceWidth),
    height: Math.round(headHeight * 0.26),
  };

  if (!eyesRect) eyesRect = rect;

  /**
   * Frames de piscada vindos de raw/eyes-out-<expressao>/, enxertados por
   * scripts/graft-eyes.mjs.
   *
   * A versao anterior sintetizava a palpebra: espelhava a pele de baixo do olho
   * e esticava por cima da abertura. Depois de tres rodadas de ajuste ela
   * chegava na posicao certa, mas continuava lisa e sem vinco — de perto lia
   * como adesivo. Com frames reais enxertados por Poisson, os cilios e a dobra
   * da palpebra sao os de verdade.
   */
  const eyesSrcDir = join(rawDir, `eyes-out-${expression}`);
  let eyesFound = 0;

  if (existsSync(eyesSrcDir)) {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(eyesSrcDir).filter(f => f.endsWith('.png'));
    for (const [name, marker] of [['half', 'meio'], ['closed', 'fechados']]) {
      const match = files.find(f => f.includes(marker));
      if (!match) continue;

      // o tecido tambem precisa sair neutralizado nestes frames, senao o verde
      // reaparece na gola quando a palpebra desce
      const frame = await sharp(join(eyesSrcDir, match)).ensureAlpha().raw().toBuffer();
      for (let i = 0; i < N; i++) {
        if (!shirt[i] && !trim[i]) continue;
        const p = i * 4;
        const v = Math.round(0.2126 * frame[p] + 0.7152 * frame[p + 1] + 0.0722 * frame[p + 2]);
        frame[p] = frame[p + 1] = frame[p + 2] = v;
      }

      /**
       * So o que realmente mudou entra no recorte.
       *
       * Extraindo o retangulo inteiro, a piscada trocava tambem sobrancelha e
       * bochecha — medindo, eram 677 pixels de diferenca no topo do recorte e
       * 1.878 embaixo. O frame de olho vem de outra geracao e essas regioes nao
       * saem iguais, entao cada piscada alterava o rosto alem do olho e parecia
       * um terceiro estado.
       *
       * A mascara e a propria diferenca contra a base, dilatada e suavizada — o
       * mesmo tratamento que a boca ja recebia. O que e igual continua vindo da
       * base; so o olho e substituido, com transicao macia na borda.
       */
      const ew = rect.width;
      const eh = rect.height;
      const changed = new Float32Array(ew * eh);
      for (let y = 0; y < eh; y++) {
        for (let x = 0; x < ew; x++) {
          const src = ((rect.top + y) * W + rect.left + x) * 4;
          const delta =
            Math.abs(neutral[src] - frame[src]) +
            Math.abs(neutral[src + 1] - frame[src + 1]) +
            Math.abs(neutral[src + 2] - frame[src + 2]);
          if (delta > 30) changed[y * ew + x] = 1;
        }
      }

      const eyeGrow = 9;
      const dilated = new Float32Array(ew * eh);
      for (let y = 0; y < eh; y++) {
        for (let x = 0; x < ew; x++) {
          let hit = 0;
          for (let dy = -eyeGrow; dy <= eyeGrow && !hit; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= eh) continue;
            for (let dx = -eyeGrow; dx <= eyeGrow; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= ew) continue;
              if (changed[ny * ew + nx]) { hit = 1; break; }
            }
          }
          dilated[y * ew + x] = hit;
        }
      }

      const eyeBlur = (src, radius) => {
        const tmp = new Float32Array(ew * eh);
        const res = new Float32Array(ew * eh);
        for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) {
          let sum = 0, n = 0;
          for (let d = -radius; d <= radius; d++) { const nx = x + d; if (nx < 0 || nx >= ew) continue; sum += src[y * ew + nx]; n++; }
          tmp[y * ew + x] = sum / n;
        }
        for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) {
          let sum = 0, n = 0;
          for (let d = -radius; d <= radius; d++) { const ny = y + d; if (ny < 0 || ny >= eh) continue; sum += tmp[ny * ew + x]; n++; }
          res[y * ew + x] = sum / n;
        }
        return res;
      };
      /**
       * Alem da diferenca, uma faixa vertical centrada na linha dos olhos.
       *
       * So a diferenca nao basta: como o rosto inteiro foi enxertado, a
       * sobrancelha e a bochecha do frame tambem diferem da base, e a mascara
       * as incluia legitimamente. A faixa restringe a troca a altura do olho e
       * deixa o resto do rosto vindo da base, que e o que mantem a piscada
       * sendo so uma piscada.
       */
      const eyeLine = Math.round(eh * 0.66);
      const bandHalf = Math.round(eh * 0.22);
      const bandFade = Math.round(eh * 0.12);
      const band = new Float32Array(ew * eh);
      for (let y = 0; y < eh; y++) {
        const distance = Math.abs(y - eyeLine);
        let weight = 1;
        if (distance > bandHalf) {
          weight = Math.max(0, 1 - (distance - bandHalf) / bandFade);
        }
        for (let x = 0; x < ew; x++) band[y * ew + x] = weight;
      }

      const soft = eyeBlur(eyeBlur(dilated, 11), 11);
      for (let i = 0; i < ew * eh; i++) soft[i] *= band[i];

      const out = Buffer.alloc(ew * eh * 4);
      for (let y = 0; y < eh; y++) {
        for (let x = 0; x < ew; x++) {
          const i = y * ew + x;
          const src = ((rect.top + y) * W + rect.left + x) * 4;
          const a = Math.min(1, soft[i]);
          for (let c = 0; c < 3; c++) {
            out[i * 4 + c] = Math.round(neutral[src + c] * (1 - a) + frame[src + c] * a);
          }
          out[i * 4 + 3] = neutral[src + 3];
        }
      }

      await sharp(out, { raw: { width: ew, height: eh, channels: 4 } })
        .webp(webp)
        .toFile(join(outDir, `${expression}-eyes-${name}.webp`));
      eyesFound++;
    }
  }

  console.log(`    olhos: recorte ${rect.width}×${rect.height}, ${eyesFound} frames de piscada`);

  if (expression === 'neutra') {
    canvas = { width: W, height: Math.round(H * KEEP_HEIGHT) };
    const badgeWidth = Math.round((shirtRight - shirtLeft) * 0.16);
    badgeRect = {
      left: Math.round(shirtLeft + (shirtRight - shirtLeft) * 0.60),
      top: Math.round(shirtTop + (shirtBottom - shirtTop) * 0.16),
      width: badgeWidth,
      height: Math.round(badgeWidth * 1.38),
    };
  }
}

// ---------------------------------------------------------------------------
// Boca
//
// Os frames vêm de raw/mouth/, já transplantados por scripts/graft-mouths.mjs.
// O agente de imagem não consegue fazer inpainting — devolve gerações
// independentes — então a boca é enxertada por Poisson blending, que copia o
// gradiente e deixa a cor ser ditada pela borda. Depois disso os arquivos são
// idênticos à neutra fora da boca, que é o que este trecho assume.
// ---------------------------------------------------------------------------

let mouthRect = null;
const mouthDir = join(rawDir, 'mouth');
const hasMouth = VISEMES.slice(1).every(v => existsSync(join(mouthDir, `mouth-${v}.png`)));

if (!hasMouth) {
  console.log('\n  frames de boca ausentes — pack sai sem fala');
} else {
  const meta0 = await sharp(join(rawDir, 'neutra.png')).metadata();
  const W = meta0.width;
  const H = meta0.height;
  const N = W * H;
  const neutralPath = join(rawDir, 'neutra.png');
  const base = await sharp(neutralPath).ensureAlpha().raw().toBuffer();

  // a base do pack já tem o tecido neutralizado; a boca é recortada dela
  // A base do pack ja saiu cortada embaixo; para recortar a boca e preciso a
  // altura cheia, entao o tecido e neutralizado de novo aqui.
  const packBase = Buffer.from(base);
  {
    const hueOf = (i) => {
      const p = i * 4;
      const r = base[p], g = base[p + 1], b = base[p + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max === 0 || (max - min) / max < 0.15) return -1;
      const d = max - min;
      let hv;
      if (max === r) hv = ((g - b) / d + 6) % 6;
      else if (max === g) hv = (b - r) / d + 2;
      else hv = (r - g) / d + 4;
      return hv * 60;
    };
    for (let i = 0; i < N; i++) {
      if (base[i * 4 + 3] < 128) continue;
      const hv = hueOf(i);
      if (hv < 0) continue;
      if ((hv >= 75 && hv <= 175) || (hv >= 195 && hv <= 265)) {
        const p = i * 4;
        const v = Math.round(0.2126 * base[p] + 0.7152 * base[p + 1] + 0.0722 * base[p + 2]);
        packBase[p] = packBase[p + 1] = packBase[p + 2] = v;
      }
    }
  }

  // As mascaras da neutra, recalculadas em altura cheia: as que foram gravadas
  // ja saem cortadas em KEEP_HEIGHT e o recorte da boca trabalha na base
  // inteira.
  const shirtFull = new Uint8Array(N);
  const trimFull = new Uint8Array(N);
  {
    const hueOf = (i) => {
      const p = i * 4;
      const r = base[p], g = base[p + 1], b = base[p + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max === 0 || (max - min) / max < 0.15) return -1;
      const d = max - min;
      let hv;
      if (max === r) hv = ((g - b) / d + 6) % 6;
      else if (max === g) hv = (b - r) / d + 2;
      else hv = (r - g) / d + 4;
      return hv * 60;
    };
    for (let i = 0; i < N; i++) {
      if (base[i * 4 + 3] < 128) continue;
      const hv = hueOf(i);
      if (hv < 0) continue;
      if (hv >= 75 && hv <= 175) shirtFull[i] = 1;
      else if (hv >= 195 && hv <= 265) trimFull[i] = 1;
    }
  }

  const frames = { sil: base };
  let mx0 = W, mx1 = 0, my0 = H, my1 = 0;

  for (const v of VISEMES.slice(1)) {
    const buf = await sharp(join(mouthDir, `mouth-${v}.png`)).ensureAlpha().raw().toBuffer();
    frames[v] = buf;
    for (let i = 0; i < N; i++) {
      const p = i * 4;
      const delta = Math.abs(base[p] - buf[p]) + Math.abs(base[p + 1] - buf[p + 1]) + Math.abs(base[p + 2] - buf[p + 2]);
      if (delta <= 16) continue;
      const x = i % W, y = (i / W) | 0;
      if (x < mx0) mx0 = x; if (x > mx1) mx1 = x;
      if (y < my0) my0 = y; if (y > my1) my1 = y;
    }
  }

  const margin = 20;
  mouthRect = {
    left: Math.max(0, mx0 - margin),
    top: Math.max(0, my0 - margin),
    width: Math.min(W - 1, mx1 + margin) - Math.max(0, mx0 - margin) + 1,
    height: Math.min(H - 1, my1 + margin) - Math.max(0, my0 - margin) + 1,
  };
  console.log(`\n  boca: edições em x ${mx0}–${mx1} y ${my0}–${my1} → recorte ${mouthRect.width}×${mouthRect.height}`);

  const mw = mouthRect.width;
  const mh = mouthRect.height;
  const grow = 5;
  const feather = 7;

  const boxBlur = (src, radius) => {
    const tmp = new Float32Array(mw * mh);
    const res = new Float32Array(mw * mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      let s = 0, n = 0;
      for (let d = -radius; d <= radius; d++) { const nx = x + d; if (nx < 0 || nx >= mw) continue; s += src[y * mw + nx]; n++; }
      tmp[y * mw + x] = s / n;
    }
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      let s = 0, n = 0;
      for (let d = -radius; d <= radius; d++) { const ny = y + d; if (ny < 0 || ny >= mh) continue; s += tmp[ny * mw + x]; n++; }
      res[y * mw + x] = s / n;
    }
    return res;
  };

  for (const v of VISEMES) {
    const frame = frames[v];
    const changed = new Float32Array(mw * mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const src = ((mouthRect.top + y) * W + mouthRect.left + x) * 4;
      const delta = Math.abs(base[src] - frame[src]) + Math.abs(base[src + 1] - frame[src + 1]) + Math.abs(base[src + 2] - frame[src + 2]);
      if (delta > 16) changed[y * mw + x] = 1;
    }
    const dilated = new Float32Array(mw * mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      let hit = 0;
      for (let dy = -grow; dy <= grow && !hit; dy++) {
        const ny = y + dy; if (ny < 0 || ny >= mh) continue;
        for (let dx = -grow; dx <= grow; dx++) {
          const nx = x + dx; if (nx < 0 || nx >= mw) continue;
          if (changed[ny * mw + nx]) { hit = 1; break; }
        }
      }
      dilated[y * mw + x] = hit;
    }
    const soft = boxBlur(boxBlur(dilated, feather), feather);

    const out = Buffer.alloc(mw * mh * 4);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const i = y * mw + x;
      const src = ((mouthRect.top + y) * W + mouthRect.left + x) * 4;
      const a = Math.min(1, soft[i]);
      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(packBase[src + c] * (1 - a) + frame[src + c] * a);

      // Tecido fica de fora do recorte.
      //
      // O retangulo da boca alcanca a borda de cima da gola — 223 pixels dela,
      // medidos. Como o recorte e desenhado por cima das camadas de cor, essa
      // faixa aparecia com o tecido neutralizado: a gola ficava preta enquanto
      // ela falava e voltava a cor ao parar.
      const pixelIndex = (mouthRect.top + y) * W + mouthRect.left + x;
      if (shirtFull[pixelIndex] || trimFull[pixelIndex]) {
        out[i * 4 + 3] = 0;
        continue;
      }

      // O alpha vem da base, nao e forcado para 255.
      //
      // Forcando, os pixels transparentes que caem dentro do retangulo — o
      // contorno do cabelo e da orelha — viravam preto opaco. Eram 5.696 num
      // recorte de 272x232, e apareciam como um quadro escuro atras dela toda
      // vez que falava.
      out[i * 4 + 3] = packBase[src + 3];
    }
    await sharp(out, { raw: { width: mw, height: mh, channels: 4 } }).webp(webp).toFile(join(outDir, `mouth-${v}.webp`));
  }
  console.log('  12 recortes de boca gravados');
}

console.log('\n  cole em lib/funcionaria-avatar.ts:\n');
console.log(JSON.stringify({ canvas, eyesRect, mouthRect, badgeRect }, null, 2).replace(/"([a-zA-Z]+)":/g, '$1:'));
console.log('');
