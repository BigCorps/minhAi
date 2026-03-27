// app/api/groq/classify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { transcript, functionTriggers } = await req.json();
    if (!transcript) return NextResponse.json({ normalizedTranscript: null, confidence: 0 });

    // Lista compacta de triggers para o prompt
    const triggerLines = (functionTriggers as { key: string; triggers: string[] }[])
      .map(f => `${f.key}: ${f.triggers.slice(0, 3).join(' | ')}`)
      .join('\n');

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 80,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `Você é um normalizador de comandos de voz para assistente virtual em português brasileiro.

Receba uma frase do cliente e reescreva como comando direto e claro mantendo a intenção.

Funções disponíveis (chave: exemplos de frases):
${triggerLines}

Regras:
- Reescreva de forma objetiva e direta
- Preserve valores numéricos, nomes, datas e detalhes
- Se for conversa geral sem intenção de comando, retorne null
- Responda APENAS com JSON: {"normalizedTranscript": "comando", "confidence": 0.0}
- confidence: 0.9+ certeza, 0.7-0.9 provável, <0.7 conversa geral

Exemplos:
"eu queria ver se vocês têm coca-cola gelada" → {"normalizedTranscript": "tem coca-cola", "confidence": 0.95}
"será que dá pra tocar uma musiquinha?" → {"normalizedTranscript": "tocar musica", "confidence": 0.92}
"quanto tá o dólar hoje?" → {"normalizedTranscript": "cotação dólar", "confidence": 0.97}
"me gera um pix de cinquenta reais" → {"normalizedTranscript": "gerar pix de 50 reais", "confidence": 0.99}
"tô precisando imprimir um negócio" → {"normalizedTranscript": "impressão remota", "confidence": 0.85}
"e aí o que mais você faz?" → {"normalizedTranscript": null, "confidence": 0.1}`,
        },
        { role: 'user', content: `Frase: "${transcript}"` },
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
