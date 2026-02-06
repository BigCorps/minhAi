// lib/google-tts.ts
// Google Text-to-Speech usando REST API com API Key

export const BRAZILIAN_VOICES = {
  FEMALE_A: 'pt-BR-Standard-A',
  FEMALE_C: 'pt-BR-Standard-C',
  MALE_B: 'pt-BR-Standard-B',
  MALE_D: 'pt-BR-Standard-D',
  NEURAL_FEMALE: 'pt-BR-Neural2-A',
  NEURAL_MALE: 'pt-BR-Neural2-B',
} as const;

export interface SynthesizeSpeechOptions {
  text: string;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
}

export async function synthesizeSpeech(
  options: SynthesizeSpeechOptions
): Promise<Buffer> {
  const {
    text,
    voiceName = BRAZILIAN_VOICES.FEMALE_A,
    speakingRate = 1.0,
    pitch = 0,
    volumeGainDb = 0,
    audioEncoding = 'MP3',
  } = options;

  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY não configurada');
  }

  console.log('🔊 Google TTS (REST API)');

  const requestBody = {
    input: { text },
    voice: {
      languageCode: 'pt-BR',
      name: voiceName,
    },
    audioConfig: {
      audioEncoding,
      speakingRate,
      pitch,
      volumeGainDb,
    },
  };

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ TTS error:', error);
    throw new Error(`Google TTS failed: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  if (!data.audioContent) {
    throw new Error('No audio content in response');
  }

  // Decodificar base64
  const audioBuffer = Buffer.from(data.audioContent, 'base64');

  console.log(`✅ TTS: ${audioBuffer.length} bytes`);

  return audioBuffer;
}