// =========================================================
// Rota API: Processar Conversação com ChatGPT
// Arquivo: app/api/voice/process-conversation/route.ts
// =========================================================
// Processa mensagens da conversa e chama OpenAI API server-side
// =========================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, fichaAtual, isFichaPreparo } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array required' },
        { status: 400 }
      );
    }

    // Obter API key do ambiente
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY não configurada');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Montar contexto da conversa
    const conversaAtual = messages
      .map((m: any) => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
      .join('\n');

    const fichaAtualStr = JSON.stringify(fichaAtual || {}, null, 2);

    // Prompt para o ChatGPT
    const systemPrompt = `Você é um assistente especializado em criar fichas de produção para restaurantes e lanchonetes no Brasil.

TIPO DE FICHA: ${isFichaPreparo ? 'Ficha de Preparo (produz um ingrediente)' : 'Produto Final (será vendido)'}

INSTRUÇÕES:
1. Extraia informações do que o usuário disse
2. Atualize a ficha com as novas informações
3. Estime preços de ingredientes brasileiros se necessário (em R$/kg ou R$/L)
4. Normalize unidades (kg, g, L, ml, unidade, dúzia)
5. Responda de forma natural e amigável
6. Se algo não estiver claro, pergunte

IMPORTANTE: Sempre estime preços brasileiros realistas. Exemplos:
- Farinha de trigo: R$ 5,00/kg
- Frango: R$ 15,00/kg
- Açúcar: R$ 3,50/kg
- Leite: R$ 4,00/L
- Ovos: R$ 0,50/unidade
- Óleo: R$ 8,00/L
- Sal: R$ 2,00/kg
- Manteiga: R$ 35,00/kg
- Queijo: R$ 40,00/kg
- Presunto: R$ 30,00/kg

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`):
{
  "ficha": {
    "nome": "string",
    "categoria": "string",
    "rendimento_qtd": number,
    "rendimento_unid": "string",
    "preco_venda": number ou null,
    "itens": [
      {
        "id": "temp-timestamp",
        "nome": "string",
        "quantidade": number,
        "unidade": "kg|g|L|ml|unidade|dúzia",
        "preco_unitario": number,
        "perda_percentual": number,
        "preco_estimado": boolean
      }
    ]
  },
  "resposta": "string - mensagem amigável ao usuário",
  "completo": boolean - true se a ficha está pronta para salvar
}`;

    const userPrompt = `CONTEXTO DA CONVERSA:
${conversaAtual}

FICHA ATUAL:
${fichaAtualStr}`;

    console.log('📡 Chamando OpenAI API...');

    // Chamar API da OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // ou 'gpt-4-turbo' se preferir
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }, // ✅ Force JSON response
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro na API OpenAI:', errorData);
      return NextResponse.json(
        { error: 'OpenAI API error', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const conteudo = data.choices[0].message.content;

    console.log('✅ Resposta recebida');

    // Tentar parsear o JSON
    let resultado;
    try {
      // Limpar possíveis backticks se houver
      const jsonLimpo = conteudo.replace(/```json\n?|\n?```/g, '').trim();
      resultado = JSON.parse(jsonLimpo);
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', conteudo);
      return NextResponse.json(
        { 
          error: 'Invalid JSON response', 
          rawResponse: conteudo 
        },
        { status: 500 }
      );
    }

    // Retornar resultado
    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('❌ Erro ao processar conversação:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Runtime padrão do Next.js (funciona tanto em Node quanto Edge)
export const runtime = 'nodejs';
