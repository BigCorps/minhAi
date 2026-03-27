// app/api/groq/classify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { transcript, functionTriggers } = await req.json();

    if (!transcript) {
      return NextResponse.json({ normalizedTranscript: null, confidence: 0 });
    }

    const triggerLines = (functionTriggers as { key: string; triggers: string[] }[])
      .map(f => `${f.key}: ${f.triggers.slice(0, 3).join(' | ')}`)
      .join('\n');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 80,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `Você é um normalizador de comandos de voz para assistente virtual em português brasileiro.
Receba uma frase do cliente — que pode ser informal, com gírias ou incompleta — e reescreva como comando direto.

Funções disponíveis (chave: exemplos de frases):
${triggerLines}

Regras:
- Reescreva de forma objetiva e direta
- Preserve valores numéricos, nomes e datas
- Se for conversa geral SEM ação específica (saudações, perguntas sobre capacidades), retorne null
- Responda APENAS com JSON: {"normalizedTranscript": "comando", "confidence": 0.0}

Exemplos de linguagem informal → normalização:
"tô precisando imprimir um negócio" → {"normalizedTranscript": "imprimir documento", "confidence": 0.88}
"será que dá pra tocar uma musiquinha?" → {"normalizedTranscript": "tocar musica", "confidence": 0.92}
"quanto tá o dólar hoje?" → {"normalizedTranscript": "cotação dólar", "confidence": 0.97}
"me gera um pix de cinquenta reais" → {"normalizedTranscript": "gerar pix de 50 reais", "confidence": 0.99}
"eu queria ver o cardápio de vocês" → {"normalizedTranscript": "cardápio", "confidence": 0.95}
"vocês ficam onde mesmo?" → {"normalizedTranscript": "endereço", "confidence": 0.95}
"tem como eu ver a senha do wifi?" → {"normalizedTranscript": "wifi", "confidence": 0.93}
"quero saber quanto tá custando o bitcoin" → {"normalizedTranscript": "cotação bitcoin", "confidence": 0.96}
"preciso verificar se esse CPF tem restrição" → {"normalizedTranscript": "restrições cpf", "confidence": 0.94}
"dá pra gerar um QR Code aqui?" → {"normalizedTranscript": "gerar qr code", "confidence": 0.91}
"e aí o que mais você faz?" → {"normalizedTranscript": null, "confidence": 0.05}
"quais são suas funções?" → {"normalizedTranscript": null, "confidence": 0.05}
"tudo bem?" → {"normalizedTranscript": null, "confidence": 0.02}
"obrigado!" → {"normalizedTranscript": null, "confidence": 0.01}`,
        },
        {
          role: 'user',
          content: `Frase: "${transcript}"`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? '';
    const match = text.match(/\{.*\}/s);
    if (!match) return NextResponse.json({ normalizedTranscript: null, confidence: 0 });

    const json = JSON.parse(match[0]);
    return NextResponse.json({
      normalizedTranscript: json.normalizedTranscript ?? null,
      confidence: json.confidence ?? 0,
    });
  } catch (err) {
    console.error('❌ GROQ classify error:', err);
    return NextResponse.json({ normalizedTranscript: null, confidence: 0 });
  }
}
