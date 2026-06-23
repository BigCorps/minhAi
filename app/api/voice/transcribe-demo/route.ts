// =========================================================
// Rota API: Transcrever Áudio (DEMO)
// Arquivo: app/api/voice/transcribe-demo/route.ts
// =========================================================
// Cópia isolada de app/api/voice/transcribe/route.ts, criada por
// decisão de isolamento total entre rotas de produção e da demo
// /lead — mesmo a rota original já não dependendo de companyId.
// Qualquer mudança futura na rota de produção (troca de provedor,
// novos parâmetros) não afeta esta rota, e vice-versa.
//
// Usa Google Speech-to-Text API (não Whisper/OpenAI — confirmado
// na rota original, que é a fonte de verdade aqui).
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

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

    if (!GOOGLE_API_KEY) {
      console.error('❌ [demo] GOOGLE_API_KEY não configurada');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    console.log('📡 [demo] Transcrevendo áudio via Google Speech...');

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
      console.error('❌ [demo] Erro Google Speech:', errorData);
      return NextResponse.json(
        { error: 'Google Speech error', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || '';

    console.log(`✅ [demo] Transcrito: "${transcript}"`);

    return NextResponse.json({ text: transcript });

  } catch (error: any) {
    console.error('❌ [demo] Erro ao transcrever:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';