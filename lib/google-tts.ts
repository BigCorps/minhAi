// lib/google-tts.ts

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

/**
 * Client Google Text-to-Speech
 */

let ttsClient: TextToSpeechClient | null = null;

export function getTTSClient(): TextToSpeechClient {
  if (!ttsClient) {
    ttsClient = new TextToSpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }
  return ttsClient;
}

export interface TTSConfig {
  text: string;
  languageCode?: string;
  voiceName?: string;
  speakingRate?: number; // 0.25 - 4.0 (1.0 = normal)
  pitch?: number; // -20.0 - 20.0 (0 = normal)
  volumeGainDb?: number; // -96.0 - 16.0 (0 = normal)
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
}

/**
 * Vozes brasileiras disponíveis (Neural2 - melhor qualidade)
 */
export const BRAZILIAN_VOICES = {
  FEMALE_A: 'pt-BR-Neural2-A', // Feminina casual
  FEMALE_B: 'pt-BR-Neural2-B', // Feminina profissional
  FEMALE_C: 'pt-BR-Neural2-C', // Feminina jovem
  MALE_A: 'pt-BR-Neural2-D',   // Masculina grave
  MALE_B: 'pt-BR-Neural2-E',   // Masculina média
} as const;

/**
 * Sintetiza texto em áudio
 */
export async function synthesizeSpeech(
  config: TTSConfig
): Promise<Buffer> {
  const client = getTTSClient();
  
  const request = {
    input: { text: config.text },
    voice: {
      languageCode: config.languageCode ?? 'pt-BR',
      name: config.voiceName ?? BRAZILIAN_VOICES.FEMALE_A,
      ssmlGender: 'NEUTRAL' as const,
    },
    audioConfig: {
      audioEncoding: config.audioEncoding ?? 'MP3',
      speakingRate: config.speakingRate ?? 1.05, // 5% mais rápido
      pitch: config.pitch ?? 0,
      volumeGainDb: config.volumeGainDb ?? 0,
      effectsProfileId: ['headphone-class-device'], // Otimizado para fones
    },
  };
  
  const [response] = await client.synthesizeSpeech(request);
  
  if (!response.audioContent) {
    throw new Error('Nenhum áudio gerado');
  }
  
  return Buffer.from(response.audioContent);
}

/**
 * Sintetiza com SSML (Speech Synthesis Markup Language)
 * Permite controle avançado: pausas, ênfase, prosódia
 */
export async function synthesizeSSML(
  ssml: string,
  voiceName?: string
): Promise<Buffer> {
  const client = getTTSClient();
  
  const request = {
    input: { ssml },
    voice: {
      languageCode: 'pt-BR',
      name: voiceName ?? BRAZILIAN_VOICES.FEMALE_A,
    },
    audioConfig: {
      audioEncoding: 'MP3' as const,
      speakingRate: 1.05,
      effectsProfileId: ['headphone-class-device'],
    },
  };
  
  const [response] = await client.synthesizeSpeech(request);
  
  if (!response.audioContent) {
    throw new Error('Nenhum áudio gerado');
  }
  
  return Buffer.from(response.audioContent);
}

/**
 * Helper: Criar SSML com pausas e ênfases
 */
export function createSSML(text: string, options?: {
  pause?: number; // Segundos
  emphasis?: 'strong' | 'moderate' | 'reduced';
  speed?: 'slow' | 'medium' | 'fast';
}): string {
  let ssml = '<speak>';
  
  if (options?.pause) {
    ssml += `<break time="${options.pause}s"/>`;
  }
  
  if (options?.emphasis) {
    ssml += `<emphasis level="${options.emphasis}">${text}</emphasis>`;
  } else {
    ssml += text;
  }
  
  if (options?.speed) {
    ssml = `<speak><prosody rate="${options.speed}">${text}</prosody></speak>`;
  } else {
    ssml += '</speak>';
  }
  
  return ssml;
}

/**
 * Exemplo de uso avançado:
 * 
 * const ssml = `
 *   <speak>
 *     Olá! <break time="0.5s"/>
 *     O valor do PIX é <emphasis level="strong">cinquenta reais</emphasis>.
 *     <break time="1s"/>
 *     Aguardando confirmação...
 *   </speak>
 * `;
 * 
 * const audio = await synthesizeSSML(ssml);
 */