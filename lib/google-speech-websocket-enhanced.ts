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
  onWakeWordBufferReady?: (bufferSize: number) => void;
  onAudioChunkCaptured?: (chunkSize: number) => void;
}

export class GoogleSpeechWebSocketEnhanced {
  private ws: WebSocket | null = null;
  private isRecording: boolean = false;
  private config: Required<GoogleSpeechEnhancedConfig>;
  private wakeWordBuffer: ArrayBuffer[] = [];
  private isWakeWordBufferActive: boolean = false;

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
  }

  activateWakeWordBuffer(): void {
    this.isWakeWordBufferActive = true;
    this.wakeWordBuffer = [];
    this.config.onStatusChange('wake_word_detected');
  }

  flushWakeWordBuffer(): void {
    if (this.wakeWordBuffer.length === 0) return;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.wakeWordBuffer.forEach(chunk => this.ws!.send(chunk));
    }
    this.wakeWordBuffer = [];
  }

  async startRecording(): Promise<void> {
    // Lógica de captura de áudio com suporte a buffer
    this.isRecording = true;
  }

  async stopRecording(): Promise<void> {
    this.isRecording = false;
    this.isWakeWordBufferActive = false;
    this.wakeWordBuffer = [];
  }
}
