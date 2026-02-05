// lib/google-speech-streaming.ts

import { SpeechClient } from '@google-cloud/speech';

let speechClient: SpeechClient | null = null;

export function getSpeechClient(): SpeechClient {
  if (!speechClient) {
    // Vercel: usar JSON das env vars
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      console.log('🔧 Criando SpeechClient (Vercel mode com credentials objeto)');
      
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      
      speechClient = new SpeechClient({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentials: credentials,
      });
    } 
    // Local: usar arquivo
    else {
      console.log('🔧 Criando SpeechClient (Local mode)');
      
      speechClient = new SpeechClient({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });
    }
  }
  return speechClient;
}

export const DEFAULT_HINTS = [
  'WhatsApp',
  'Instagram',
  'PIX',
  'Pix',
  'gerar',
  'criar',
  'confirmar',
  'cancelar',
  'olá',
  'oi',
  'tchau',
];

/**
 * Transcreve áudio usando Google Speech-to-Text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  config: {
    encoding: 'LINEAR16' | 'WEBM_OPUS';
    sampleRateHertz: number;
    languageCode: string;
    hints?: string[];
    model?: string;
  }
): Promise<string> {
  const client = getSpeechClient();
  
  const [response] = await client.recognize({
    audio: { content: audioBuffer.toString('base64') },
    config: {
      encoding: config.encoding,
      sampleRateHertz: config.sampleRateHertz,
      languageCode: config.languageCode,
      speechContexts: config.hints ? [{ phrases: config.hints }] : undefined,
      model: config.model || 'default',
      useEnhanced: true,
    },
  });

  if (!response.results || response.results.length === 0) {
    return '';
  }

  const transcript = response.results
    .map(result => result.alternatives?.[0]?.transcript || '')
    .join(' ')
    .trim();

  return transcript;
}