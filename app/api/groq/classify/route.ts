// app/api/groq/classify/route.ts — v3: contexto pendente traduzido
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { transcript, functionsContext, sessionContext, forceResponse } = await req.json();
    if (!transcript || !functionsContext) {
      return NextResponse.json({ response: null, functionKey: null });
    }

    const hasProfile = functionsContext?.includes('Cliente logado:');

    // Traduz tokens internos para linguagem que o GROQ entende
    const lastFunctions: string[] = sessionContext?.lastFunctions ?? [];
    const lastFunctionKey = lastFunctions[lastFunctions.length - 1] ?? '';

    const isPendingPayment = lastFunctionKey.startsWith('__pending__');
    const pendingFunction = isPendingPayment ? lastFunctionKey.replace('__pending__', '') : null;
    const isPaymentChoice = lastFunctionKey === '__payment_choice__';

    const friendlyFunctions = lastFunctions.map((k: string) => {
      if (k === '__payment_choice__') return 'aguardando escolha do método de pagamento';
      if (k.startsWith('__pending__')) return `aguardando valor para ${k.replace('__pending__', '')}`;
      if (k === '__clarification__') return 'aguardando esclarecimento do cliente';
      return k;
    });

    const memoryBlock = sessionContext?.summary || lastFunctions.length > 0
      ? `\n\nCONTEXTO DESTA SESSÃO:\n${sessionContext?.summary ? `- ${sessionContext.summary}` : ''}${friendlyFunctions.length > 0 ? `\n- Estado atual: ${friendlyFunctions.join(', ')}` : ''}`
      : '';

// Instrução extra quando há contexto pendente
    const pendingInstruction = isPendingPayment
      ? `\n\n## 🚨 REGRA CRÍTICA — AGUARDANDO VALOR:
O cliente já escolheu a função "${pendingFunction}", mas AINDA NÃO informou o valor.

1. SE O TRANSCRIPT NÃO CONTIVER VALOR NUMÉRICO:
Se o cliente não disse um valor exato na mensagem atual, OBRIGATORIAMENTE retorne APENAS:
{"response": "Qual o valor?"}
(NÃO inclua functionKey e NÃO confirme a operação).

2. SE O TRANSCRIPT CONTIVER VALOR NUMÉRICO:
Se o cliente informou um valor claro (ex: "10", "dez reais", "50"), retorne:
{"response": "Gerando agora.", "functionKey": "${pendingFunction}"}`
      : isPaymentChoice
      ? `\n\n## 🚨 REGRA CRÍTICA — AGUARDANDO MÉTODO DE PAGAMENTO:
O cliente quer pagar, mas ainda não escolheu o método.
Se não reconhecer o método, pergunte novamente.
Se mencionar "pix" → {"response": "Abrindo agora.", "functionKey": "pix_generate"}
Se mencionar "débito" ou "debito" → {"response": "Abrindo agora.", "functionKey": "nfc_debito"}
Se mencionar "crédito" ou "credito" → {"response": "Abrindo agora.", "functionKey": "nfc_credito"}
Se mencionar "link" → {"response": "Abrindo agora.", "functionKey": "link_pagamento"}`
      : '';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 120,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `Você é o assistente de voz minhAi. Sua função é orientar clientes e executar funções do sistema.

## Funções disponíveis (nome | functionKey | ativa quando):
${functionsContext}

## COMO RESPONDER — escolha UMA das opções:

### Opção 1 — retorne: null
Quando for sobre produtos, preços, empresa, horário, endereço ou conversa geral.
Exemplos: "tem pizza?", "qual o horário?", "tudo bem?"
${forceResponse ? '' : 'Na dúvida → null'}

### Opção 2 — retorne JSON com functionKey
Quando identificar UMA função clara para executar imediatamente.
Exemplos: "quero gerar um pix", "abre o cardápio", "quero imprimir"
{"response": "frase curta em voz alta confirmando a ação", "functionKey": "function_key_aqui"}

### Opção 3 — retorne JSON sem functionKey (pergunta de esclarecimento)
Quando o pedido for ambíguo e precisar perguntar ao cliente para decidir a função.
Exemplos: "quero pagar" (tem PIX, débito e crédito) → pergunta qual prefere
{"response": "pergunta curta e direta ao cliente"}

### Opção 4 — retorne JSON com functionKey (confirmação)
Quando o cliente confirmar ("sim", "pode", "isso", "quero", "esse mesmo"):
Se o contexto da sessão indicar uma função sugerida, execute-a.
{"response": "Perfeito! Abrindo agora.", "functionKey": "function_key_aqui"}

## REGRAS:
- Respostas máximo 2 frases curtas — será falado em voz alta
- Português brasileiro natural
- NUNCA invente funções fora da lista acima
- NUNCA responda sobre produtos, preços ou dados da empresa
${hasProfile ? '- Use o nome do cliente quando ficar natural' : ''}
${forceResponse ? '- ChatGPT desativado: se não for função do sistema, responda como assistente geral' : ''}
${memoryBlock}${pendingInstruction}`,
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();

    if (!raw || raw === 'null' || raw.toLowerCase() === 'null' || raw.toLowerCase().startsWith('null')) {
      return NextResponse.json({ response: null, functionKey: null });
    }

    // Tenta parsear JSON estruturado { response, functionKey? }
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
      // Não era JSON — texto puro sem execução de função
    }

    // Fallback: resposta em texto puro
    return NextResponse.json({ response: raw, functionKey: null });

  } catch (err) {
    console.error('❌ GROQ error:', err);
    return NextResponse.json({ response: null, functionKey: null });
  }
}
