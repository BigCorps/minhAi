// =========================================================
// Rota API: Processar Conversação com Claude
// Arquivo: app/api/voice/process-conversation/route.ts
// =========================================================
// Processa mensagens da conversa e chama Claude API server-side
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
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    
    if (!ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY não configurada');
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

    // Prompt para o Claude
    const prompt = `Você é um assistente especializado em criar fichas de produção para restaurantes e lanchonetes no Brasil.

CONTEXTO DA CONVERSA:
${conversaAtual}

FICHA ATUAL:
${fichaAtualStr}

TIPO DE FICHA: ${isFichaPreparo ? 'Ficha de Preparo (produz um ingrediente)' : 'Produto Final (será vendido)'}

INSTRUÇÕES:
1. Extraia informações do que o usuário disse
2. Atualize a ficha com as novas informações
3. Estime preços de ingredientes brasileiros se necessário (em R$/kg ou R$/L)
4. Normalize unidades (kg, g, L, ml, unidade, dúzia)
5. Responda de forma natural e amigável
6. Se algo não estiver claro, pergunte

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
}

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
- Presunto: R$ 30,00/kg`;

    console.log('📡 Chamando Anthropic API...');

    // Chamar API da Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro na API Anthropic:', errorData);
      return NextResponse.json(
        { error: 'Anthropic API error', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const conteudo = data.content[0].text;

    // Limpar possíveis backticks de markdown
    const jsonLimpo = conteudo.replace(/```json\n?|\n?```/g, '').trim();

    console.log('✅ Resposta recebida');

    // Tentar parsear o JSON
    let resultado;
    try {
      resultado = JSON.parse(jsonLimpo);
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', jsonLimpo);
      return NextResponse.json(
        { 
          error: 'Invalid JSON response', 
          rawResponse: jsonLimpo 
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

// Configurar runtime como edge (opcional, mais rápido)
export const runtime = 'edge';
