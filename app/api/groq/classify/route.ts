// app/api/groq/classify/route.ts — v3: contexto pendente traduzido
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
  const { transcript, functionsContext, sessionContext, forceResponse, conversationHistory } = await req.json();
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

    // Histórico recente da conversa — produto mencionado, valor cotado, intenção
    const recentHistory: Array<{role: string; content: string}> = conversationHistory ?? [];
    const historyBlock = recentHistory.length > 0
      ? `\n\nHISTÓRICO RECENTE (últimas trocas):\n${recentHistory.slice(-6).map(m =>
          `${m.role === 'user' ? 'Cliente' : 'Assistente'}: ${m.content}`
        ).join('\n')}`
      : '';

// Instrução extra quando há contexto pendente
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

Como os métodos (Link, Débito e Crédito) possuem telas interativas próprias, você DEVE retornar a functionKey PADRÃO imediatamente, MESMO QUE O CLIENTE NÃO DIGA O VALOR.

Mapeie a escolha e retorne OBRIGATORIAMENTE EM FORMATO JSON:
- "link" → {"response": "Abrindo link de pagamento.", "functionKey": "link_pagamento"}
- "débito" (celular) → {"response": "Preparando débito.", "functionKey": "nfc_debito"}
- "crédito" (celular) → {"response": "Preparando crédito.", "functionKey": "nfc_credito"}
- "débito" (maquininha) → {"response": "Preparando maquininha.", "functionKey": "tef_debito"}
- "crédito" (maquininha) → {"response": "Preparando maquininha.", "functionKey": "tef_credito"}

REGRA EXCLUSIVA PARA O PIX (pois não tem tela própria):
- Pix COM valor: {"response": "Gerando Pix.", "functionKey": "pix_generate"}
- Pix SEM valor: {"response": "Qual o valor do Pix?", "functionKey": "__pending__pix_generate"}

Responda APENAS com o JSON, sem adicionar texto fora das chaves.`
      : '';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `Você é o assistente de voz minhAi. Sua função é orientar clientes e executar funções do sistema.

## Funções disponíveis (nome | functionKey | ativa quando):
${functionsContext}

## COMO RESPONDER — escolha UMA das opções:

### Opção 1 — retorne: null
Quando for sobre produtos, preços, empresa, horário, endereço, descrições ou conversa geral.
Exemplos: "tem pizza?", "qual o horário?", "tudo bem?", "quanto custa?", "qual o valor?", "me fala mais sobre"
REGRA CRÍTICA: preços e informações de produtos são respondidos pelo GPT — SEMPRE retorne null nesses casos.
${forceResponse ? '' : 'Na dúvida → null'}

### Opção 2 — retorne JSON com functionKey
Quando o cliente pedir EXPLICITAMENTE para executar uma ação — não apenas perguntar sobre ela.
Exemplos VÁLIDOS: "gera um pix de 50", "abre o cardápio", "quero pagar com link"
Exemplos INVÁLIDOS que devem usar Opção 3: "quais formas de pagamento?" → perguntar qual prefere; "quanto custa?" → responder e perguntar se quer comprar
{"response": "frase curta PERGUNTANDO confirmação, ex: 'Posso gerar o PIX de R$50 agora?'", "functionKey": "function_key_aqui"}

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
- NUNCA invente funções fora da lista acima — se não encontrar a function_key EXATA na lista, retorne null
- NUNCA retorne functionKey para perguntas sobre preço, produto ou informação — apenas para ações explícitas
- Se o cliente perguntar preço ou informação sobre produto, retorne null (deixe o GPT responder)`;
- NUNCA responda sobre produtos, preços ou dados da empresa
${hasProfile ? '- Use o nome do cliente quando ficar natural' : ''}
${forceResponse ? '- ChatGPT desativado: se não for função do sistema, responda como assistente geral' : ''}
${memoryBlock}${historyBlock}${pendingInstruction}

## REGRA DE CONTEXTO HISTÓRICO:
Se o histórico acima mostrar que o cliente perguntou sobre um produto e o assistente informou o preço, e agora o cliente quiser pagar (ex: "quero pagar", "pode cobrar", "vou levar"), entenda o valor do contexto e execute a função de pagamento adequada com esse valor.
Exemplo: histórico mostra "Suco de laranja: R$8,50" e cliente diz "quero pagar" → retorne {"response": "Gerando PIX de R$8,50.", "functionKey": "pix_generate"} com o valor inferido do histórico.`,
                },
        // Injeta histórico recente como mensagens reais para o GROQ ter contexto
        ...recentHistory.slice(-4).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        {
          role: 'user' as const,
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
