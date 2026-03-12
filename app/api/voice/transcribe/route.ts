// =========================================================
// Rota API: Transcrever Áudio
// Arquivo: app/api/voice/transcribe/route.ts
// =========================================================
// Transcreve áudio usando Google Speech-to-Text API
// =========================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio } = body; // base64

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio required' },
        { status: 400 }
      );
    }

    // Obter API key do ambiente
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    
    if (!GOOGLE_API_KEY) {
      console.error('❌ GOOGLE_API_KEY não configurada');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    console.log('📡 Transcrevendo áudio via Google Speech...');

    // Chamar Google Speech-to-Text API
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'pt-BR',
            enableAutomaticPunctuation: true,
          },
          audio: {
            content: audio,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro Google Speech:', errorData);
      return NextResponse.json(
        { error: 'Google Speech error', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extrair transcrição
    const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || '';

    console.log(`✅ Transcrito: "${transcript}"`);

    return NextResponse.json({ text: transcript });

  } catch (error: any) {
    console.error('❌ Erro ao transcrever:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
