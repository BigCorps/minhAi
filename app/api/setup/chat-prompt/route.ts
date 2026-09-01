// app/api/setup/chat-prompt/route.ts
// Recebe o prompt atual + pedido do usuário e devolve o prompt atualizado.
// O GPT reescreve mantendo as informações da empresa e aplicando a mudança pedida.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ChatPromptBody {
  companyId:     string;
  message:       string;   // pedido do usuário
  currentPrompt: string;   // prompt atual da empresa
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatPromptBody = await request.json();
    const { companyId, message, currentPrompt } = body;

    if (!companyId || !message?.trim()) {
      return NextResponse.json(
        { error: 'companyId e message são obrigatórios' },
        { status: 400 }
      );
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
    }

    const supabase = createClient();

    // Buscar contexto da empresa
    const { data: company } = await supabase
      .from('companies')
      .select('name, assistant_type, segment_key, brand_description, business_hours, business_address')
      .eq('id', companyId)
      .single();

    const companyName   = company?.name ?? 'empresa';
    const assistantType = company?.assistant_type ?? 'smart';

    const systemPrompt = `Você é um especialista em criar e editar prompts de sistema para assistentes virtuais de empresas brasileiras.

Você está editando o comportamento do assistente virtual da empresa "${companyName}" (${assistantType === 'vendas' ? 'minhAi Vendas' : 'minhAi Smart'}).

CONTEXTO DA EMPRESA:
${company?.brand_description ? `- O que oferece: ${company.brand_description}` : ''}
${company?.business_hours    ? `- Horários: ${company.business_hours}`         : ''}
${company?.business_address  ? `- Endereço: ${company.business_address}`       : ''}

PROMPT ATUAL DO ASSISTENTE:
"""
${currentPrompt || '(ainda não configurado)'}
"""

Sua tarefa é:
1. Entender o que o usuário quer mudar ou adicionar
2. Reescrever o prompt incorporando a mudança pedida
3. Manter todas as informações importantes do prompt original que não foram pedidas para remover
4. Responder de forma natural explicando o que foi alterado

REGRAS:
- Responda SEMPRE em português brasileiro
- O prompt gerado deve ser claro, direto e sem markdown ou asteriscos
- Máximo de 350 palavras no prompt gerado
- Se o usuário pedir uma explicação (ex: "o que esse prompt faz?"), responda sem gerar um novo prompt
- Se o pedido for ambíguo, aplique a interpretação mais razoável e explique o que fez
- Nunca inclua campos técnicos como {NOME} ou {EMPRESA} no prompt — use os nomes reais

FORMATO DA RESPOSTA — JSON válido, sem markdown:
{
  "reply": "resposta natural para o usuário explicando o que foi feito",
  "updatedPrompt": "novo prompt completo reescrito, ou null se for só uma explicação",
  "changed": true
}

Se for só uma explicação sem mudança no prompt, retorne "updatedPrompt": null e "changed": false.`;

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: message },
        ],
        max_tokens: 700,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!gptResponse.ok) {
      console.error('GPT falhou:', gptResponse.status);
      return NextResponse.json({
        reply:         'Tive um problema ao processar. Pode tentar novamente?',
        updatedPrompt: null,
        changed:       false,
      });
    }

    const gptData = await gptResponse.json();
    const rawContent = gptData.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      return NextResponse.json({
        reply:         'Não consegui processar o pedido. Pode reformular?',
        updatedPrompt: null,
        changed:       false,
      });
    }

    let parsed: { reply: string; updatedPrompt: string | null; changed: boolean };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const cleaned = rawContent.replace(/```json|```/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return NextResponse.json({
          reply:         rawContent.slice(0, 300),
          updatedPrompt: null,
          changed:       false,
        });
      }
    }

    return NextResponse.json({
      reply:         parsed.reply         ?? 'Pronto!',
      updatedPrompt: parsed.updatedPrompt ?? null,
      changed:       parsed.changed       ?? false,
    });

  } catch (error: any) {
    console.error('Erro em chat-prompt:', error);
    return NextResponse.json({
      reply:         'Ocorreu um erro inesperado. Tente novamente.',
      updatedPrompt: null,
      changed:       false,
    });
  }
}
