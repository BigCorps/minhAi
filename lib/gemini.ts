// lib/gemini.ts

import { VertexAI } from '@google-cloud/vertexai';

/**
 * Client Gemini 1.5 Flash via Vertex AI
 */

let vertexAI: VertexAI | null = null;

export function getVertexAI(): VertexAI {
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1',
    });
  }
  return vertexAI;
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
  const vertex = getVertexAI();
  
  const model = vertex.getGenerativeModel({
    model: 'gemini-1.5-flash-002', // Modelo mais rápido
  });
  
  const contents: GeminiMessage[] = conversationHistory ?? [];
  
  // Adicionar mensagem do usuário
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });
  
  const request = {
    contents,
    generationConfig: {
      temperature: config?.temperature ?? 0.7,
      maxOutputTokens: config?.maxOutputTokens ?? 256,
      topP: config?.topP ?? 0.95,
      topK: config?.topK ?? 40,
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH' as any,
        threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any,
        threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any,
        threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT' as any,
        threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
      },
    ],
  };
  
  const response = await model.generateContent(request);
  const result = response.response;
  
  if (!result.candidates || result.candidates.length === 0) {
    throw new Error('Nenhuma resposta gerada pelo Gemini');
  }
  
  const text = result.candidates[0].content.parts
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
    companyDescription?: string;
    knowledgeBase?: string;
  },
  conversationHistory?: GeminiMessage[]
): Promise<string> {
  const systemPrompt = `
Você é um assistente virtual inteligente da empresa ${companyContext.companyName}.

${companyContext.companyDescription ? `Sobre a empresa: ${companyContext.companyDescription}` : ''}

${companyContext.knowledgeBase ? `Base de conhecimento:\n${companyContext.knowledgeBase}` : ''}

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
 * TODO: Implementar depois se necessário
 */
export async function* generateStreamWithGemini(
  prompt: string,
  config?: GeminiConfig
): AsyncGenerator<string> {
  const vertex = getVertexAI();
  
  const model = vertex.getGenerativeModel({
    model: 'gemini-1.5-flash-002',
  });
  
  const request = {
    contents: [{
      role: 'user' as const,
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      temperature: config?.temperature ?? 0.7,
      maxOutputTokens: config?.maxOutputTokens ?? 256,
    },
  };
  
  const streamingResponse = await model.generateContentStream(request);
  
  for await (const chunk of streamingResponse.stream) {
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