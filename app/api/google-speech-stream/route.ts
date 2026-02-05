// app/api/google-speech-stream/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio, DEFAULT_HINTS } from '@/lib/google-speech-streaming';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos max

/**
 * POST /api/google-speech-stream
 * 
 * Transcreve áudio usando Google Speech-to-Text
 * Body: FormData com arquivo 'audio'
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Arquivo de áudio não enviado' },
        { status: 400 }
      );
    }
    
    console.log('📥 Áudio recebido:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    });
    
    // Converter File para Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Detectar encoding baseado no tipo
    let encoding: 'LINEAR16' | 'WEBM_OPUS' = 'LINEAR16';
    if (audioFile.type.includes('webm')) {
      encoding = 'WEBM_OPUS';
    }
    
    console.log('🎤 Transcrevendo com Google Speech-to-Text...');
    const startTime = Date.now();
    
    // Transcrever
    const transcript = await transcribeAudio(buffer, {
      encoding,
      sampleRateHertz: 16000,
      languageCode: 'pt-BR',
      hints: DEFAULT_HINTS,
      model: 'command_and_search', // Melhor para comandos curtos
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Transcrição concluída em ${duration}ms:`, transcript);
    
    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma fala detectada no áudio' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      transcript: transcript.trim(),
      duration,
      service: 'google-speech-to-text',
    });
    
  } catch (error: any) {
    console.error('❌ Erro Google Speech:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao transcrever áudio',
        details: error.message 
      },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}