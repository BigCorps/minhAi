// scripts/pregenerate-tour-audio.ts
/**
 * Pré-gera todos os áudios do tour Stage 1 chamando a API local.
 * Rode UMA vez antes de ir para produção:
 *
 *   npx ts-node --project tsconfig.json scripts/pregenerate-tour-audio.ts
 *
 * Os arquivos ficam em /public/audio-cache/ e são servidos sem custo nas
 * próximas chamadas à /api/google-tts.
 */

import { STAGE1_SCRIPT } from '../lib/tour/stage1-script';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

async function generate(text: string, label: string) {
  const res = await fetch(`${BASE_URL}/api/google-tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }

  const fromCache = res.headers.get('X-Cache') === 'HIT';
  const bytes = Number(res.headers.get('Content-Length') ?? 0);
  const genTime = res.headers.get('X-Generation-Time');

  const status = fromCache
    ? '🎯 já estava em cache'
    : `✅ gerado em ${genTime}ms`;

  console.log(`  ${status} — ${label} (${(bytes / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log(`\n🚀 Pré-gerando áudios do Tour Stage 1 em ${BASE_URL}\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const scene of STAGE1_SCRIPT) {
    try {
      process.stdout.write(`  [${scene.id}] `);
      await generate(scene.audioText, scene.label);

      // Se tiver displayText diferente do audioText, não há áudio separado
      // pois o TTS sempre usa audioText. Nada a fazer.

      success++;
    } catch (err: any) {
      console.error(`  ❌ [${scene.id}] ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Resultado: ${success} gerados, ${skipped} pulados, ${failed} erros\n`);

  if (failed > 0) process.exit(1);
}

main();
