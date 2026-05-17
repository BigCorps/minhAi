import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { company_id, messages, orcamento_context } = await req.json();

    const supabase = createClient();

    // Buscar company com prompt e logo
 const { data: company } = await supabase
   .from('companies')
   .select('orcamento_prompt, name, slug, logo_url, webapp_theme_color')
   .eq('id', company_id)
   .single();

    if (!company?.orcamento_prompt) {
      return NextResponse.json({ error: 'Orçamento não configurado.' }, { status: 400 });
    }

    // Buscar produtos da company para contexto de preços
    const { data: produtos } = await supabase
      .from('produtos_venda')
      .select('nome, preco_venda, unidade, categoria, descricao')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .order('display_order');

    const produtosContext = produtos?.length
      ? `\n\nPRODUTOS/SERVIÇOS DISPONÍVEIS COM PREÇOS REAIS:\n` +
        produtos.map(p =>
          `- ${p.nome}${p.categoria ? ` (${p.categoria})` : ''}: R$ ${Number(p.preco_venda).toFixed(2)}/${p.unidade}${p.descricao ? ` — ${p.descricao}` : ''}`
        ).join('\n')
      : '';

    const systemPrompt = `Você é um assistente de orçamento da empresa ${company.name}.

${company.orcamento_prompt}${produtosContext}

INSTRUÇÕES CRÍTICAS:
- Sempre responda em JSON válido com exatamente esta estrutura:
{
  "resposta": "sua mensagem para o cliente",
  "orcamento": {
    "cliente": { "nome": "", "contato": "" },
    "itens": [{ "descricao": "", "qtd": 1, "valor_unitario": 0, "subtotal": 0 }],
    "total": 0,
    "condicoes": ""
  },
  "completo": false
}
- Use os preços reais dos produtos listados acima quando disponíveis.
- Acumule todos os itens do orçamento conforme a conversa avança.
- Recalcule o total a cada mensagem.
- Quando o cliente indicar que terminou (ex: "é isso", "pode fechar", "só isso", "pronto"), defina "completo": true e pergunte se deseja salvar em PDF.
- Quando "completo" for true, a "resposta" deve ser: "Orçamento finalizado! Deseja salvar em PDF?"
- Nunca inclua texto fora do JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        ...(orcamento_context && Object.keys(orcamento_context).length > 0
          ? [{ role: 'system' as const, content: `Estado atual do orçamento: ${JSON.stringify(orcamento_context)}` }]
          : []),
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
    });

    const raw = completion.choices[0].message.content || '{}';
    const resultado = JSON.parse(raw);

    // Garantir estrutura mínima
    if (!resultado.orcamento) {
      resultado.orcamento = { cliente: { nome: '', contato: '' }, itens: [], total: 0, condicoes: '' };
    }

    return NextResponse.json({
      resposta: resultado.resposta || '',
      orcamento: resultado.orcamento,
      completo: resultado.completo === true,
      
 company: {
   name: company.name,
   slug: company.slug,
   logo_url: company.logo_url,
   theme_color: company.webapp_theme_color || '#3b82f6',
 },
    });

  } catch (err) {
    console.error('[ORCAMENTO CHAT]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}