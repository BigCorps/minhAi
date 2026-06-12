// app/api/voice/tts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { text, voice, speed } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Texto é obrigatório' },
        { status: 400 }
      );
    }

    const allowed = [BRAZILIAN_VOICES.NEURAL_MALE, BRAZILIAN_VOICES.NEURAL_FEMALE];
    const voiceName = voice && allowed.includes(voice) ? voice : BRAZILIAN_VOICES.NEURAL_MALE;

    // speed vem do player (1x = 1.15, 1.5x = 1.73, 2x = 2.3) — fallback para 1.2
    const speakingRate = typeof speed === 'number' && speed > 0 && speed <= 4 ? speed : 1.2;

    console.log('🔊 Google TTS:', text.substring(0, 50), '| voz:', voiceName, '| speed:', speakingRate);

    const audioBuffer = await synthesizeSpeech({
      text,
      voiceName,
      speakingRate,
      audioEncoding: 'MP3',
    });

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('❌ Erro TTS:', error.message);
    return NextResponse.json(
      { error: 'Erro ao gerar áudio', details: error.message },
      { status: 500 }
    );
  }
}
