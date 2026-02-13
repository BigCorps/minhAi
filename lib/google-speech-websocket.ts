/**
 * Cliente WebSocket para Google Speech-to-Text Streaming
 * VERSÃO OTIMIZADA COM VAD LOCAL E PRE-ROLL BUFFER
 * 
 * Esta versão economiza recursos do Supabase ao enviar áudio apenas quando voz é detectada,
 * mas mantém a conexão WebSocket aberta para resposta instantânea.
 */

export interface GoogleSpeechConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onReady?: () => void;
  onStatusChange?: (status: 'idle' | 'recording' | 'processing') => void;
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
  
  // ✅ NOVOS ATRIBUTOS PARA OTIMIZAÇÃO
  private isVoiceDetected: boolean = false;
  private preRollBuffer: ArrayBuffer[] = [];
  private readonly MAX_PRE_ROLL_CHUNKS = 5; // ~1.2s de áudio (4096 samples @ 16kHz)
  private silenceCounter: number = 0;
  private readonly SILENCE_THRESHOLD = 20; // ~5s de silêncio para parar transmissão
  
  constructor(config: GoogleSpeechConfig) {
    this.config = {
      onTranscript: config.onTranscript,
      onError: config.onError || (() => {}),
      onReady: config.onReady || (() => {}),
      onStatusChange: config.onStatusChange || (() => {}),
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
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'pong' }));
              }
              return;
            }
            
            if (data.type === 'ready') {
              console.log('✅ Google Speech pronto');
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
          this.config.onError(new Error('WebSocket connection error'));
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('🔌 WebSocket desconectado');
          this.isRecording = false;
          this.config.onStatusChange('idle');
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async startRecording(): Promise<void> {
    if (this.isRecording) return;
    
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: this.config.sampleRate,
        }
      });
      
      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // ScriptProcessor para análise local (VAD)
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.scriptProcessor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // 1. CALCULAR VOLUME (RMS) LOCALMENTE
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        // 2. CONVERTER PARA INT16
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const buffer = int16Data.buffer;

        // 3. LÓGICA DE VAD (DETECÇÃO DE VOZ)
        const VOLUME_THRESHOLD = 0.045; // Ajuste conforme necessário (-45dB aprox)
        
        if (rms > VOLUME_THRESHOLD) {
          this.silenceCounter = 0;
          if (!this.isVoiceDetected) {
            console.log('🎤 VOZ DETECTADA - Iniciando transmissão');
            this.isVoiceDetected = true;
            this.config.onStatusChange('recording');
            
            // Enviar Pre-roll Buffer primeiro para não cortar o início da fala
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.preRollBuffer.forEach(chunk => this.ws!.send(chunk));
              this.preRollBuffer = [];
            }
          }
        } else {
          this.silenceCounter++;
          if (this.isVoiceDetected && this.silenceCounter > this.SILENCE_THRESHOLD) {
            console.log('🤫 SILÊNCIO DETECTADO - Pausando transmissão');
            this.isVoiceDetected = false;
            this.config.onStatusChange('idle');
          }
        }

        // 4. TRANSMISSÃO OU BUFFERING
        if (this.isVoiceDetected) {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(buffer);
            this.chunksSent++;
          }
        } else {
          // Guardar no Pre-roll Buffer enquanto está em silêncio
          this.preRollBuffer.push(buffer);
          if (this.preRollBuffer.length > this.MAX_PRE_ROLL_CHUNKS) {
            this.preRollBuffer.shift(); // Remove o mais antigo
          }
        }
      };
      
      this.source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      
      this.isRecording = true;
      this.config.onStatusChange('idle');
      
    } catch (error) {
      this.config.onError(error as Error);
      throw error;
    }
  }
  
  async stopRecording(): Promise<void> {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    this.isVoiceDetected = false;
    this.preRollBuffer = [];
    
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
    
    this.config.onStatusChange('idle');
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
}
