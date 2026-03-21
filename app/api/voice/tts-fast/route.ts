import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';

export const runtime = 'nodejs';

// Cache de áudios comuns (pre-gerados)
const AUDIO_CACHE = new Map<string, Buffer>();

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 });
    }

    console.log('🔊 TTS-Fast:', text.substring(0, 30));

    // Verificar cache primeiro
    const cacheKey = text.toLowerCase().trim();
    if (AUDIO_CACHE.has(cacheKey)) {
      console.log('⚡ Cache hit!');
      const cachedBuffer = AUDIO_CACHE.get(cacheKey)!;
      
      return new Response(new Uint8Array(cachedBuffer), {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000', // 1 ano
          'X-Cache': 'HIT',
        },
      });
    }

    // Gerar com Google TTS
    const startTime = Date.now();
    
    const buffer = await synthesizeSpeech({
      text,
      voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
      speakingRate: 1.3,
      audioEncoding: 'MP3',
    });

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ TTS gerado em ${processingTime}ms`);

    // Cachear apenas textos curtos e comuns
    if (text.length < 30 && AUDIO_CACHE.size < 20) {
      AUDIO_CACHE.set(cacheKey, buffer);
      console.log('💾 Armazenado no cache');
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Processing-Time': String(processingTime),
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('❌ Erro TTS-Fast:', error.message);
    return NextResponse.json(
      { error: 'Erro ao gerar áudio' },
      { status: 500 }
    );
  }
}

// Pre-aquecer cache com frases comuns
const COMMON_PHRASES = [
  'Entendi sua pergunta!',
  'Processando sua resposta.',
  'Um momento por favor!',
  'Certo, aguarde um pouco.',
  'Tudo bem, só um instante!',
  'Desculpe, não consegui processar.',
  'Por favor, repita.',
  'Estou ouvindo.',
];

// Inicializar cache (opcional - só em produção)
if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_CLOUD_API_KEY) {
  (async () => {
    console.log('🔥 Pre-aquecendo cache Google TTS...');
    for (const phrase of COMMON_PHRASES) {
      try {
        const buffer = await synthesizeSpeech({
          text: phrase,
          voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
          speakingRate: 1.3,
          audioEncoding: 'MP3',
        });
        
        AUDIO_CACHE.set(phrase.toLowerCase().trim(), buffer);
        console.log(`✅ Cached: "${phrase}"`);
      } catch (e) {
        console.log(`⚠️ Failed: "${phrase}"`);
      }
    }
    console.log(`✅ Cache pronto! ${AUDIO_CACHE.size} frases`);
  })();
}