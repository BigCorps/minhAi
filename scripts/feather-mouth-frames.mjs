#!/usr/bin/env node
/**
 * Suaviza a costura dos frames de boca.
 *
 *   node scripts/feather-mouth-frames.mjs
 *
 * O inpainting devolve um retângulo de pixels novos colado sobre a base, com
 * transição abrupta na borda. Medindo o lote atual: a área realmente alterada é
 * de ~75×38 dentro de um recorte de 180×101, e a emenda aparece como um
 * "adesivo" nítido no meio do rosto — some quando parado, salta quando a boca
 * troca de frame.
 *
 * A correção não é redesenhar nada: é reconstruir o frame como uma mistura
 * entre base e edição, usando como alpha a própria máscara de diferença,
 * dilatada e desfocada. O miolo da edição fica intacto, e a borda derrete na
 * pele da base.
 *
 * Roda sobre os frames já entregues. Idempotente: rodar duas vezes não piora,
 * porque a segunda passada encontra a mesma área de diferença.
 */

import { existsSync, mkdirSync, cpSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve('public/funcionaria/avatar-packs');

const VISEMES = ['sil', 'PP', 'FF', 'DD', 'kk', 'SS', 'nn', 'aa', 'E', 'I', 'O', 'U'];

/** Precisa espelhar os mouthRect de lib/funcionaria-avatar-options.ts. */
const OPTIONS = [
  { id: 'option-1', mouthRect: { left: 615, top: 536, width: 180, height: 101 } },
  { id: 'option-2', mouthRect: { left: 634, top: 539, width: 180, height: 101 } },
  { id: 'option-3', mouthRect: { left: 646, top: 609, width: 184, height: 103 } },
];

const DIFF_THRESHOLD = 16; // soma das diferenças RGB que conta como "editado"
const GROW = 4;            // px de dilatação antes do desfoque
const FEATHER = 4;         // raio do desfoque só na borda, em px

/**
 * O desfoque precisa ficar restrito à borda. A primeira tentativa usava blur de
 * 8px sobre a máscara inteira e o miolo ia junto: o `aa` de boca aberta voltava
 * a parecer boca fechada, porque a área editada tem só 38px de altura e o
 * desfoque comia quase toda ela. A binarização dura entre os dois desfoques
 * mantém o centro em alpha 1 e deixa a transição só nos ~4px de fora.
 */

for (const option of OPTIONS) {
  const rect = option.mouthRect;
  const { width: w, height: h } = rect;

  const base = await sharp(join(ROOT, 'raw', option.id, 'base.png'))
    .extract(rect)
    .ensureAlpha()
    .raw()
    .toBuffer();

  const dir = join(ROOT, 'processed-v3', option.id, 'mouth');
  const backup = join(ROOT, 'processed-v3', option.id, '_mouth-original');
  if (!existsSync(backup)) {
    mkdirSync(backup, { recursive: true });
    cpSync(dir, backup, { recursive: true });
  }

  console.log(`\n  ${option.id}  ·  recorte ${w}×${h}`);

  for (const viseme of VISEMES) {
    const file = join(dir, `${viseme}.png`);
    const source = join(backup, `${viseme}.png`);

    const meta = await sharp(source).metadata();
    if (meta.width !== w || meta.height !== h) {
      console.log(`    ${viseme.padEnd(4)} IGNORADO — ${meta.width}×${meta.height}, esperado ${w}×${h}`);
      continue;
    }

    const frame = await sharp(source).ensureAlpha().raw().toBuffer();

    // máscara binária do que mudou
    const changed = new Uint8Array(w * h);
    let count = 0;
    for (let i = 0; i < w * h; i++) {
      const p = i * 4;
      const delta =
        Math.abs(base[p] - frame[p]) +
        Math.abs(base[p + 1] - frame[p + 1]) +
        Math.abs(base[p + 2] - frame[p + 2]);
      if (delta > DIFF_THRESHOLD) { changed[i] = 255; count++; }
    }

    if (!count) {
      // sil normalmente é a base sem edição: nada a suavizar
      await sharp(source).png().toFile(file);
      console.log(`    ${viseme.padEnd(4)} sem edição (frame de repouso)`);
      continue;
    }

    // dilata e desfoca para virar um alpha suave
    //
    // Feito à mão em vez de sharp.blur/linear: encadear essas duas sobre um raw
    // de 1 canal devolvia a máscara inteira zerada, e o resultado era o frame
    // virar cópia da base — todos os visemes ficavam de boca fechada. Numa
    // máscara de 180×101 o custo de fazer na unha é irrelevante e o
    // comportamento é previsível.

    const dilated = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = 0;
        for (let dy = -GROW; dy <= GROW && !hit; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -GROW; dx <= GROW; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            if (changed[ny * w + nx]) { hit = 1; break; }
          }
        }
        dilated[y * w + x] = hit;
      }
    }

    /** Box blur separável, duas passadas: aproxima gaussiana bem o bastante. */
    const boxBlur = (src, radius) => {
      const tmp = new Float32Array(w * h);
      const out = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0;
          let n = 0;
          for (let d = -radius; d <= radius; d++) {
            const nx = x + d;
            if (nx < 0 || nx >= w) continue;
            sum += src[y * w + nx];
            n++;
          }
          tmp[y * w + x] = sum / n;
        }
      }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0;
          let n = 0;
          for (let d = -radius; d <= radius; d++) {
            const ny = y + d;
            if (ny < 0 || ny >= h) continue;
            sum += tmp[ny * w + x];
            n++;
          }
          out[y * w + x] = sum / n;
        }
      }
      return out;
    };

    const soft = boxBlur(boxBlur(dilated, FEATHER), FEATHER);

    const out = Buffer.from(base);
    for (let i = 0; i < w * h; i++) {
      const a = Math.min(1, soft[i]);
      const p = i * 4;
      for (let c = 0; c < 3; c++) {
        out[p + c] = Math.round(base[p + c] * (1 - a) + frame[p + c] * a);
      }
    }

    await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(file);
    console.log(`    ${viseme.padEnd(4)} ${count} px editados, borda suavizada em ${FEATHER}px`);
  }
}

console.log('');
