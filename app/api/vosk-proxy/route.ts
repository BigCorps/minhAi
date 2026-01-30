// app/api/vosk-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file') || '';
    
    // URL base do modelo no servidor oficial
    const baseUrl = 'https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip';
    
    console.log('📦 Proxy Vosk: Baixando modelo do servidor oficial...');
    
    // Fazer o fetch do modelo (servidor Next.js não tem CORS)
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    if (!response.ok) {
      console.error('❌ Erro ao baixar modelo:', response.status);
      return NextResponse.json(
        { error: 'Erro ao baixar modelo' },
        { status: response.status }
      );
    }
    
    // Pegar o conteúdo
    const buffer = await response.arrayBuffer();
    
    console.log('✅ Modelo baixado com sucesso:', buffer.byteLength, 'bytes');
    
    // Retornar com headers CORS corretos
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': buffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('❌ Erro no proxy Vosk:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}