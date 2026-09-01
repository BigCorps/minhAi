#!/usr/bin/env node
/**
 * Gera todos os formatos do logo da FuncionarIA a partir de um arquivo unico.
 *
 *   node scripts/build-brand-logos.mjs ./novo-logo-funcionaria.png
 *
 * Os nomes de saida sao exatamente os que ja existem em
 * public/brands/funcionaria — nada de caminho novo, para nao quebrar manifest,
 * meta tags nem referencias no codigo.
 *
 * Cada formato tem regra propria. Copiar o mesmo arquivo redimensionado em
 * todos daria resultado errado em pelo menos tres casos:
 *
 * - **maskable**: o Android recorta o icone num circulo e corta ate 20% de cada
 *   borda. O logo precisa de margem extra ou perde as pontas.
 * - **og**: e retangular, 1200x630. O logo entra centralizado sobre fundo
 *   solido, senao a rede social preenche com preto.
 * - **favicon**: em 64px o logo circular vira uma bolinha. Vale recortar o
 *   quadro para o rosto ocupar mais area.
 */

import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const source = resolve(process.argv[2] || './novo-logo-funcionaria.png');
const outDir = resolve(process.argv[3] || 'public/brands/funcionaria');
mkdirSync(outDir, { recursive: true });

/**
 * Verde limao da marca, usado nos icones maskable.
 *
 * O roxo era a escolha obvia por ser a cor do anel do logo — e justamente por
 * isso ficava ruim: anel roxo sobre fundo roxo some, e o icone virava um rosto
 * flutuando. O limao e a cor secundaria da marca e da contraste com o anel.
 */
const BRAND = { r: 163, g: 230, b: 53, alpha: 1 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

const meta = await sharp(source).metadata();
console.log(`\n  origem  ${meta.width}×${meta.height}\n`);

/** Recorta o excesso transparente em volta do desenho. */
const trimmed = await sharp(source).trim({ threshold: 10 }).png().toBuffer();
const trimMeta = await sharp(trimmed).metadata();
console.log(`  aparado ${trimMeta.width}×${trimMeta.height}`);

/**
 * Quadrado com o logo centralizado.
 * `padding` e a fracao de folga em cada lado.
 */
async function square(size, padding, background) {
  const inner = Math.round(size * (1 - padding * 2));
  const logo = await sharp(trimmed)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const offset = Math.round((size - inner) / 2);

  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toBuffer();
}

const jobs = [
  // Transparentes: usados sobre fundo do proprio site
  { file: 'logo.png', size: 1024, padding: 0.02, bg: { r: 0, g: 0, b: 0, alpha: 0 } },
  { file: 'logo-512.png', size: 512, padding: 0.02, bg: { r: 0, g: 0, b: 0, alpha: 0 } },
  { file: 'icone-1024.png', size: 1024, padding: 0.04, bg: { r: 0, g: 0, b: 0, alpha: 0 } },
  { file: 'icone-512.png', size: 512, padding: 0.04, bg: { r: 0, g: 0, b: 0, alpha: 0 } },
  { file: 'icone-192.png', size: 192, padding: 0.04, bg: { r: 0, g: 0, b: 0, alpha: 0 } },
  { file: 'favicon.png', size: 64, padding: 0.01, bg: { r: 0, g: 0, b: 0, alpha: 0 } },

  // Fundo branco: iOS nao respeita transparencia no apple-touch-icon e
  // preenche com preto, o que deixaria o roxo do anel dentro de um quadrado
  // escuro.
  { file: 'apple-touch-icon.png', size: 180, padding: 0.06, bg: WHITE },
  { file: 'playstore-icon-512.png', size: 512, padding: 0.08, bg: WHITE },
  { file: 'splash-1024.png', size: 1024, padding: 0.28, bg: WHITE },

  // Maskable: 20% de folga em cada lado, porque o Android recorta o icone
  // num circulo e come as bordas.
  { file: 'icone-512-maskable.png', size: 512, padding: 0.2, bg: BRAND },
  { file: 'icone-192-maskable.png', size: 192, padding: 0.2, bg: BRAND },
];

for (const job of jobs) {
  const buffer = await square(job.size, job.padding, job.bg);
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(join(outDir, job.file));
  console.log(`  ${job.file.padEnd(26)} ${job.size}×${job.size}`);
}

// --- og: retangular, fundo solido -----------------------------------------

{
  const width = 1200;
  const height = 630;
  const inner = Math.round(height * 0.72);
  const logo = await sharp(trimmed)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({ create: { width, height, channels: 4, background: WHITE } })
    .composite([{ input: logo, left: Math.round((width - inner) / 2), top: Math.round((height - inner) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, 'og.png'));
  console.log(`  og.png                     ${width}×${height}`);
}

// --- favicon.ico ----------------------------------------------------------

{
  // O .ico e gravado como PNG com o nome .ico. Todo navegador atual aceita, e
  // gerar ICO de verdade exigiria uma dependencia so para isso.
  const buffer = await square(48, 0.01, { r: 0, g: 0, b: 0, alpha: 0 });
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(join(outDir, 'favicon.ico'));
  console.log('  favicon.ico                48×48');
}

console.log('');
