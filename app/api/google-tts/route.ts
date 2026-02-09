// app/api/google-tts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/google-tts
 * 
 * Sintetiza texto em áudio usando Google Text-to-Speech
 * Body: { text: string, voice?: string, speed?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, speed } = body;
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Texto não fornecido' },
        { status: 400 }
      );
    }
    
    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Texto muito longo (máximo 5000 caracteres)' },
        { status: 400 }
      );
    }
    
    console.log('🔊 Gerando TTS:', {
      text: text.substring(0, 50) + '...',
      length: text.length,
      voice: voice ?? 'padrão',
    });
    
    const startTime = Date.now();
    
    // Sintetizar
    const audioBuffer = await synthesizeSpeech({
      text,
      voiceName: voice ?? BRAZILIAN_VOICES.NEURAL_MALE,
      speakingRate: speed ?? 1.05, // 5% mais rápido por padrão
      audioEncoding: 'MP3',
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ TTS gerado em ${duration}ms (${audioBuffer.length} bytes)`);
    
    // Retornar áudio
    return new NextResponse(audioBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Generation-Time': duration.toString(),
        'X-Service': 'google-text-to-speech',
      },
    });
    
  } catch (error: any) {
    console.error('❌ Erro Google TTS:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao gerar áudio',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/google-tts?text=...
 * 
 * Alternativa via query params (útil para testes)
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
    
    const audioBuffer = await synthesizeSpeech({
      text,
      voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
      speakingRate: 1.05,
      audioEncoding: 'MP3',
    });
    
    return new NextResponse(audioBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
    
  } catch (error: any) {
    console.error('❌ Erro Google TTS (GET):', error);
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS para CORS
 */
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