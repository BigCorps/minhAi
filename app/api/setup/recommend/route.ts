// app/api/setup/recommend/route.ts
// Recebe o ramo de atividade e retorna até 15 funções recomendadas
// usando GPT para analisar as descrições da tabela assistant_functions

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { ramo, companyId } = await request.json();

    if (!ramo || !companyId) {
      return NextResponse.json(
        { error: 'ramo e companyId são obrigatórios' },
        { status: 400 }
      );
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
    }

    const supabase = createClient();

    // 1. Buscar todas as funções ativas da tabela
    const { data: functions, error } = await supabase
      .from('assistant_functions')
      .select('function_key, function_name, short_description, description, function_category')
      .eq('is_active', true)
      .order('display_order');

    if (error || !functions || functions.length === 0) {
      return NextResponse.json({ error: 'Erro ao buscar funções' }, { status: 500 });
    }

    // 2. Buscar funções já ativas para esta empresa (para não recomendar o que já está ativo)
    const { data: activeFunctions } = await supabase
      .from('company_function_settings')
      .select('function_key, is_enabled')
      .eq('company_id', companyId);

    const alreadyActive = new Set(
      (activeFunctions || [])
        .filter(f => f.is_enabled)
        .map(f => f.function_key)
    );

    // 3. Montar lista resumida para o GPT (evita tokens desnecessários)
    const functionsList = functions
      .map(f => `- ${f.function_key}: "${f.short_description || f.description}"`)
      .join('\n');

    // 4. Chamar GPT para recomendar
    const systemPrompt = `Você é um especialista em configuração de assistentes de voz para empresas brasileiras.
Sua tarefa é analisar o ramo de atividade informado e selecionar as funções mais relevantes de uma lista.

REGRAS:
- Selecione entre 8 e 15 funções mais relevantes para o ramo
- Priorize funções que o cliente vai usar no dia a dia
- Ordene da mais para a menos relevante
- Para cada função, escreva uma justificativa curta em português (máximo 10 palavras)
- Retorne SOMENTE JSON válido, sem markdown, sem backticks

FORMATO DE SAÍDA:
{
  "recomendadas": [
    {
      "function_key": "string",
      "justificativa": "string"
    }
  ],
  "mensagem": "string com saudação personalizada para o ramo (máximo 2 frases)"
}`;

    const userPrompt = `Ramo de atividade: ${ramo}

Funções disponíveis:
${functionsList}

Selecione as mais relevantes para este ramo.`;

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!gptResponse.ok) {
      const err = await gptResponse.json();
      console.error('Erro GPT:', err);
      return NextResponse.json({ error: 'Erro ao consultar IA' }, { status: 500 });
    }

    const gptData = await gptResponse.json();
    const content = gptData.choices[0].message.content;
    const resultado = JSON.parse(content);

    // 5. Enriquecer com dados completos das funções recomendadas
    const funcionesMap = new Map(functions.map(f => [f.function_key, f]));

    const recomendadas = (resultado.recomendadas || [])
      .map((r: { function_key: string; justificativa: string }) => {
        const func = funcionesMap.get(r.function_key);
        if (!func) return null;
        return {
          function_key: r.function_key,
          function_name: func.function_name,
          short_description: func.short_description || func.description,
          function_category: func.function_category,
          justificativa: r.justificativa,
          already_active: alreadyActive.has(r.function_key),
        };
      })
      .filter(Boolean);

    // 6. Retornar também TODAS as funções agrupadas por categoria
    //    para o painel visual poder mostrar o catálogo completo
    const todasPorCategoria: Record<string, any[]> = {};
    for (const f of functions) {
      if (!todasPorCategoria[f.function_category]) {
        todasPorCategoria[f.function_category] = [];
      }
      todasPorCategoria[f.function_category].push({
        function_key: f.function_key,
        function_name: f.function_name,
        short_description: f.short_description || f.description,
        already_active: alreadyActive.has(f.function_key),
      });
    }

    return NextResponse.json({
      recomendadas,
      todas_por_categoria: todasPorCategoria,
      mensagem: resultado.mensagem || `Ótimo! Encontrei as melhores funções para ${ramo}.`,
      ramo,
    });

  } catch (error: any) {
    console.error('Erro na recomendação:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
