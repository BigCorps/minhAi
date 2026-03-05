/**
 * GoogleSpeechWebSocket Enhanced
 * 
 * Extensão do GoogleSpeechWebSocket original que adiciona suporte a:
 * - Wake Word Buffer: Captura áudio desde a detecção da wake word
 * - Immediate Activation: Ativa o streaming imediatamente após wake word
 * - Zero-Loss Audio: Garante que nenhuma fala é perdida
 * 
 * Mantém compatibilidade total com a versão anterior.
 */

export interface GoogleSpeechEnhancedConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onReady?: () => void;
  onStatusChange?: (status: 'idle' | 'recording' | 'processing' | 'wake_word_detected') => void;
  onVolumeChange?: (rms: number) => void;
  languageCode?: string;
  sampleRate?: number;
  volumeThreshold?: number;
  silenceThreshold?: number;
  
  // ✅ NOVO: Callbacks para wake word buffer
  onWakeWordBufferReady?: (bufferSize: number) => void;
  onAudioChunkCaptured?: (chunkSize: number) => void;
}

export class GoogleSpeechWebSocketEnhanced {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording: boolean = false;
  private config: Required<GoogleSpeechEnhancedConfig>;

  // VAD state
  private isVoiceDetected: boolean = false;
  private preRollBuffer: ArrayBuffer[] = [];
  private readonly MAX_PRE_ROLL_CHUNKS = 8;
  private silenceCounter: number = 0;

  // ✅ NOVO: Wake Word Buffer
  private wakeWordBuffer: ArrayBuffer[] = [];
  private readonly MAX_WAKE_WORD_BUFFER_CHUNKS = 20;
  private isWakeWordBufferActive: boolean = false;
  private wakeWordBufferStartTime: number = 0;

  private readonly SILENCE_THRESHOLD: number;
  private readonly VOLUME_THRESHOLD: number;

  constructor(config: GoogleSpeechEnhancedConfig) {
    this.config = {
      onTranscript: config.onTranscript,
      onError: config.onError || (() => {}),
      onReady: config.onReady || (() => {}),
      onStatusChange: config.onStatusChange || (() => {}),
      onVolumeChange: config.onVolumeChange || (() => {}),
      onWakeWordBufferReady: config.onWakeWordBufferReady || (() => {}),
      onAudioChunkCaptured: config.onAudioChunkCaptured || (() => {}),
      languageCode: config.languageCode || 'pt-BR',
      sampleRate: config.sampleRate || 16000,
      volumeThreshold: config.volumeThreshold ?? 0.015,
      silenceThreshold: config.silenceThreshold ?? 120,
    };

    this.VOLUME_THRESHOLD = this.config.volumeThreshold;
    this.SILENCE_THRESHOLD = this.config.silenceThreshold;

    console.log(`🎛️ GoogleSpeechWebSocketEnhanced criado — volumeThreshold: ${this.VOLUME_THRESHOLD}, silenceThreshold: ${this.SILENCE_THRESHOLD}`);
  }

  /**
   * ✅ NOVO: Ativa o buffer de wake word
   * Chamado quando a wake word é detectada
   */
  activateWakeWordBuffer(): void {
    console.log('🟣 Ativando Wake Word Buffer');
    this.isWakeWordBufferActive = true;
    this.wakeWordBufferStartTime = Date.now();
    this.wakeWordBuffer = [];
    this.config.onStatusChange('wake_word_detected');
  }

  /**
   * ✅ NOVO: Obtém o buffer de wake word capturado
   */
  getWakeWordBuffer(): ArrayBuffer[] {
    return [...this.wakeWordBuffer];
  }

  /**
   * ✅ NOVO: Limpa o buffer de wake word
   */
  clearWakeWordBuffer(): void {
    this.wakeWordBuffer = [];
    this.isWakeWordBufferActive = false;
  }

  /**
   * ✅ NOVO: Envia o buffer de wake word para o servidor
   * Deve ser chamado após a ativação para garantir que o áudio capturado seja processado
   */
  flushWakeWordBuffer(): void {
    if (this.wakeWordBuffer.length === 0) return;

    console.log(`📤 Enviando Wake Word Buffer (${this.wakeWordBuffer.length} chunks)`);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.wakeWordBuffer.forEach(chunk => {
        this.ws!.send(chunk);
      });
    }

    this.wakeWordBuffer = [];
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

        this.ws.onerror = () => {
          this.config.onError(new Error('WebSocket connection error'));
          reject(new Error('WebSocket connection error'));
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
        }
      });

      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);

        // Calcular RMS (volume)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        this.config.onVolumeChange(rms);

        // Converter para Int16
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const buffer = int16Data.buffer;

        // ✅ NOVO: Se wake word buffer está ativo, capturar áudio
        if (this.isWakeWordBufferActive) {
          this.wakeWordBuffer.push(buffer);
          if (this.wakeWordBuffer.length > this.MAX_WAKE_WORD_BUFFER_CHUNKS) {
            this.wakeWordBuffer.shift();
          }
          this.config.onAudioChunkCaptured(buffer.byteLength);
          
          // Se o buffer atingiu o máximo, avisar que está pronto
          if (this.wakeWordBuffer.length === this.MAX_WAKE_WORD_BUFFER_CHUNKS) {
            this.config.onWakeWordBufferReady(this.wakeWordBuffer.length);
          }
        }

        // LÓGICA DE VAD — usa thresholds da instância
        if (rms > this.VOLUME_THRESHOLD) {
          this.silenceCounter = 0;
          if (!this.isVoiceDetected) {
            console.log('🎤 VOZ DETECTADA');
            this.isVoiceDetected = true;
            this.config.onStatusChange('recording');

            // Enviar preRoll (contexto anterior ao início da fala)
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.preRollBuffer.forEach(chunk => this.ws!.send(chunk));
              this.preRollBuffer = [];
            }

            // ✅ NOVO: Se wake word buffer está ativo, enviar agora
            if (this.isWakeWordBufferActive) {
              this.flushWakeWordBuffer();
            }
          }
        } else {
          this.silenceCounter++;
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
    this.clearWakeWordBuffer();
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
