// lib/google-speech-streaming.ts

import speech from '@google-cloud/speech';

/**
 * Client Google Speech-to-Text com streaming em tempo real
 */

let speechClient: speech.SpeechClient | null = null;

export function getSpeechClient(): speech.SpeechClient {
  if (!speechClient) {
    speechClient = new speech.SpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }
  return speechClient;
}

export interface StreamingConfig {
  languageCode: string;
  sampleRateHertz: number;
  encoding: 'LINEAR16' | 'WEBM_OPUS';
  hints?: string[]; // Palavras customizadas (PIX, WhatsApp, etc)
  enableAutomaticPunctuation?: boolean;
  model?: 'default' | 'command_and_search' | 'phone_call' | 'video';
}

/**
 * Configura streaming de áudio → texto
 */
export function createStreamingRecognition(
  config: StreamingConfig,
  onTranscript: (transcript: string, isFinal: boolean) => void,
  onError: (error: Error) => void
) {
  const client = getSpeechClient();
  
  const request: speech.protos.google.cloud.speech.v1.IStreamingRecognizeRequest = {
    config: {
      encoding: config.encoding,
      sampleRateHertz: config.sampleRateHertz,
      languageCode: config.languageCode,
      enableAutomaticPunctuation: config.enableAutomaticPunctuation ?? true,
      model: config.model ?? 'command_and_search',
      useEnhanced: true, // Modelo melhorado
      // Hints customizados para melhorar precisão
      speechContexts: config.hints ? [{
        phrases: config.hints,
        boost: 20 // Aumenta probabilidade 20x
      }] : undefined,
    },
    interimResults: true, // Resultados parciais em tempo real
  };
  
  const recognizeStream = client
    .streamingRecognize(request)
    .on('error', onError)
    .on('data', (data: any) => {
      if (data.results[0] && data.results[0].alternatives[0]) {
        const transcript = data.results[0].alternatives[0].transcript;
        const isFinal = data.results[0].isFinal;
        onTranscript(transcript, isFinal);
      }
    });
  
  return recognizeStream;
}

/**
 * Transcrição de áudio completo (não streaming)
 * Útil para arquivos de áudio
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  config: Partial<StreamingConfig> = {}
): Promise<string> {
  const client = getSpeechClient();
  
  const audio = {
    content: audioBuffer.toString('base64'),
  };
  
  const request = {
    audio: audio,
    config: {
      encoding: config.encoding ?? 'LINEAR16',
      sampleRateHertz: config.sampleRateHertz ?? 16000,
      languageCode: config.languageCode ?? 'pt-BR',
      enableAutomaticPunctuation: true,
      model: config.model ?? 'command_and_search',
      speechContexts: config.hints ? [{
        phrases: config.hints,
        boost: 20
      }] : undefined,
    },
  };
  
  const [response] = await client.recognize(request);
  const transcription = response.results
    ?.map(result => result.alternatives?.[0]?.transcript)
    .join('\n') || '';
  
  return transcription;
}

/**
 * Hints padrão para melhorar reconhecimento
 */
export const DEFAULT_HINTS = [
  // Palavras-chave do negócio
  'PIX',
  'WhatsApp',
  'Instagram',
  'QR Code',
  'cobrança',
  'pagamento',
  
  // Wake words comuns
  'gerente',
  'atendente',
  'assistente',
  
  // Comandos
  'gerar',
  'mostrar',
  'mostra',
  'mostre',
  'cancelar',
  'confirmar',
];