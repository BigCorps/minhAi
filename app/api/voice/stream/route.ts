// app/api/voice/stream/route.ts

import { NextRequest } from 'next/server';
import speech from '@google-cloud/speech';
import { Readable } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WebSocket handler para Google Speech-to-Text Streaming
 * 
 * Recebe áudio do frontend e envia transcrições em tempo real
 */

interface StreamConfig {
  languageCode: string;
  sampleRate: number;
}

export async function GET(request: NextRequest) {
  console.log('🔌 Nova conexão WebSocket');
  
  try {
    // Criar cliente Google Speech
    const client = new speech.SpeechClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
    });
    
    // Upgrade para WebSocket (Vercel Edge Runtime)
    const upgradeHeader = request.headers.get('upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    
    // @ts-ignore - Vercel WebSocket API
    const { socket, response } = Deno.upgradeWebSocket(request);
    
    let recognizeStream: any = null;
    let config: StreamConfig = {
      languageCode: 'pt-BR',
      sampleRate: 16000,
    };
    
    socket.onopen = () => {
      console.log('✅ WebSocket aberto');
    };
    
    socket.onmessage = async (event: MessageEvent) => {
      try {
        // Mensagem de texto = configuração
        if (typeof event.data === 'string') {
          const message = JSON.parse(event.data);
          
          if (message.type === 'config') {
            config = {
              languageCode: message.config.languageCode || 'pt-BR',
              sampleRate: message.config.sampleRate || 16000,
            };
            
            console.log('⚙️ Configuração recebida:', config);
            
            // Criar stream de reconhecimento
            recognizeStream = client
              .streamingRecognize({
                config: {
                  encoding: 'LINEAR16',
                  sampleRateHertz: config.sampleRate,
                  languageCode: config.languageCode,
                  enableAutomaticPunctuation: true,
                  model: 'command_and_search', // Melhor para comandos
                  useEnhanced: true, // Modelo premium (melhor qualidade)
                  speechContexts: [
                    {
                      phrases: [
                        'oi',
                        'olá',
                        'ei',
                        'gerar pix',
                        'whatsapp',
                        'instagram',
                        'confirmar',
                        'cancelar',
                        'tchau',
                      ],
                      boost: 20, // Aumenta probabilidade dessas palavras
                    }
                  ],
                },
                interimResults: true, // Resultados parciais
              })
              .on('data', (data: any) => {
                if (data.results && data.results.length > 0) {
                  const result = data.results[0];
                  const transcript = result.alternatives[0].transcript;
                  const isFinal = result.isFinal;
                  
                  if (transcript) {
                    console.log(`${isFinal ? '✅' : '📝'} ${transcript}`);
                    
                    socket.send(JSON.stringify({
                      type: 'transcript',
                      text: transcript,
                      isFinal: isFinal,
                    }));
                  }
                }
              })
              .on('error', (error: Error) => {
                console.error('❌ Google Speech error:', error);
                socket.send(JSON.stringify({
                  type: 'error',
                  message: error.message,
                }));
              });
            
            return;
          }
        }
        
        // Mensagem binária = áudio
        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          if (!recognizeStream) {
            console.error('⚠️ Stream não inicializado');
            return;
          }
          
          // Converter para Buffer
          let audioBuffer: Buffer;
          if (event.data instanceof Blob) {
            const arrayBuffer = await event.data.arrayBuffer();
            audioBuffer = Buffer.from(arrayBuffer);
          } else {
            audioBuffer = Buffer.from(event.data);
          }
          
          // Enviar para Google Speech
          recognizeStream.write(audioBuffer);
        }
        
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Erro ao processar áudio',
        }));
      }
    };
    
    socket.onclose = () => {
      console.log('🔌 WebSocket fechado');
      
      // Finalizar stream do Google
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
      }
    };
    
    socket.onerror = (error: Event) => {
      console.error('❌ WebSocket error:', error);
    };
    
    return response;
    
  } catch (error) {
    console.error('❌ Erro ao criar WebSocket:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}