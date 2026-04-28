// app/api/groq/classify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { transcript, functionsContext, sessionContext, forceResponse } = await req.json();
    if (!transcript || !functionsContext) {
      return NextResponse.json({ response: null });
    }

    const hasProfile = functionsContext?.includes('Cliente logado:');
    const memoryBlock = sessionContext?.summary || sessionContext?.lastFunctions?.length > 0
      ? `\n\nCONTEXTO DESTA SESSÃO:\n${sessionContext.summary ? `- ${sessionContext.summary}` : ''}${sessionContext.lastFunctions?.length > 0 ? `\n- Funções usadas: ${sessionContext.lastFunctions.join(', ')}` : ''}`
      : '';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 120,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `Você é o assistente de voz minhAi. Sua ÚNICA função é orientar clientes sobre as FUNÇÕES DO SISTEMA listadas abaixo.

## Funções disponíveis neste assistente:
${functionsContext}

## REGRA PRINCIPAL — quando retornar null:
Retorne exatamente a palavra null (sem aspas) quando a pergunta for sobre QUALQUER um destes temas:
- Produtos, itens, modelos, opções de venda (ex: "tem pizza?", "quais windbanner?", "opções de X?")
- Preços, valores, custos de produtos (ex: "quanto custa?", "qual o preço de X?")
- Informações da empresa (ex: "qual o horário?", "onde fica?", "quais cartões aceitam?")
- Qualidade, características ou detalhes de produtos
- Qualquer pergunta sobre o negócio em si
- Conversa geral (ex: "o que é um cometa?", "quem é você?")
${forceResponse ? '' : '- Se tiver dúvida se deve responder ou retornar null → retorne null'}

## Quando responder (apenas estas situações):
Responda SOMENTE quando o cliente perguntar COMO USAR uma função do sistema:
- "como faço para imprimir?" → oriente sobre função de impressão
- "como pagar via pix?" → oriente sobre função PIX
- "tem como agendar?" → oriente sobre função de agenda
- "como funciona o wifi?" → oriente sobre função wifi
${forceResponse ? '- Qualquer outra pergunta → responda como assistente geral (ChatGPT está desativado)' : ''}

## Formato da resposta:
- Máximo 2 frases curtas (será falado em voz alta)
- Diga exatamente o que o cliente deve falar para ativar a função
- NUNCA invente funções fora da lista
- NUNCA tente responder sobre produtos ou empresa
${hasProfile ? '- Use o nome do cliente quando natural' : ''}
${memoryBlock}`,
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();

    if (!text || text === 'null' || text.toLowerCase() === 'null' || text.toLowerCase().startsWith('null')) {
      return NextResponse.json({ response: null });
    }

    return NextResponse.json({ response: text });

  } catch (err) {
    console.error('❌ GROQ error:', err);
    return NextResponse.json({ response: null });
  }
}
