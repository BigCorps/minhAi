
export interface GoogleSpeechConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onReady?: () => void;
  onStatusChange?: (status: 'idle' | 'recording' | 'processing') => void;
  onVolumeChange?: (rms: number) => void; // ✅ NOVO: expõe nível de ruído ao componente pai
  languageCode?: string;
  sampleRate?: number;

  // ✅ NOVO: thresholds configuráveis — permitem valores diferentes para mobile e desktop
  volumeThreshold?: number;   // Nível mínimo de RMS para considerar voz ativa
  silenceThreshold?: number;  // Nº de chunks silenciosos antes de pausar transmissão
}

export class GoogleSpeechWebSocket {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording: boolean = false;
  private config: Required<GoogleSpeechConfig>;

  // VAD state
  private isVoiceDetected: boolean = false;
  private preRollBuffer: ArrayBuffer[] = [];
  private readonly MAX_PRE_ROLL_CHUNKS = 8;
  private silenceCounter: number = 0;

  // ✅ Thresholds agora vêm do config (com fallback para valores desktop seguros)
  private readonly SILENCE_THRESHOLD: number;
  private readonly VOLUME_THRESHOLD: number;

  constructor(config: GoogleSpeechConfig) {
    this.config = {
      onTranscript: config.onTranscript,
      onError: config.onError || (() => {}),
      onReady: config.onReady || (() => {}),
      onStatusChange: config.onStatusChange || (() => {}),
      onVolumeChange: config.onVolumeChange || (() => {}),
      languageCode: config.languageCode || 'pt-BR',
      sampleRate: config.sampleRate || 16000,
      volumeThreshold: config.volumeThreshold ?? 0.015,
      silenceThreshold: config.silenceThreshold ?? 120,
    };

    // ✅ Fixar os thresholds na instância (imutáveis após construção, como antes)
    this.VOLUME_THRESHOLD = this.config.volumeThreshold;
    this.SILENCE_THRESHOLD = this.config.silenceThreshold;

    console.log(`🎛️ GoogleSpeechWebSocket criado — volumeThreshold: ${this.VOLUME_THRESHOLD}, silenceThreshold: ${this.SILENCE_THRESHOLD}`);
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
      // ✅ getUserMedia sem sampleRate fixo: deixar o browser negociar com o hardware.
      // Forçar 16000 em mobile pode causar rejeição silenciosa ou distorção.
      // O sampleRate configurado é usado apenas no AudioContext (downsample via Web Audio).
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          // sampleRate removido intencionalmente — compatibilidade mobile
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

        // ✅ Expor volume ao componente pai (para exibir aviso de ruído no UI)
        this.config.onVolumeChange(rms);

        // Converter para Int16
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const buffer = int16Data.buffer;

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
