// app/api/google-tts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

// /tmp é o único diretório gravável no Vercel em produção
// Em desenvolvimento, usa public/audio-cache para persistência entre deploys
const CACHE_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/audio-cache'
  : path.join(process.cwd(), 'public', 'audio-cache');

function getCacheKey(text: string, voice: string, speed: number): string {
  return crypto
    .createHash('md5')
    .update(`${text}__${voice}__${speed}`)
    .digest('hex');
}

// Retorna false se falhar — nunca lança exceção
function ensureCacheDir(): boolean {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

function readFromCache(key: string): Buffer | null {
  try {
    const filePath = path.join(CACHE_DIR, `${key}.mp3`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch {
    // cache indisponível — ignora
  }
  return null;
}

function writeToCache(key: string, buffer: Buffer): void {
  try {
    const filePath = path.join(CACHE_DIR, `${key}.mp3`);
    fs.writeFileSync(filePath, buffer);
  } catch {
    // falha silenciosa — cache é opcional
  }
}

function audioResponse(buffer: Buffer, fromCache: boolean, durationMs?: number) {
  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Cache': fromCache ? 'HIT' : 'MISS',
      ...(durationMs !== undefined && { 'X-Generation-Time': durationMs.toString() }),
      'X-Service': 'google-text-to-speech',
    },
  });
}

/**
 * POST /api/google-tts
 *
 * Sintetiza texto em áudio usando Google Text-to-Speech.
 * Cache em /tmp (Vercel) ou public/audio-cache (dev).
 * O cache é best-effort — falha silenciosa, nunca bloqueia o fluxo.
 * Body: { text: string, voice?: string, speed?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, speed } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Texto não fornecido' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Texto muito longo (máximo 5000 caracteres)' },
        { status: 400 }
      );
    }

    const resolvedVoice = voice ?? BRAZILIAN_VOICES.NEURAL_MALE;
    const resolvedSpeed = speed ?? 1.2;
    const cacheKey = getCacheKey(text, resolvedVoice, resolvedSpeed);

    // Cache — best effort, nunca bloqueia
    const cacheReady = ensureCacheDir();
    if (cacheReady) {
      const cached = readFromCache(cacheKey);
      if (cached) {
        console.log(`🎯 TTS cache HIT (${cacheKey.slice(0, 8)}…) — ${cached.length} bytes`);
        return audioResponse(cached, true);
      }
    }

    console.log('🔊 Gerando TTS:', {
      text: text.substring(0, 50) + (text.length > 50 ? '…' : ''),
      length: text.length,
      voice: resolvedVoice,
      speed: resolvedSpeed,
    });

    const startTime = Date.now();

    const audioBuffer = await synthesizeSpeech({
      text,
      voiceName: resolvedVoice,
      speakingRate: resolvedSpeed,
      audioEncoding: 'MP3',
    });

    const duration = Date.now() - startTime;
    console.log(`✅ TTS gerado em ${duration}ms (${audioBuffer.length} bytes)`);

    // Persiste no cache se disponível
    if (cacheReady) {
      writeToCache(cacheKey, audioBuffer as Buffer);
    }

    return audioResponse(audioBuffer as Buffer, false, duration);

  } catch (error: any) {
    console.error('❌ Erro Google TTS:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar áudio', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/google-tts?text=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get('text');

    if (!text) {
      return NextResponse.json(
        { error: 'Texto não fornecido (use ?text=...)' },
        { status: 400 }
      );
    }

    const resolvedVoice = BRAZILIAN_VOICES.NEURAL_MALE;
    const resolvedSpeed = 1.2;
    const cacheKey = getCacheKey(text, resolvedVoice, resolvedSpeed);

    const cacheReady = ensureCacheDir();
    if (cacheReady) {
      const cached = readFromCache(cacheKey);
      if (cached) {
        console.log(`🎯 TTS cache HIT (GET) — ${cacheKey.slice(0, 8)}…`);
        return audioResponse(cached, true);
      }
    }

    const audioBuffer = await synthesizeSpeech({
      text,
      voiceName: resolvedVoice,
      speakingRate: resolvedSpeed,
      audioEncoding: 'MP3',
    });

    if (cacheReady) {
      writeToCache(cacheKey, audioBuffer as Buffer);
    }

    return audioResponse(audioBuffer as Buffer, false);

  } catch (error: any) {
    console.error('❌ Erro Google TTS (GET):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
