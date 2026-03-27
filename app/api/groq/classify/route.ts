// app/api/groq/classify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { transcript, enabledFunctions } = await req.json();

    if (!transcript || !enabledFunctions?.length) {
      return NextResponse.json({ functionKey: null });
    }

    const functionList = enabledFunctions
      .map((f: { key: string; name: string; triggers: string[] }) =>
        `- ${f.key}: "${f.name}" (ex: ${f.triggers.slice(0, 3).join(', ')})`
      )
      .join('\n');

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 60,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `Você é um classificador de intenções para um assistente de voz em português brasileiro.
Analise a frase do usuário e retorne APENAS o JSON: {"functionKey": "chave_da_função"} ou {"functionKey": null} se for conversa geral.

Funções disponíveis:
${functionList}

Regras:
- Retorne null se a intenção não corresponder claramente a nenhuma função
- Retorne null para perguntas genéricas ou conversas
- Prefira null a uma classificação incorreta`,
        },
        {
          role: 'user',
          content: `Frase: "${transcript}"`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? '';
    const json = JSON.parse(text.match(/\{.*\}/s)?.[0] ?? '{"functionKey":null}');

    return NextResponse.json({ functionKey: json.functionKey ?? null });
  } catch (err) {
    console.error('❌ GROQ classify error:', err);
    return NextResponse.json({ functionKey: null });
  }
}