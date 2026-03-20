// =========================================================
// Rota API: Processar Conversação com ChatGPT
// Arquivo: app/api/voice/process-conversation/route.ts
// =========================================================
// ✅ MUDANÇAS v2:
// - Recebe selectedTags do body
// - Prompt da IA atualizado para entender tags
// - isFichaPreparo derivado das tags (compatibilidade mantida)
// - Validação de ciclo via CicloDetector (avisos ao frontend)
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDetector } from '@/lib/producao/ciclo-detector'; // ✅ v2

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ✅ v2: recebe selectedTags; mantém isFichaPreparo como fallback legado
    const {
      messages,
      fichaAtual,
      selectedTags = [],
      isFichaPreparo: isFichaPreparoLegado,
      companyId,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array required' },
        { status: 400 }
      );
    }

    // ✅ v2: isFichaPreparo derivado das tags; fallback para o campo legado
    const isFichaPreparo =
      selectedTags.length > 0
        ? selectedTags.includes('função:preparo')
        : isFichaPreparoLegado ?? false;

    const isVendavel  = selectedTags.includes('vendável:sim');
    const isCombo     = selectedTags.includes('função:combo');
    const isProduto   = selectedTags.includes('função:produto');
    const origemTag   = (selectedTags as string[]).find((t: string) => t.startsWith('origem:')) ?? null;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY não configurada');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const conversaAtual = messages
      .map((m: any) => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
      .join('\n');

    const fichaAtualStr = JSON.stringify(fichaAtual || {}, null, 2);

    // ✅ v2: Prompt atualizado para entender tags
    const systemPrompt = `Você é um assistente especializado em criar fichas de produção para restaurantes e lanchonetes no Brasil.

CARACTERÍSTICAS DO ITEM (tags selecionadas pelo usuário):
- Tags: ${selectedTags.length > 0 ? selectedTags.join(', ') : 'nenhuma tag selecionada'}
- Tipo: ${isFichaPreparo ? 'Ficha de Preparo (produz um ingrediente, não é vendida diretamente)' : isProduto ? 'Produto Final' : isCombo ? 'Combo (agrupa outros produtos)' : 'Item de produção'}
- Vendável ao cliente final: ${isVendavel ? 'Sim' : 'Não'}
${isCombo ? '- É um combo: agrupa produtos já existentes, peça os itens que o compõem' : ''}
${origemTag ? `- Origem: ${origemTag.split(':')[1]}` : ''}

INSTRUÇÕES:
1. Extraia informações do que o usuário disse
2. Atualize a ficha com as novas informações
3. Estime preços de ingredientes brasileiros se necessário (em R$/kg ou R$/L)
4. Normalize unidades (kg, g, L, ml, unidade, dúzia)
5. Responda de forma natural e amigável
6. Se algo não estiver claro, pergunte
${isFichaPreparo ? '7. Como é uma ficha de preparo, o campo preco_venda deve ser null' : ''}
${!isVendavel ? '7. Como não é vendável, o campo preco_venda deve ser null' : ''}

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
  "completo": boolean
}`;

    const userPrompt = `CONTEXTO DA CONVERSA:
${conversaAtual}

FICHA ATUAL:
${fichaAtualStr}`;

    console.log('📡 Chamando OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
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

    let resultado;
    try {
      const jsonLimpo = conteudo.replace(/```json\n?|\n?```/g, '').trim();
      resultado = JSON.parse(jsonLimpo);
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', conteudo);
      return NextResponse.json(
        { error: 'Invalid JSON response', rawResponse: conteudo },
        { status: 500 }
      );
    }

    // ✅ v2: Validação de ciclos (apenas se companyId disponível e ficha tem itens)
    const avisos: string[] = [];

    if (companyId && resultado.ficha?.itens?.length > 0) {
      try {
        const detector = await getDetector(companyId);

        // fichaId temporário para checagem — usamos o nome como chave provisória
        // A validação real de ID acontece no trigger do banco ao salvar
        for (const item of resultado.ficha.itens) {
          if (item.ingrediente_id) {
            const temCiclo = detector.detectarCiclo(
              resultado.ficha.id ?? '__nova__',
              item.ingrediente_id
            );
            if (temCiclo) {
              avisos.push(`⚠️ Ingrediente "${item.nome}" criaria uma dependência circular e não pode ser adicionado.`);
            }
          }
        }
      } catch (cicloErr) {
        // Falha silenciosa: o banco ainda vai bloquear via trigger
        console.warn('⚠️ Detector de ciclo indisponível (banco vai validar):', cicloErr);
      }
    }

    return NextResponse.json({ ...resultado, avisos });

  } catch (error: any) {
    console.error('❌ Erro ao processar conversação:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
