// app/api/setup/chat-funcoes/route.ts
// GPT interpreta pedidos livres sobre funções:
// - ativar / desativar por nome ou descrição
// - explicar o que uma função faz
// - recomendar funções para um objetivo
// Leva em conta o assistant_type da empresa (smart/vendas)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ChatFuncoesBody {
  companyId:     string;
  message:       string;         // mensagem do usuário
  // Estado atual do painel — quais estão ativas no momento
  activeFunctions: string[];     // function_keys atualmente ativas
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatFuncoesBody = await request.json();
    const { companyId, message, activeFunctions } = body;

    if (!companyId || !message?.trim()) {
      return NextResponse.json({ error: 'companyId e message são obrigatórios' }, { status: 400 });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
    }

    const supabase = createClient();

    // ── 1. Buscar tipo do assistente ────────────────────────
    const { data: company } = await supabase
      .from('companies')
      .select('assistant_type, name, segment_key')
      .eq('id', companyId)
      .single();

    const assistantType = company?.assistant_type ?? 'smart';
    const companyName   = company?.name ?? 'empresa';

    // ── 2. Buscar todas as funções ativas no catálogo ───────
    const { data: allFunctions } = await supabase
      .from('assistant_functions')
      .select('function_key, function_name, short_description, function_category')
      .eq('is_active', true)
      .order('function_name');

    if (!allFunctions?.length) {
      return NextResponse.json({
        reply:   'Não consegui carregar o catálogo de funções agora. Tente novamente.',
        actions: [],
      });
    }

    // Para Vendas, filtra só as funções compatíveis
    const VENDAS_ALLOWED = new Set([
      'nossa_marca','endereco','chatgpt','faq',
      'cardapio','ver_produtos','fazer_pedido','modo_venda','consultar_estoque',
      'pix_generate','pix_confirm','link_pagamento','nfc_credito','nfc_debito',
      'meu_cupom','qrcode_whatsapp','qrcode_instagram','cadastro',
    ]);

    const visibleFunctions = assistantType === 'vendas'
      ? allFunctions.filter(f => VENDAS_ALLOWED.has(f.function_key))
      : allFunctions;

    // ── 3. Montar catálogo resumido para o GPT ──────────────
    const catalog = visibleFunctions
      .map(f => {
        const isActive = activeFunctions.includes(f.function_key);
        return `- ${f.function_key} | "${f.function_name}" | ${f.short_description} | ${isActive ? 'ATIVA' : 'INATIVA'}`;
      })
      .join('\n');

    const activeList = activeFunctions.length > 0
      ? activeFunctions.join(', ')
      : 'nenhuma';

    // ── 4. Prompt do GPT ────────────────────────────────────
    const systemPrompt = `Você é um assistente especialista em configuração do minhAi para a empresa "${companyName}" (tipo: ${assistantType === 'vendas' ? 'minhAi Vendas' : 'minhAi Smart'}).

Seu papel é ajudar o dono da empresa a gerenciar as funções do assistente virtual deles conversando naturalmente.

Você pode:
1. ATIVAR funções quando o usuário pedir
2. DESATIVAR funções quando o usuário pedir
3. EXPLICAR o que uma função faz, quando necessário
4. RECOMENDAR funções para um objetivo descrito
5. RESPONDER dúvidas sobre as funções disponíveis

${assistantType === 'vendas' 
  ? 'IMPORTANTE: Este é um assistente minhAi Vendas. Só liste funções compatíveis com o modelo de vendas (as que aparecem no catálogo abaixo).'
  : 'Este é um assistente minhAi Smart com acesso ao catálogo completo de funções.'}

CATÁLOGO DE FUNÇÕES (formato: function_key | "Nome" | descrição | status atual):
${catalog}

FUNÇÕES ATUALMENTE ATIVAS: ${activeList}

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português brasileiro, de forma natural e amigável
- Seja direto: confirme o que foi feito ou explique o que vai fazer
- Quando ativar/desativar, mencione o NOME da função (não a chave técnica) na resposta
- Quando o usuário pedir "ativar tudo" ou "desativar tudo", processe TODAS as funções do catálogo visível
- Se o usuário descrever um objetivo ("quero receber PIX", "quero agendar clientes"), recomende as funções relevantes e pergunte se quer ativá-las
- Se o usuário perguntar o que uma função faz, explique em linguagem simples sem jargões técnicos
- Nunca invente function_keys — use APENAS as do catálogo acima
- Responda de forma concisa (máximo 3 frases) a não ser que precise explicar algo

FORMATO DA RESPOSTA — responda APENAS com um JSON válido, sem markdown, sem explicações fora do JSON:
{
  "reply": "sua resposta em linguagem natural para o usuário",
  "actions": [
    { "function_key": "chave_da_funcao", "action": "enable" },
    { "function_key": "outra_chave", "action": "disable" }
  ]
}

Se não há ações a executar (só explicação ou dúvida), retorne "actions": [].`;

    // ── 5. Chamar GPT-4o ────────────────────────────────────
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
        max_tokens: 600,
        temperature: 0.3, // baixo para respostas precisas e consistentes
        response_format: { type: 'json_object' },
      }),
    });

    if (!gptResponse.ok) {
      console.error('GPT falhou:', gptResponse.status);
      return NextResponse.json({
        reply:   'Tive um problema para processar seu pedido. Pode tentar de novo?',
        actions: [],
      });
    }

    const gptData = await gptResponse.json();
    const rawContent = gptData.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      return NextResponse.json({
        reply:   'Não consegui processar isso. Pode reformular o pedido?',
        actions: [],
      });
    }

    // ── 6. Parsear resposta do GPT ──────────────────────────
    let parsed: { reply: string; actions: { function_key: string; action: 'enable' | 'disable' }[] };

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // GPT às vezes adiciona markdown mesmo com json_object — tentar limpar
      const cleaned = rawContent.replace(/```json|```/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return NextResponse.json({
          reply:   rawContent.slice(0, 300), // retorna o texto direto se não conseguiu parsear
          actions: [],
        });
      }
    }

    // ── 7. Validar actions — só aceitar function_keys do catálogo ──
    const validKeys = new Set(visibleFunctions.map(f => f.function_key));
    const safeActions = (parsed.actions ?? []).filter(
      a => validKeys.has(a.function_key) && (a.action === 'enable' || a.action === 'disable')
    );

    return NextResponse.json({
      reply:   parsed.reply ?? 'Pronto!',
      actions: safeActions,
    });

  } catch (error: any) {
    console.error('Erro em chat-funcoes:', error);
    return NextResponse.json({
      reply:   'Ocorreu um erro inesperado. Tente novamente.',
      actions: [],
    });
  }
}
