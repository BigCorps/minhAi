// lib/google-speech-websocket.ts (VERSÃO SUPABASE)

/**
 * Cliente WebSocket para Google Speech-to-Text Streaming
 * Conecta via Supabase Edge Function
 */

export interface GoogleSpeechConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onReady?: () => void;
  languageCode?: string;
  sampleRate?: number;
}

export class GoogleSpeechWebSocket {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording: boolean = false;
  private config: Required<GoogleSpeechConfig>;
  
  constructor(config: GoogleSpeechConfig) {
    this.config = {
      onTranscript: config.onTranscript,
      onError: config.onError || (() => {}),
      onReady: config.onReady || (() => {}),
      languageCode: config.languageCode || 'pt-BR',
      sampleRate: config.sampleRate || 16000,
    };
  }
  
  /**
   * Conecta ao WebSocket da Supabase Edge Function
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // URL da Supabase Edge Function
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const wsUrl = supabaseUrl
          .replace('https://', 'wss://')
          .replace('http://', 'ws://') + '/functions/v1/speech-stream';
        
        console.log('🔌 Conectando Supabase WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket conectado');
          
          // Enviar configuração inicial
          this.ws!.send(JSON.stringify({
            type: 'config',
            config: {
              languageCode: this.config.languageCode,
              sampleRate: this.config.sampleRate,
            }
          }));
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'ready') {
              console.log('✅ Google Speech pronto:', data.config);
              this.config.onReady();
              resolve();
            } else if (data.type === 'transcript') {
              this.config.onTranscript(data.text, data.isFinal);
            } else if (data.type === 'error') {
              console.error('❌ Erro do servidor:', data.message);
              this.config.onError(new Error(data.message));
            }
          } catch (error) {
            console.error('Erro ao processar mensagem:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.config.onError(new Error('WebSocket connection error'));
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('🔌 WebSocket desconectado');
        };
        
      } catch (error) {
        console.error('❌ Erro ao conectar:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Inicia captura de áudio do microfone
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.log('⚠️ Já está gravando');
      return;
    }
    
    try {
      console.log('🎤 Iniciando captura de áudio...');
      
      // Capturar microfone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: this.config.sampleRate,
        }
      });
      
      // Criar AudioContext
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate
      });
      
      // Criar source do microfone
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Criar processor para capturar áudio
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return;
        }
        
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Converter Float32Array para Int16Array
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Enviar para Supabase via WebSocket
        this.ws.send(int16Data.buffer);
      };
      
      // Conectar nodes
      this.source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      
      this.isRecording = true;
      console.log('✅ Gravação iniciada');
      
    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error);
      this.config.onError(error as Error);
      throw error;
    }
  }
  
  /**
   * Para captura de áudio
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }
    
    console.log('🛑 Parando gravação...');
    
    this.isRecording = false;
    
    // Desconectar nodes
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    // Fechar AudioContext
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    // Parar tracks do microfone
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    console.log('✅ Gravação parada');
  }
  
  /**
   * Desconecta WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  /**
   * Verifica se está gravando
   */
  isRecordingActive(): boolean {
    return this.isRecording;
  }
}