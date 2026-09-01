import OpenAI from 'openai';

// Cliente OpenAI singleton
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configurações padrão
export const OPENAI_CONFIG = {
  // Whisper (Speech-to-Text)
  whisper: {
    model: 'whisper-1',
    language: 'pt', // Português
    temperature: 0,
  },
  
  // GPT-4o-mini (Processamento)
  gpt: {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 500, // Respostas concisas
  },
  
  // TTS (Text-to-Speech)
  tts: {
    model: 'tts-1', // Mais rápido, boa qualidade
    voice: 'onyx', // ← MUDANÇA: Voz masculina natural (melhor em PT-BR)
    speed: 1.0,
  },
};

// Função para transcrever áudio (Whisper)
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
  
  const response = await openai.audio.transcriptions.create({
    file,
    model: OPENAI_CONFIG.whisper.model,
    language: OPENAI_CONFIG.whisper.language,
    temperature: OPENAI_CONFIG.whisper.temperature,
  });
  
  return response.text;
}

// Função para processar com GPT
export async function processWithGPT(
  userMessage: string,
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];
  
  const response = await openai.chat.completions.create({
    model: OPENAI_CONFIG.gpt.model,
    messages,
    temperature: OPENAI_CONFIG.gpt.temperature,
    max_tokens: OPENAI_CONFIG.gpt.max_tokens,
  });
  
  return response.choices[0].message.content || '';
}

// ============================================================
// ── Function-calling (usado pela demo /lead) ────────────────
// Validado contra openai@4.28.0 (versão exata do projeto):
// - ChatCompletionTool: { type: 'function', function: FunctionDefinition }
// - ChatCompletionMessageToolCall: { id, type: 'function', function: { name, arguments (string JSON) } }
// processWithGPT (acima) continua intacta e em uso pela rota de
// produção /api/voice/process. Esta função é só uma adição.
// ============================================================

export interface GPTToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface GPTToolsResult {
  /** Texto de resposta do modelo. Pode ser '' se o modelo só chamou tools. */
  text: string;
  /** Lista de tool calls que o modelo decidiu fazer neste turno (pode ser mais de uma). */
  toolCalls: GPTToolCall[];
}

/**
 * Variante de processWithGPT com suporte a function-calling.
 * Usada exclusivamente pela demo /lead (rota /api/voice/process-demo).
 *
 * Importante: a API da OpenAI pode devolver MAIS DE UMA tool call no
 * mesmo turno (ex: lead diz "sou o Carlos e quero fechar o pedido").
 * O caller deve iterar sobre toolCalls, nunca assumir só uma.
 */
export async function processWithGPTTools(
  userMessage: string,
  systemPrompt: string,
  tools: OpenAI.Chat.ChatCompletionTool[],
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<GPTToolsResult> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // A API da OpenAI exige que, se 'tools' for enviado, não esteja
  // vazio (erro 400 com tools: [] + tool_choice: 'auto'). Quando o
  // caller passa array vazio (ex: chamada de retry que só quer texto,
  // sem oferecer functions de novo), omitimos tools/tool_choice da
  // requisição inteiramente, em vez de mandar um array vazio.
  const hasTools = tools.length > 0;

  const response = await openai.chat.completions.create({
    model: OPENAI_CONFIG.gpt.model,
    messages,
    temperature: OPENAI_CONFIG.gpt.temperature,
    max_tokens: OPENAI_CONFIG.gpt.max_tokens,
    ...(hasTools ? { tools, tool_choice: 'auto' as const } : {}),
  });

  const choice = response.choices[0];
  const text = choice.message.content || '';

  const toolCalls: GPTToolCall[] = (choice.message.tool_calls || []).map(tc => {
    let parsedArgs: Record<string, any> = {};
    try {
      parsedArgs = JSON.parse(tc.function.arguments);
    } catch (err) {
      console.warn(`⚠️ Falha ao parsear arguments de tool_call ${tc.function.name}:`, tc.function.arguments);
    }
    return {
      id: tc.id,
      name: tc.function.name,
      arguments: parsedArgs,
    };
  });

  return { text, toolCalls };
}

// Função para gerar áudio (TTS)
export async function generateSpeech(text: string): Promise<ArrayBuffer> {
  const response = await openai.audio.speech.create({
    model: OPENAI_CONFIG.tts.model,
    voice: OPENAI_CONFIG.tts.voice,
    input: text,
    speed: OPENAI_CONFIG.tts.speed,
  });
  
  return response.arrayBuffer();
}

// Função completa: recebe áudio, processa e retorna áudio
export async function processVoiceInteraction(
  audioBlob: Blob,
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{
  transcription: string;
  response: string;
  audioResponse: ArrayBuffer;
}> {
  // 1. Transcrever áudio do usuário
  const transcription = await transcribeAudio(audioBlob);
  
  // 2. Processar com GPT
  const response = await processWithGPT(transcription, systemPrompt, conversationHistory);
  
  // 3. Gerar áudio da resposta
  const audioResponse = await generateSpeech(response);
  
  return {
    transcription,
    response,
    audioResponse,
  };
}