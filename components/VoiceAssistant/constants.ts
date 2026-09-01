// components/VoiceAssistant/utils/constants.ts

export const DEFAULT_WAKE_WORDS = ['oi', 'olá', 'ola'];

export const END_COMMANDS = [
  'tchau',
  'obrigado',
  'até logo',
  'encerrar',
  'finalizar',
  'pode parar',
  'pare',
  'desligar',
  'adeus',
  'valeu',
];

export const STOP_COMMANDS = [
  'para',
  'pare',
  'parar',
  'stop',
  'silencio',
  'silêncio',
  'cala boca',
  'cala a boca',
  'calça boca',
  'chega',
  'obrigado',
  'obrigada',
  'tá bom',
  'ta bom',
  'beleza',
  'ok entendi',
];

export const EXPLICIT_STOP_PHRASES = [
  'pare',
  'para',
  'parar',
  'cala boca',
  'cala a boca',
  'calça boca',
  'silencio',
  'silêncio',
  'stop',
  'chega',
  'para de falar',
  'pare de falar',
  'para ai',
  'para aí'
];

export const FEEDBACK_MESSAGES = [
  'Entendi!',
  'Processando...',
  'Um momento!',
  'Aguarde...',
  'Um instante!',
];

export const SPEECH_RECOGNITION_CONFIG = {
  lang: 'pt-BR',
  continuousMobile: false,
  continuousDesktop: true,
  maxAlternativesMobile: 3,
  maxAlternativesDesktop: 5,
  restartDelay: 300,
  loopDetectionThreshold: 3,
  loopDetectionWindow: 2000,
};

export const AUDIO_CONFIG = {
  playbackRate: 1.05,
  feedbackVolume: 0.9,
  feedbackPlaybackRate: 1.0,
  silentAudioVolume: 0.01,
  minFeedbackTime: 1200,
  feedbackDelay: 1000,
  audioStartTimeout: 1500,
};
