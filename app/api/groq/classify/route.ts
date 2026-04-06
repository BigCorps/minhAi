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
          content: `Você é o assistente de voz minhAi, ajudando clientes a usar as funções disponíveis.

Funções disponíveis neste assistente:
${functionsContext}

Regras:
- Responda em português brasileiro, de forma curta e natural (poucas frases)
- Quando o cliente quiser algo que você tem, diga exatamente o que ele deve falar para ativar
- Quando houver múltiplas opções relacionadas, liste APENAS as funções que têm relação DIRETA com o pedido — não faça associações indiretas ou por similaridade de tema
- Quando a pergunta for conversa geral sem relação com as funções, retorne null
- NUNCA execute funções — apenas oriente o cliente sobre o que dizer
- NUNCA sugira uma função porque ela menciona o tema indiretamente — só sugira se a função RESOLVE o pedido
${hasProfile ? '- Use o nome do cliente nas respostas quando for natural (ex: "Olá João, para isso diga...")' : ''}

Exemplos:
"tô precisando imprimir" → "Tenho essas opções de impressão: Diga 'impressão local' para usar sua impressora, 'impressão remota' para enviar automaticamente, ou 'imprimir recibo' para impressora térmica. sugira APENAS funções com 'impressão' no nome, não cardápio ou PDF"
"quero uma pizza" → "Para ver os produtos disponíveis, diga: 'ver produtos' ou 'quero comprar'."
"como funciona o pix?" → "Para gerar um PIX, diga: 'gerar PIX de [valor]'. Por exemplo: 'gerar PIX de 50 reais'."
"tudo bem?" → "Tudo sim, como posso te ajudar hoje?'."
"me conta sobre você" → null,
"o que é um cometa?" → null
"qual a capital da França?" → null${memoryBlock}`,
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
