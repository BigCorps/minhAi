// app/api/google-tts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

const LOCAL_CACHE_DIR = path.join(process.cwd(), 'public', 'audio-cache');
const IS_PROD = process.env.NODE_ENV === 'production';
const SUPABASE_BUCKET = 'audio-cache';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getCacheKey(text: string, voice: string, speed: number, pitch: number): string {
  return crypto
    .createHash('md5')
    .update(`${text}__${voice}__${speed}__${pitch}`)
    .digest('hex');
}

// ─── Cache local (desenvolvimento) ───────────────────────────────────────────

function ensureLocalCacheDir(): boolean {
  try {
    if (!fs.existsSync(LOCAL_CACHE_DIR)) {
      fs.mkdirSync(LOCAL_CACHE_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

function readLocalCache(key: string): Buffer | null {
  try {
    const filePath = path.join(LOCAL_CACHE_DIR, `${key}.mp3`);
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
  } catch {}
  return null;
}

function writeLocalCache(key: string, buffer: Buffer): void {
  try {
    fs.writeFileSync(path.join(LOCAL_CACHE_DIR, `${key}.mp3`), buffer);
  } catch {}
}

// ─── Cache Supabase Storage (produção) ───────────────────────────────────────

async function readSupabaseCache(key: string): Promise<Buffer | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .download(`${key}.mp3`);

    if (error || !data) return null;

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function writeSupabaseCache(key: string, buffer: Buffer): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(`${key}.mp3`, buffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });
  } catch {
    // falha silenciosa — cache é opcional
  }
}

// ─── Helpers unificados ───────────────────────────────────────────────────────

async function readCache(key: string): Promise<Buffer | null> {
  if (IS_PROD) return readSupabaseCache(key);
  ensureLocalCacheDir();
  return readLocalCache(key);
}

async function writeCache(key: string, buffer: Buffer): Promise<void> {
  if (IS_PROD) {
    await writeSupabaseCache(key, buffer);
  } else {
    ensureLocalCacheDir();
    writeLocalCache(key, buffer);
  }
}

// ─── Response ─────────────────────────────────────────────────────────────────

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

// ─── Síntese com cache ────────────────────────────────────────────────────────

async function synthesizeWithCache(
  text: string,
  voice: string,
  speed: number,
  pitch: number
): Promise<{ buffer: Buffer; fromCache: boolean; durationMs?: number }> {
  const cacheKey = getCacheKey(text, voice, speed, pitch);

  const cached = await readCache(cacheKey);
  if (cached) {
    console.log(`🎯 TTS cache HIT (${cacheKey.slice(0, 8)}…) — ${cached.length} bytes`);
    return { buffer: cached, fromCache: true };
  }

  console.log('🔊 Gerando TTS:', {
    text: text.substring(0, 50) + (text.length > 50 ? '…' : ''),
    length: text.length,
    voice,
    speed,
    pitch,
  });

  const startTime = Date.now();
  const audioBuffer = await synthesizeSpeech({
    text,
    voiceName: voice,
    speakingRate: speed,
    pitch,
    audioEncoding: 'MP3',
  });
  const durationMs = Date.now() - startTime;

  console.log(`✅ TTS gerado em ${durationMs}ms (${audioBuffer.length} bytes) — salvando cache`);
  await writeCache(cacheKey, audioBuffer as Buffer);

  return { buffer: audioBuffer as Buffer, fromCache: false, durationMs };
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { text, voice, speed, pitch } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Texto não fornecido' }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Texto muito longo (máximo 5000 caracteres)' },
        { status: 400 }
      );
    }

    const { buffer, fromCache, durationMs } = await synthesizeWithCache(
      text,
      voice ?? BRAZILIAN_VOICES.NEURAL_MALE,
      speed ?? 1.2,
      // O pitch entra na chave do cache junto com a voz. Sem isso, duas
      // personalidades que usam a mesma voz base com tons diferentes
      // devolveriam o mesmo audio — a segunda empresa ouviria o tom da primeira.
      typeof pitch === 'number' ? pitch : 0
    );

    return audioResponse(buffer, fromCache, durationMs);

  } catch (error: any) {
    console.error('❌ Erro Google TTS:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar áudio', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const text = request.nextUrl.searchParams.get('text');

    if (!text) {
      return NextResponse.json(
        { error: 'Texto não fornecido (use ?text=...)' },
        { status: 400 }
      );
    }

    const { buffer, fromCache, durationMs } = await synthesizeWithCache(
      text,
      BRAZILIAN_VOICES.NEURAL_MALE,
      1.2,
      0
    );

    return audioResponse(buffer, fromCache, durationMs);

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