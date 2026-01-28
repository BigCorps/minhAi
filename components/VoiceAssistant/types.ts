// components/VoiceAssistant/types.ts

export interface VoiceAssistantProps {
  companyId: string;
  companyName: string;
  wakeWord: string;
  greetingMessage: string;
  theme?: 'dark' | 'light';
  isMaximized?: boolean;
}

export interface QRCodeData {
  type: 'whatsapp' | 'instagram' | 'pix';
  qrCodeUrl: string;
  qrContent: string;
  displayText: string;
  amount?: string;
  companyName?: string;
}

export interface PIXConfirmationData {
  transactionId: string;
  amount: string;
  qrCodeUrl: string;
  pixCode: string;
}

export interface VoiceAssistantState {
  isListening: boolean;
  isProcessing: boolean;
  isPlayingAudio: boolean;
  error: string;
  permissionGranted: boolean;
  showStartButton: boolean;
  qrCodeData: QRCodeData | null;
  pixConfirmationData: PIXConfirmationData | null;
}

export interface AudioRefs {
  current: HTMLAudioElement | null;
  feedback: HTMLAudioElement | null;
}

export interface SpeechRecognitionRefs {
  recognition: any;
  wakeWordDetector: any;
  processingQuestion: boolean;
  consecutiveRestarts: number;
  lastRestartTime: number;
  lastRestartAttempt: number;
  audioUnlocked: boolean;
  isActive: boolean;
}
