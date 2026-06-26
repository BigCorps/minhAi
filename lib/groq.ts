// lib/groq.ts
//
// Cliente GROQ para conversa livre simples — distinto do uso existente
// em app/api/groq/classify/route.ts, que é um ROTEADOR DE INTENÇÃO
// (decide se uma functionKey deve disparar, nunca conversa sobre
// produto/preço/empresa por instrução explícita do prompt).
//
// Esta lib serve a um propósito diferente: conversa livre de fato,
// usada pela demo /lead depois que objetivo_cumprido = true (decisão
// de produto: pós-objetivo, sem tools/function-calling, só GROQ
// conversando, custo mais baixo que GPT-4o-mini).
//
// Não duplica nem substitui app/api/groq/classify/route.ts.

import Groq from 'groq-sdk';

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const GROQ_CONFIG = {
  model: 'openai/gpt-oss-20b',
  temperature: 0.7,
  max_tokens: 500,
};

/**
 * Conversa livre simples via GROQ, sem function-calling/roteamento.
 * Usada pela demo /lead após objetivo_cumprido = true, quando não
 * oferecemos mais tools e só queremos manter a conversa fluindo a
 * custo baixo, com instrução de direcionar gentilmente para o
 * cadastro ou para o WhatsApp de contato da minhAi quando relevante.
 */
export async function processWithGroq(
  userMessage: string,
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: GROQ_CONFIG.model,
    temperature: GROQ_CONFIG.temperature,
    max_tokens: GROQ_CONFIG.max_tokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}