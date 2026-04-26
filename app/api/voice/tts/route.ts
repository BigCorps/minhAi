import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
const { text, voice } = await request.json();

if (!text) {
  return NextResponse.json(
    { error: 'Texto é obrigatório' },
    { status: 400 }
  );
}

// Aceita apenas as duas vozes Neural pt-BR — fallback para masculina
const allowed = [BRAZILIAN_VOICES.NEURAL_MALE, BRAZILIAN_VOICES.NEURAL_FEMALE];
const voiceName = voice && allowed.includes(voice) ? voice : BRAZILIAN_VOICES.NEURAL_MALE;

console.log('🔊 Google TTS:', text.substring(0, 50), '| voz:', voiceName);

const audioBuffer = await synthesizeSpeech({
  text,
  voiceName,
  speakingRate: 1.2,
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
