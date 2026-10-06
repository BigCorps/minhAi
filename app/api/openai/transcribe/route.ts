import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OPENAI_MODELS } from '@/lib/openai-models';

export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const AUDIO_TYPES = new Set([
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav',
]);
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function json(body: { error: string } | { text: string }, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...headers, 'Cache-Control': 'no-store' },
  });
}

function methodNotAllowed() {
  return json({ error: 'Only POST is supported' }, 405, { Allow: 'POST' });
}

export {
  methodNotAllowed as GET,
  methodNotAllowed as HEAD,
  methodNotAllowed as OPTIONS,
  methodNotAllowed as PUT,
  methodNotAllowed as PATCH,
  methodNotAllowed as DELETE,
};

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin !== null) {
    try {
      const originUrl = new URL(origin);
      const host = request.headers.get('host') || request.nextUrl.host;
      if (!['http:', 'https:'].includes(originUrl.protocol) || originUrl.host !== host) {
        return json({ error: 'Origin not allowed' }, 403);
      }
    } catch {
      return json({ error: 'Origin not allowed' }, 403);
    }
  }

  // Mesmo header prioritário de /api/qrcode; o proxy deve fornecer o IP real.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
  const now = Date.now();
  // Remover janelas expiradas para não acumular IPs indefinidamente.
  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(key);
  }
  const entry = rateLimitMap.get(ip);
  if (entry && entry.count >= RATE_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return json({ error: 'Too many transcription requests. Try again later.' }, 429, {
      'Retry-After': String(retryAfter),
    });
  }
  if (entry) entry.count++;
  else rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });

  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (contentType !== 'multipart/form-data') {
    return json({ error: 'Multipart/form-data required' }, 415);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'Invalid multipart/form-data' }, 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return json({ error: 'Non-empty audio file required' }, 400);
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return json({ error: 'Audio file exceeds 4 MiB' }, 413);
  }
  // MediaRecorder pode incluir parâmetros como ";codecs=opus".
  const audioType = file.type.split(';')[0].trim().toLowerCase();
  if (!AUDIO_TYPES.has(audioType)) {
    return json({ error: 'Unsupported audio type' }, 415);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({ error: 'Transcription unavailable' }, 503);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: OPENAI_MODELS.transcribe,
      language: 'pt',
    });
    return json({ text: transcription.text });
  } catch {
    // Não retornar nem registrar conteúdo do áudio ou detalhes do provedor.
    return json({ error: 'Transcription failed' }, 502);
  }
}
