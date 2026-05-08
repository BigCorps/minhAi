// app/api/groq/classify/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { transcript, functionsContext, sessionContext, forceResponse } = await req.json();
    
    if (!transcript || !functionsContext) {
      return NextResponse.json({ response: null, functionKey: null });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const hasProfile = functionsContext?.includes('Cliente logado:');

    // ── Lógica de Contexto Pendente ──
    const lastFunctions: string[] = sessionContext?.lastFunctions ?? [];
    const lastFunctionKey = lastFunctions[lastFunctions.length - 1] ?? '';

    const isPendingPayment = lastFunctionKey.startsWith('__pending__');
    const pendingFunction = isPendingPayment ? lastFunctionKey.replace('__pending__', '') : null;
    const isPaymentChoice = lastFunctionKey === '__payment_choice__';

    const memoryBlock = sessionContext?.summary || lastFunctions.length > 0
      ? `\n\n## MEMÓRIA RECENTE:\n${sessionContext?.summary ?? ''}\nÚltimas ações: ${lastFunctions.join(', ')}`
      : '';

    // ── Instrução de Roteamento (Flex Tier) ──
    const pendingInstruction = isPendingPayment
      ? `\n\n## 🚨 REGRA CRÍTICA — AGUARDANDO VALOR:
O cliente já escolheu a função "${pendingFunction}", mas AINDA NÃO informou o valor.

1. SE O TRANSCRIPT NÃO CONTIVER VALOR NUMÉRICO:
Retorne APENAS o JSON: {"response": "Qual o valor?"}
(NÃO inclua functionKey).

2. SE O TRANSCRIPT CONTIVER VALOR NUMÉRICO:
Retorne: {"response": "Gerando agora.", "functionKey": "${pendingFunction}"}`
      : isPaymentChoice
      ? `\n\n## 🚨 REGRA CRÍTICA — AGUARDANDO MÉTODO DE PAGAMENTO:
O cliente quer pagar, mas ainda não escolheu o método.

Como os métodos (Link, Débito e Crédito) possuem telas interativas próprias no sistema minhAi, você DEVE retornar a functionKey PADRÃO imediatamente, MESMO QUE O CLIENTE NÃO DIGA O VALOR.

Mapeie a escolha e retorne OBRIGATORIAMENTE EM FORMATO JSON:
- "link" → {"response": "Abrindo link de pagamento.", "functionKey": "link_pagamento"}
- "débito" (celular/NFC) → {"response": "Preparando débito.", "functionKey": "nfc_debito"}
- "crédito" (celular/NFC) → {"response": "Preparando crédito.", "functionKey": "nfc_credito"}
- "débito" (maquininha/TEF) → {"response": "Preparando maquininha.", "functionKey": "tef_debito"}
- "crédito" (maquininha/TEF) → {"response": "Preparando maquininha.", "functionKey": "tef_credito"}

REGRA EXCLUSIVA PARA O PIX (pois não tem tela de input própria):
- Pix COM valor: {"response": "Gerando Pix.", "functionKey": "pix_generate"}
- Pix SEM valor: {"response": "Qual o valor do Pix?", "functionKey": "__pending__pix_generate"}

Responda APENAS com o JSON, sem adicionar texto fora das chaves.`
      : '';

    // ── Chamada à API da Groq via Fetch (Tier Flex) ──
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        service_tier: 'flex',
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: `Você é o cérebro de roteamento de um assistente de voz para empresas (SaaS minhAi).
Sua missão é ler o que o usuário disse e decidir se ele quer executar uma das funções abaixo ou apenas conversar.

## FUNÇÕES DISPONÍVEIS:
${functionsContext}

## REGRAS:
- Responda OBRIGATORIAMENTE em JSON: {"response": "...", "functionKey": "..."}
- Se for apenas conversa, functionKey deve ser null.
- Respostas máximo 2 frases curtas — será falado em voz alta.
- Português brasileiro natural.
- NUNCA invente funções fora da lista acima.
${hasProfile ? '- Use o nome do cliente quando ficar natural.' : ''}
${forceResponse ? '- ChatGPT desativado: se não for função do sistema, responda como assistente geral.' : ''}
${memoryBlock}${pendingInstruction}`
          },
          {
            role: 'user',
            content: transcript
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro na API da Groq:', errorData);
      return NextResponse.json({ response: 'Desculpe, tive um problema de conexão.', functionKey: null });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw || raw.toLowerCase() === 'null') {
      return NextResponse.json({ response: null, functionKey: null });
    }

    // ── Parsing da Resposta ──
    try {
      const cleaned = raw
        .replace(/```json|```/g, '')
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
      const parsed = JSON.parse(cleaned);
      if (parsed?.response) {
        return NextResponse.json({
          response: parsed.response,
          functionKey: parsed.functionKey ?? null,
        });
      }
    } catch {
      // Se falhar o parse, retorna o texto bruto como resposta de voz
    }

    return NextResponse.json({ response: raw, functionKey: null });

  } catch (err) {
    console.error('❌ Erro crítico no route.ts:', err);
    return NextResponse.json({ response: null, functionKey: null });
  }
}
