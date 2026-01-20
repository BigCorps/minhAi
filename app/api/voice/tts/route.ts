import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Texto é obrigatório' },
        { status: 400 }
      );
    }

    // 🎯 TTS otimizado para PT-BR
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // 🎯 Melhor voz para português brasileiro
      input: text,
      response_format: 'mp3',
      speed: 0.90, // 🎯 90% da velocidade (claro e natural para PT-BR)
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Erro TTS:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar áudio', details: error.message },
      { status: 500 }
    );
  }
}
