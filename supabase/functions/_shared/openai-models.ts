// Defaults preservam os modelos atuais; overrides são opcionais e server-side.
export const OPENAI_MODELS = {
  fast: Deno.env.get('OPENAI_MODEL_FAST') || 'gpt-4o-mini',
  smart: Deno.env.get('OPENAI_MODEL_SMART') || 'gpt-4o',
  tools: Deno.env.get('OPENAI_MODEL_TOOLS') || 'gpt-4o-mini',
  vision: Deno.env.get('OPENAI_MODEL_VISION') || 'gpt-4o',
  transcribe: Deno.env.get('OPENAI_MODEL_TRANSCRIBE') || 'whisper-1',
  embedding: Deno.env.get('OPENAI_MODEL_EMBEDDING') || 'text-embedding-3-small',
  tts: Deno.env.get('OPENAI_MODEL_TTS') || 'tts-1',
} as const;
