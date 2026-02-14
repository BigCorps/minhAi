/**
 * Cliente WebSocket para Google Speech-to-Text Streaming
 * VERSÃO V2 - MAIOR RESILIÊNCIA E SENSIBILIDADE
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
  
  // ✅ AJUSTES DE SENSIBILIDADE (V2)
  private isVoiceDetected: boolean = false;
  private preRollBuffer: ArrayBuffer[] = [];
  private readonly MAX_PRE_ROLL_CHUNKS = 8; // Aumentado para ~2s de contexto inicial
  private silenceCounter: number = 0;
  
  // ✅ "PACIÊNCIA" DO ASSISTENTE:
  // Aumentado para ~10s (40 chunks * 256ms) antes de pausar a transmissão
  // Isso evita que o assistente fique "oscilando" entre ativo e aguarde durante pausas naturais da fala.
  private readonly SILENCE_THRESHOLD = 40; 
  
  // ✅ LIMITE DE VOLUME MAIS SENSÍVEL:
  // Reduzido de 0.045 para 0.015 para captar falas mais baixas ou distantes.
  private readonly VOLUME_THRESHOLD = 0.015; 

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
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
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
            if (data.type === 'ping' && this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: 'pong' }));
              return;
            }
            if (data.type === 'ready') {
              this.config.onReady();
              resolve();
            } else if (data.type === 'transcript') {
              this.config.onTranscript(data.text, data.isFinal);
            } else if (data.type === 'error') {
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
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.scriptProcessor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Calcular RMS (Volume)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        // Converter para Int16
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const buffer = int16Data.buffer;

        // LÓGICA DE VAD V2
        if (rms > this.VOLUME_THRESHOLD) {
          this.silenceCounter = 0;
          if (!this.isVoiceDetected) {
            console.log('🎤 VOZ DETECTADA');
            this.isVoiceDetected = true;
            this.config.onStatusChange('recording');
            
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.preRollBuffer.forEach(chunk => this.ws!.send(chunk));
              this.preRollBuffer = [];
            }
          }
        } else {
          this.silenceCounter++;
          // Só para de transmitir após um longo período de silêncio real
          if (this.isVoiceDetected && this.silenceCounter > this.SILENCE_THRESHOLD) {
            console.log('🤫 SILÊNCIO PROLONGADO - Pausando');
            this.isVoiceDetected = false;
            this.config.onStatusChange('idle');
          }
        }

        if (this.isVoiceDetected) {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(buffer);
          }
        } else {
          this.preRollBuffer.push(buffer);
          if (this.preRollBuffer.length > this.MAX_PRE_ROLL_CHUNKS) {
            this.preRollBuffer.shift();
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
    if (this.scriptProcessor) this.scriptProcessor.disconnect();
    if (this.source) this.source.disconnect();
    if (this.audioContext) await this.audioContext.close();
    if (this.mediaStream) this.mediaStream.getTracks().forEach(t => t.stop());
    this.config.onStatusChange('idle');
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}