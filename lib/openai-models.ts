import 'server-only';

// Defaults preservam os modelos atuais; overrides são opcionais e server-side.
export const OPENAI_MODELS = {
  fast: process.env.OPENAI_MODEL_FAST || 'gpt-4o-mini',
  smart: process.env.OPENAI_MODEL_SMART || 'gpt-4o',
  tools: process.env.OPENAI_MODEL_TOOLS || 'gpt-4o-mini',
  vision: process.env.OPENAI_MODEL_VISION || 'gpt-4o',
  transcribe: process.env.OPENAI_MODEL_TRANSCRIBE || 'whisper-1',
  embedding: process.env.OPENAI_MODEL_EMBEDDING || 'text-embedding-3-small',
  tts: process.env.OPENAI_MODEL_TTS || 'tts-1',
} as const;
