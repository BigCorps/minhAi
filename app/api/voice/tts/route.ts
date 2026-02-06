import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Texto é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🔊 Google TTS:', text.substring(0, 50));

    const audioBuffer = await synthesizeSpeech({
      text,
      voiceName: BRAZILIAN_VOICES.FEMALE_A,
      speakingRate: 1.0,
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