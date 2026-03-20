// =========================================================
// Rota API: Processar Conversação com ChatGPT
// Arquivo: app/api/voice/process-conversation/route.ts
// =========================================================
// ✅ v2: recebe selectedTags, prompt atualizado para tags,
//        isFichaPreparo derivado das tags, validação de ciclos
// ✅ v3: prompt com tabela de preços completa (mercado BR 2025)
//        regra explícita: nunca retornar preco_unitario 0/null
//        contexto de conversa formatado de forma mais clara para IA
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDetector } from '@/lib/producao/ciclo-detector';

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

    // ✅ v2: isFichaPreparo derivado das tags; fallback para campo legado
    const isFichaPreparo =
      selectedTags.length > 0
        ? selectedTags.includes('função:preparo')
        : isFichaPreparoLegado ?? false;

    const isVendavel = selectedTags.includes('vendável:sim');
    const isCombo    = selectedTags.includes('função:combo');
    const isProduto  = selectedTags.includes('função:produto');
    const origemTag  = (selectedTags as string[]).find((t: string) => t.startsWith('origem:')) ?? null;

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

    // ✅ v3: prompt com regras anti-zero e tabela de preços completa
    const systemPrompt = `Você é um assistente especializado em fichas técnicas de produção para restaurantes e negócios alimentícios brasileiros.

CARACTERÍSTICAS DO ITEM (definidas pelo usuário):
- Tags: ${selectedTags.length > 0 ? selectedTags.join(', ') : 'nenhuma'}
- Tipo: ${isFichaPreparo ? 'Ficha de Preparo (produz um ingrediente, não é vendida diretamente)' : isProduto ? 'Produto Final' : isCombo ? 'Combo (agrupa outros produtos)' : 'Item de produção'}
- Vendável ao cliente final: ${isVendavel ? 'Sim' : 'Não'}
${isCombo    ? '- É um COMBO: agrupa produtos já existentes. Pergunte quais itens o compõem.' : ''}
${origemTag  ? `- Origem: ${origemTag.split(':')[1]}` : ''}

REGRAS CRÍTICAS — LEIA COM ATENÇÃO:
1. ✅ TODOS os ingredientes DEVEM ter "preco_unitario" preenchido e maior que zero
2. ✅ Se o usuário NÃO informou o preço, ESTIME um valor realista do mercado brasileiro 2025
3. ✅ Preços em R$ (Reais) por unidade base: kg, L, unidade ou dúzia
4. ❌ NUNCA retornar preco_unitario: 0, null ou undefined — isso causa custo zerado na ficha
5. ✅ A ÚNICA exceção é água: preco_unitario: 0.00
${isFichaPreparo || !isVendavel ? '6. ✅ preco_venda deve ser null neste tipo de ficha' : ''}

TABELA DE PREÇOS ESTIMADOS (Mercado Brasileiro 2025):

FARINHAS E GRÃOS:
- Farinha de trigo: R$ 5.00/kg
- Farinha de trigo integral: R$ 6.50/kg
- Farinha de rosca: R$ 7.00/kg
- Polvilho doce/azedo: R$ 8.00/kg
- Amido de milho (Maizena): R$ 9.00/kg
- Fubá: R$ 4.00/kg
- Aveia: R$ 8.00/kg

AÇÚCARES E ADOÇANTES:
- Açúcar refinado: R$ 3.50/kg
- Açúcar mascavo: R$ 6.00/kg
- Mel: R$ 30.00/kg

LATICÍNIOS:
- Leite integral: R$ 4.00/L
- Manteiga: R$ 35.00/kg
- Creme de leite: R$ 12.00/kg
- Requeijão/Catupiry: R$ 35.00/kg
- Queijo mussarela: R$ 40.00/kg
- Queijo parmesão ralado: R$ 60.00/kg
- Queijo prato: R$ 38.00/kg
- Iogurte natural: R$ 8.00/kg

OVOS:
- Ovo de galinha: R$ 0.50/unidade (R$ 6.00/dúzia)

CARNES E PROTEÍNAS:
- Frango inteiro: R$ 12.00/kg
- Peito de frango: R$ 18.00/kg
- Coxa/sobrecoxa: R$ 10.00/kg
- Carne moída bovina: R$ 25.00/kg
- Alcatra/patinho: R$ 35.00/kg
- Linguiça calabresa: R$ 22.00/kg
- Presunto fatiado: R$ 30.00/kg
- Bacon: R$ 28.00/kg
- Atum em lata: R$ 12.00/unidade (180g)
- Camarão limpo: R$ 60.00/kg

VEGETAIS E LEGUMES:
- Tomate: R$ 4.00/kg
- Cebola: R$ 3.00/kg
- Alho: R$ 25.00/kg
- Pimentão: R$ 6.00/kg
- Batata: R$ 4.00/kg
- Cenoura: R$ 3.50/kg
- Brócolis: R$ 6.00/kg
- Milho verde (lata): R$ 4.00/unidade
- Azeitona: R$ 30.00/kg
- Champignon: R$ 35.00/kg
- Palmito: R$ 25.00/kg

TEMPEROS E CONDIMENTOS:
- Sal refinado: R$ 2.00/kg
- Azeite de oliva: R$ 25.00/L
- Óleo de soja: R$ 8.00/L
- Vinagre: R$ 5.00/L
- Molho de tomate: R$ 6.00/kg
- Extrato de tomate: R$ 8.00/kg
- Molho shoyu: R$ 10.00/L
- Orégano: R$ 15.00/kg
- Pimenta-do-reino: R$ 40.00/kg
- Canela em pó: R$ 20.00/kg

FERMENTOS:
- Fermento biológico seco: R$ 30.00/kg
- Fermento químico em pó: R$ 12.00/kg

OUTROS:
- Água: R$ 0.001/L
- Chocolate em pó: R$ 15.00/kg
- Cacau em pó: R$ 25.00/kg
- Leite condensado: R$ 6.00/unidade (395g)
- Farinha láctea: R$ 12.00/kg

INSTRUÇÕES DE COMPORTAMENTO:
1. Extraia informações do que o usuário disse e atualize a ficha
2. Se não souber um preço, use a tabela acima como referência
3. Para ingredientes não listados, estime com base em similares
4. Normalize unidades (kg, g, L, ml, unidade, dúzia)
5. Responda de forma natural, amigável e em português
6. Se algo não estiver claro, pergunte de forma objetiva
7. Calcule perda percentual realista (5-15% para a maioria dos ingredientes)

FORMATO DE SAÍDA — retorne APENAS JSON válido, sem markdown, sem backticks:
{
  "ficha": {
    "nome": "string",
    "categoria": "string",
    "rendimento_qtd": number,
    "rendimento_unid": "string",
    "preco_venda": number | null,
    "itens": [
      {
        "id": "temp-001",
        "nome": "string",
        "quantidade": number,
        "unidade": "kg" | "g" | "L" | "ml" | "unidade" | "dúzia",
        "preco_unitario": number,
        "perda_percentual": number,
        "preco_estimado": boolean
      }
    ]
  },
  "resposta": "string",
  "completo": boolean
}`;

    const userPrompt = `CONVERSA ATUAL:
${conversaAtual}

FICHA ATUAL:
${fichaAtualStr}

Extraia as informações e retorne SOMENTE o JSON.`;

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

    // ✅ v3: sanitizar preços zerados que a IA possa ter retornado por engano
    if (resultado.ficha?.itens) {
resultado.ficha.itens = resultado.ficha.itens.map((item: any) => {
  if (!item.preco_unitario || item.preco_unitario === 0) {
    console.warn(`⚠️ preco_unitario zerado para "${item.nome}" — aplicando 0.001`);
    return { ...item, preco_unitario: 0.001, preco_estimado: true };
  }
  return item;
});
    }

    // ✅ v2: Validação de ciclos (apenas se companyId disponível)
    const avisos: string[] = [];

    if (companyId && resultado.ficha?.itens?.length > 0) {
      try {
        const detector = await getDetector(companyId);

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
        // Falha silenciosa — o trigger do banco ainda bloqueia no save
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
