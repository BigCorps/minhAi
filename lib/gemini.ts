// lib/gemini.ts

import { 
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

/**
 * Cliente Gemini 1.5 Flash via Google AI API
 */

let genAI: GoogleGenerativeAI | null = null;

export function getGoogleAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY não configurada');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiConfig {
  temperature?: number; // 0-2 (criatividade)
  maxOutputTokens?: number; // Máximo de tokens na resposta
  topP?: number; // 0-1 (diversidade)
  topK?: number; // Número de tokens considerados
}

/**
 * Gera resposta com Gemini 1.5 Flash
 */
export async function generateWithGemini(
  prompt: string,
  config?: GeminiConfig,
  conversationHistory?: GeminiMessage[]
): Promise<string> {
  const genAI = getGoogleAI();
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });
  
  const contents: GeminiMessage[] = conversationHistory ?? [];
  
  // Adicionar mensagem do usuário
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });
  
  const generationConfig = {
    temperature: config?.temperature ?? 0.7,
    maxOutputTokens: config?.maxOutputTokens ?? 256,
    topP: config?.topP ?? 0.95,
    topK: config?.topK ?? 40,
  };
  
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];
  
  const result = await model.generateContent({
    contents,
    generationConfig,
    safetySettings,
  });
  
  const response = result.response;
  
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('Nenhuma resposta gerada pelo Gemini');
  }
  
  const text = response.candidates[0].content.parts
    .map(part => part.text)
    .join('');
  
  return text;
}

/**
 * Gera resposta com contexto de empresa
 */
export async function generateAssistantResponse(
  userMessage: string,
  companyContext: {
    companyName: string;
    systemPrompt?: string;
    greetingMessage?: string;
    conversationHistory?: any[];
  },
  conversationHistory?: GeminiMessage[]
): Promise<string> {
  const systemPrompt = `
${companyContext.systemPrompt || `Você é um assistente virtual inteligente da empresa ${companyContext.companyName}.`}

Regras importantes:
1. Seja breve e objetivo (máximo 2-3 frases)
2. Use linguagem natural e amigável
3. Fale em português brasileiro
4. Se não souber algo, seja honesto
5. Não invente informações sobre a empresa

Mensagem do cliente: ${userMessage}

Responda de forma natural e útil:
`.trim();
  
  return generateWithGemini(systemPrompt, {
    temperature: 0.7,
    maxOutputTokens: 150, // Respostas curtas
  }, conversationHistory);
}

/**
 * Streaming de resposta (para UX melhor)
 */
export async function* generateStreamWithGemini(
  prompt: string,
  config?: GeminiConfig
): AsyncGenerator<string> {
  const genAI = getGoogleAI();
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });
  
  const generationConfig = {
    temperature: config?.temperature ?? 0.7,
    maxOutputTokens: config?.maxOutputTokens ?? 256,
    topP: config?.topP ?? 0.95,
    topK: config?.topK ?? 40,
  };
  
  const result = await model.generateContentStream({
    contents: [{
      role: 'user',
      parts: [{ text: prompt }],
    }],
    generationConfig,
  });
  
  for await (const chunk of result.stream) {
    const text = chunk.candidates?.[0]?.content?.parts
      .map(part => part.text)
      .join('') ?? '';
    
    if (text) {
      yield text;
    }
  }
}

/**
 * Extrai intenção do usuário (útil para detectar comandos)
 */
export async function extractIntent(
  userMessage: string
): Promise<{
  intent: 'pix' | 'whatsapp' | 'instagram' | 'question' | 'other';
  confidence: number;
  extractedData?: any;
}> {
  const prompt = `
Analise a mensagem do usuário e identifique a intenção:

Mensagem: "${userMessage}"

Intenções possíveis:
- pix: Gerar cobrança PIX (extrair valor)
- whatsapp: Mostrar WhatsApp da empresa
- instagram: Mostrar Instagram da empresa
- question: Pergunta geral sobre a empresa
- other: Outra coisa

Responda APENAS em JSON:
{
  "intent": "...",
  "confidence": 0.0-1.0,
  "extractedData": {...}
}
`.trim();
  
  const response = await generateWithGemini(prompt, {
    temperature: 0.2, // Baixa temperatura para mais precisão
    maxOutputTokens: 100,
  });
  
  // Parse JSON
  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return {
      intent: 'other',
      confidence: 0.5,
    };
  }
}