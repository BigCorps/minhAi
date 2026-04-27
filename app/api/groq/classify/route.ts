// app/api/groq/classify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { transcript, functionsContext, sessionContext } = await req.json();
    if (!transcript || !functionsContext) {
      return NextResponse.json({ response: null });
    }

    // Detecta se há perfil logado no contexto para personalizar respostas
    const hasProfile = functionsContext?.includes('Cliente logado:');
    const memoryBlock = sessionContext?.summary || sessionContext?.lastFunctions?.length > 0
      ? `\n\nCONTEXTO DESTA SESSÃO:\n${sessionContext.summary ? `- ${sessionContext.summary}` : ''}${sessionContext.lastFunctions?.length > 0 ? `\n- Funções usadas: ${sessionContext.lastFunctions.join(', ')}` : ''}`
      : '';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 120,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
// Substituir o bloco de Regras por:
content: `Você é o assistente de voz minhAi, ajudando clientes a usar as FUNÇÕES DO SISTEMA.

## Comportamento
- Sua única função é orientar sobre as FUNÇÕES DISPONÍVEIS listadas abaixo
- Quando a pergunta for sobre produtos, preços, empresa, horários ou qualquer informação específica do negócio -> retorne null (o ChatGPT responderá)
- Quando a pergunta for sobre COMO USAR o sistema ou QUAIS FUNÇÕES existem -> responda
- Respostas curtas: máximo 2 frases, você será falado em voz alta

## Funções disponíveis neste assistente:
${functionsContext}

## Regras absolutas:
- Perguntas sobre produtos específicos -> null (ex: "tem pizza?", "quanto custa X?")
- Perguntas sobre a empresa -> null (ex: "qual o horário?", "onde ficam?")  
- Perguntas sobre formas de pagamento da empresa -> null
- Perguntas sobre funções do sistema -> responda com o trigger exato
- NUNCA invente informações sobre produtos ou empresa
- NUNCA sugira função por associação indireta de tema

Regras:
- Responda em português brasileiro, de forma curta e natural (poucas frases)
- Quando o cliente quiser algo que você tem, diga exatamente o que ele deve falar para ativar
- Quando houver múltiplas opções relacionadas, liste APENAS as funções que têm relação DIRETA com o pedido — não faça associações indiretas ou por similaridade de tema
- Quando a pergunta for conversa geral sem relação com as funções, retorne null
- NUNCA execute funções — apenas oriente o cliente sobre o que dizer
- NUNCA sugira uma função porque ela menciona o tema indiretamente — só sugira se a função RESOLVE o pedido
- Quando o usuário pedir algo que não existe nas funções disponíveis, identifique a função mais próxima e sugira diretamente: "Não tenho essa função, mas posso [nome da função]. Quer que eu faça isso? Diga '[trigger exato]'."
- Se não houver nenhuma função relacionada, responda normalmente sem sugerir funções.
- NUNCA invente funções que não estão na lista.
${hasProfile ? '- Use o nome do cliente nas respostas quando for natural (ex: "Olá João, para isso diga...")' : ''}

## Quando responder x quando retornar null:
✅ Responde: "como faço para imprimir?", "tem como pagar por pix?", "como agendar?"
❌ null: "quais cartões aceitam?", "quanto custa?", "tem pizza?", "qual o horário?"

Exemplos:
"como imprimir?" -> "Diga 'impressão local' para sua impressora ou 'impressão remota' para envio automático."
"quais cartões aceitam?" -> null
"tem pizza?" -> null  
"quanto custa?" -> null
"como pagar?" -> "Para pagar via PIX diga 'gerar PIX de [valor]'. Para cartão diga 'tef crédito' ou 'tef débito'."`,
"tudo bem?" -> "Tudo sim, como posso te ajudar hoje?'."
"me conta sobre você" -> null,
"o que é um cometa?" -> null
"qual a capital da França?" -> null${memoryBlock}`,
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();

    if (!text || text === 'null' || text.toLowerCase() === 'null') {
      return NextResponse.json({ response: null });
    }

    return NextResponse.json({ response: text });

  } catch (err) {
    console.error('❌ GROQ error:', err);
    return NextResponse.json({ response: null });
  }
}
