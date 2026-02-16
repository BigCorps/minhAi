/**
 * Cliente WebSocket para Google Speech-to-Text Streaming
 * VERSÃO V3 - THRESHOLD ADAPTATIVO (Mobile + Desktop)
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
  
  // ✅ AJUSTES DE SENSIBILIDADE (V3)
  private isVoiceDetected: boolean = false;
  private preRollBuffer: ArrayBuffer[] = [];
  private readonly MAX_PRE_ROLL_CHUNKS = 8; // ~2s de contexto inicial
  private silenceCounter: number = 0;
  
  // ✅ "PACIÊNCIA" DO ASSISTENTE:
  // ~10s (40 chunks * 256ms) antes de pausar a transmissão
  private readonly SILENCE_THRESHOLD = 40; 
  
  // ✅ THRESHOLD ADAPTATIVO (V3):
  // Detecta automaticamente se é mobile ou desktop
  private readonly VOLUME_THRESHOLD: number;
  
  // ✅ DEBUG: Contador para logs periódicos
  private debugCounter: number = 0;

  constructor(config: GoogleSpeechConfig) {
    this.config = {
      onTranscript: config.onTranscript,
      onError: config.onError || (() => {}),
      onReady: config.onReady || (() => {}),
      onStatusChange: config.onStatusChange || (() => {}),
      languageCode: config.languageCode || 'pt-BR',
      sampleRate: config.sampleRate || 16000,
    };
    
    // ✅ DETECÇÃO AUTOMÁTICA: Mobile vs Desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Mobile: Threshold original (funciona bem)
      this.VOLUME_THRESHOLD = 0.015; // 1.5%
      console.log('📱 Detectado MOBILE - Threshold: 1.5%');
    } else {
      // Desktop: Threshold reduzido (mais sensível)
      this.VOLUME_THRESHOLD = 0.009; // 0.3%
      console.log('💻 Detectado DESKTOP - Threshold: 0.3%');
    }
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
        
        // ✅ DEBUG: Log periódico de volume (a cada 20 chunks ~5s)
        this.debugCounter++;
        if (this.debugCounter % 20 === 0) {
          const rmsPercent = (rms * 100).toFixed(3);
          const thresholdPercent = (this.VOLUME_THRESHOLD * 100).toFixed(3);
          console.log(`🎚️ Volume: ${rmsPercent}% | Threshold: ${thresholdPercent}% | Detectando: ${this.isVoiceDetected ? 'SIM ✅' : 'NÃO ⭕'}`);
        }
        
        // Converter para Int16
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const buffer = int16Data.buffer;

        // ✅ LÓGICA DE VAD V3 (Threshold Adaptativo)
        if (rms > this.VOLUME_THRESHOLD) {
          this.silenceCounter = 0;
          if (!this.isVoiceDetected) {
            console.log('🎤 VOZ DETECTADA - Volume:', (rms * 100).toFixed(3) + '%');
            this.isVoiceDetected = true;
            this.config.onStatusChange('recording');
            
            // Enviar buffer acumulado (pre-roll)
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.preRollBuffer.forEach(chunk => this.ws!.send(chunk));
              this.preRollBuffer = [];
            }
          }
        } else {
          this.silenceCounter++;
          // Só para de transmitir após longo período de silêncio
          if (this.isVoiceDetected && this.silenceCounter > this.SILENCE_THRESHOLD) {
            console.log('🤫 SILÊNCIO PROLONGADO - Pausando transmissão');
            this.isVoiceDetected = false;
            this.config.onStatusChange('idle');
          }
        }

        // Transmitir ou acumular
        if (this.isVoiceDetected) {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(buffer);
          }
        } else {
          // Acumular pre-roll buffer
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
      
      console.log('🎙️ Gravação iniciada com threshold:', (this.VOLUME_THRESHOLD * 100).toFixed(3) + '%');
      
    } catch (error) {
      this.config.onError(error as Error);
      throw error;
    }
  }
  
  async stopRecording(): Promise<void> {
    if (!this.isRecording) return;
    
    console.log('🛑 Parando gravação');
    
    this.isRecording = false;
    this.isVoiceDetected = false;
    this.preRollBuffer = [];
    this.debugCounter = 0;
    
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
