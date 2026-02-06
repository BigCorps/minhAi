// lib/gemini.ts (VERSÃO CHATGPT - FUNCIONA!)

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Gera resposta usando ChatGPT (GPT-4o-mini)
 */
export async function generateAssistantResponse(
  userMessage: string,
  companyContext: {
    companyName: string;
    systemPrompt?: string;
    greetingMessage?: string;
    conversationHistory?: any[];
  },
  conversationHistory?: ChatMessage[]
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: companyContext.systemPrompt || 
        `Você é um assistente virtual inteligente da empresa ${companyContext.companyName}.

Regras importantes:
1. Seja breve e objetivo (máximo 2-3 frases)
2. Use linguagem natural e amigável
3. Fale em português brasileiro
4. Se não souber algo, seja honesto
5. Não invente informações sobre a empresa`
    }
  ];

  // Adicionar histórico se fornecido
  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory);
  }

  // Adicionar mensagem atual
  messages.push({
    role: 'user',
    content: userMessage
  });

  console.log('🤖 Chamando ChatGPT...');
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    temperature: 0.7,
    max_tokens: 150,
  });

  const response = completion.choices[0].message.content || 'Desculpe, não consegui processar sua pergunta.';
  
  console.log('✅ ChatGPT respondeu:', response.substring(0, 50) + '...');
  
  return response;
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
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Analise a mensagem e identifique a intenção.
Responda APENAS em JSON válido:
{
  "intent": "pix|whatsapp|instagram|question|other",
  "confidence": 0.0-1.0,
  "extractedData": {}
}`
      },
      {
        role: 'user',
        content: userMessage
      }
    ],
    temperature: 0.2,
    max_tokens: 100,
  });

  try {
    const response = completion.choices[0].message.content || '{}';
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return {
      intent: 'other',
      confidence: 0.5,
    };
  }
}