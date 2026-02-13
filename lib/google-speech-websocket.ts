// lib/google-speech-websocket.ts (COM GANHO DE ÁUDIO)

/**
 * Cliente WebSocket para Google Speech-to-Text Streaming
 * VERSÃO COM AMPLIFICAÇÃO DE ÁUDIO
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
  private chunksSent: number = 0;
  
  constructor(config: GoogleSpeechConfig) {
    this.config = {
      onTranscript: config.onTranscript,
      onError: config.onError || (() => {}),
      onReady: config.onReady || (() => {}),
      languageCode: config.languageCode || 'pt-BR',
      sampleRate: config.sampleRate || 16000,
    };
  }
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const wsUrl = supabaseUrl
          .replace('https://', 'wss://')
          .replace('http://', 'ws://') + '/functions/v1/speech-stream';
        
        console.log('🔌 Conectando Supabase WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket conectado');
          
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
            
            if (data.type === 'ping') {
              console.log('🏓 Ping recebido, enviando pong');
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'pong' }));
              }
              return;
            }
            
            if (data.type === 'ready') {
              console.log('✅ Google Speech pronto:', data.config);
              this.config.onReady();
              resolve();
            } else if (data.type === 'transcript') {
              console.log('📝 Transcrição recebida:', data.text);
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
          console.error('❌ WebSocket readyState:', this.ws?.readyState);
          this.config.onError(new Error('WebSocket connection error'));
          reject(error);
        };
        
        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket desconectado');
          console.log('🔌 Close code:', event.code);
          console.log('🔌 Close reason:', event.reason);
          console.log('📊 Total de chunks enviados:', this.chunksSent);
        };
        
      } catch (error) {
        console.error('❌ Erro ao conectar:', error);
        reject(error);
      }
    });
  }
  
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.log('⚠️ Já está gravando');
      return;
    }
    
    try {
      console.log('🎤 Iniciando captura de áudio...');
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: this.config.sampleRate,
        }
      });
      
      console.log('✅ MediaStream obtido:', this.mediaStream.getTracks()[0].getSettings());
      
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate
      });
      
      console.log('✅ AudioContext criado, sampleRate:', this.audioContext.sampleRate);
      
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.chunksSent = 0;
      
      this.scriptProcessor.onaudioprocess = (event) => {
        if (this.chunksSent % 50 === 0) {
          console.log('📊 Processando chunk:', this.chunksSent);
        }
        
        if (!this.isRecording) {
          console.log('⚠️ isRecording = false, ignorando chunk');
          return;
        }
        
        if (!this.ws) {
          console.log('⚠️ WebSocket não existe, ignorando chunk');
          return;
        }
        
        if (this.ws.readyState !== WebSocket.OPEN) {
          console.log('⚠️ WebSocket não está OPEN:', this.ws.readyState);
          return;
        }
        
        const inputData = event.inputBuffer.getChannelData(0);
        
        // ✅ VERIFICAR NÍVEL DE ÁUDIO
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const avgVolume = sum / inputData.length;
        
        if (this.chunksSent % 50 === 0) {
          console.log('🔊 Volume médio:', avgVolume.toFixed(4));
        }
        
        // Converter Float32Array para Int16Array
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        try {
          this.ws.send(int16Data.buffer);
          this.chunksSent++;
          
          if (this.chunksSent % 50 === 0) {
            console.log('✅ Chunk enviado! Total:', this.chunksSent, 'Bytes:', int16Data.byteLength);
          }
        } catch (error) {
          console.error('❌ Erro ao enviar chunk:', error);
        }
      };
      
      // ✅ CONECTAR: source → scriptProcessor → destination
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
  
  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }
    
    console.log('🛑 Parando gravação...');
    console.log('📊 Total de chunks enviados:', this.chunksSent);
    
    this.isRecording = false;
    
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    console.log('✅ Gravação parada');
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  isRecordingActive(): boolean {
    return this.isRecording;
  }
}
