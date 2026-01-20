import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Cache de áudios comuns (pre-gerados)
const AUDIO_CACHE = new Map<string, Buffer>();

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 });
    }

    console.log('🎯 TTS-Fast:', text);

    // Verificar cache primeiro
    const cacheKey = text.toLowerCase().trim();
    if (AUDIO_CACHE.has(cacheKey)) {
      console.log('⚡ Cache hit!');
      const cachedBuffer = AUDIO_CACHE.get(cacheKey)!;
      
      return new Response(cachedBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000', // 1 ano
        },
      });
    }

    // Gerar TTS com configurações otimizadas para clareza
    const startTime = Date.now();
    
    const tts = await openai.audio.speech.create({
      model: 'tts-1', // Modelo rápido
      voice: 'nova',
      input: text,
      speed: 1.0, // Velocidade normal para clareza
    });

    const buffer = Buffer.from(await tts.arrayBuffer());
    const processingTime = Date.now() - startTime;
    
    console.log(`⏱️ TTS gerado em ${processingTime}ms`);

    // Cachear apenas textos curtos e comuns
    if (text.length < 30 && AUDIO_CACHE.size < 10) {
      AUDIO_CACHE.set(cacheKey, buffer);
      console.log('💾 Armazenado no cache');
    }

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Processing-Time': String(processingTime),
      },
    });
  } catch (error: any) {
    console.error('Erro TTS-Fast:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar áudio' },
      { status: 500 }
    );
  }
}

// Pre-aquecer cache com frases comuns
const COMMON_PHRASES = [
  'Entendi!',
  'Processando...',
  'Um momento!',
  'Aguarde...',
  'Um instante!',
];

// Inicializar cache (opcional - só em produção)
if (process.env.NODE_ENV === 'production') {
  (async () => {
    console.log('🔥 Pre-aquecendo cache TTS...');
    for (const phrase of COMMON_PHRASES) {
      try {
        const tts = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'nova',
          input: phrase,
          speed: 1.0, // Velocidade normal
        });
        const buffer = Buffer.from(await tts.arrayBuffer());
        AUDIO_CACHE.set(phrase.toLowerCase().trim(), buffer);
        console.log(`✅ Cached: "${phrase}"`);
      } catch (e) {
        console.log(`⚠️ Failed to cache: "${phrase}"`);
      }
    }
    console.log('✅ Cache TTS pronto!');
  })();
}