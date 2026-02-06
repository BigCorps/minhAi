// lib/google-tts.ts

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

let ttsClient: TextToSpeechClient | null = null;

export function getTTSClient(): TextToSpeechClient {
  if (!ttsClient) {
    // Vercel: usar JSON das env vars
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      console.log('🔧 Criando TTSClient (Vercel mode com credentials objeto)');
      
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      
      ttsClient = new TextToSpeechClient({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'), // ✅ CORRETO!
      });
    } 
    // Local: usar arquivo
    else {
      console.log('🔧 Criando TTSClient (Local mode)');
      
      ttsClient = new TextToSpeechClient({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });
    }
  }
  return ttsClient;
}

/**
 * Sintetiza texto em áudio usando Google TTS
 */
export async function synthesizeSpeech(params: {
  text: string;
  voiceName: string;
  speakingRate?: number;
  audioEncoding: 'MP3' | 'LINEAR16';
}): Promise<Buffer> {
  const client = getTTSClient();
  
  const [response] = await client.synthesizeSpeech({
    input: { text: params.text },
    voice: {
      name: params.voiceName,
      languageCode: 'pt-BR',
    },
    audioConfig: {
      audioEncoding: params.audioEncoding,
      speakingRate: params.speakingRate || 1.0,
    },
  });

  if (!response.audioContent) {
    throw new Error('TTS response vazia');
  }

  return Buffer.from(response.audioContent as Uint8Array);
}

export const BRAZILIAN_VOICES = {
  FEMALE_A: 'pt-BR-Wavenet-A',
  FEMALE_C: 'pt-BR-Wavenet-C',
  MALE_B: 'pt-BR-Wavenet-B',
} as const;