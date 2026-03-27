import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { transcript, functionTriggers } = await req.json();
    if (!transcript) return NextResponse.json({ trigger: null });

    const triggerLines = (functionTriggers as { key: string; triggers: string[]; examples: string[] }[])
      .map(f => {
        const all = [...f.triggers.slice(0, 2), ...f.examples.slice(0, 1)];
        return `${f.key}: ${all.join(' | ')}`;
      })
      .join('\n');

    const completion = await groq.chat.completions.create({
      model: 'gemma2-9b-it',
      max_tokens: 40,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `Você é um classificador de intenções para assistente virtual em português brasileiro.

O cliente falou algo informal. Identifique qual função ele quer e retorne UM trigger exato dessa função.

Funções disponíveis (function_key: trigger1 | trigger2 | exemplo):
${triggerLines}

Responda APENAS com JSON: {"trigger": "trigger exato aqui"} ou {"trigger": null} se for conversa geral.

Exemplos:
"tô precisando imprimir um negócio" → {"trigger": "imprimir documento"}
"será que dá pra tocar uma musiquinha?" → {"trigger": "tocar musica"}
"quanto tá o dólar?" → {"trigger": "cotação dólar"}
"quero uma pizza" → {"trigger": "ver produtos"}
"vocês ficam onde?" → {"trigger": "endereço"}
"tem como ver a senha do wifi?" → {"trigger": "wifi"}
"quero comprar alguma coisa" → {"trigger": "modo venda"}
"e aí o que mais você faz?" → {"trigger": null}
"obrigado" → {"trigger": null}`,
        },
        { role: 'user', content: `Frase: "${transcript}"` },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? '';
    const match = text.match(/\{.*\}/s);
    if (!match) return NextResponse.json({ trigger: null });

    const json = JSON.parse(match[0]);
    return NextResponse.json({ trigger: json.trigger ?? null });

  } catch (err) {
    console.error('❌ GROQ classify error:', err);
    return NextResponse.json({ trigger: null });
  }
}
