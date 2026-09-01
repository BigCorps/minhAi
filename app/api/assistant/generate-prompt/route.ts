// app/api/assistant/generate-prompt/route.ts
// Gera o system_prompt via GPT-4o com base nas respostas do onboarding.
// Chamado UMA ÚNICA VEZ na transição da etapa 5 → 6.
// Fallback: template estático por segmento se GPT falhar.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ── Templates de fallback por segmento ──────────────────────
// Usados quando GPT-4o falhar ou demorar demais.
// {NOME} = nome do assistente, {EMPRESA} = nome da empresa
const SEGMENT_TEMPLATES: Record<string, string> = {
  restaurante: `Você é {NOME}, assistente virtual do {EMPRESA}.
Seja simpático, ágil e prestativo. Ajude os clientes a consultar o cardápio, fazer pedidos, tirar dúvidas sobre funcionamento, endereço e horários.
Quando o cliente quiser pagar, ofereça PIX ou link de pagamento.
Responda sempre em português brasileiro, de forma clara e objetiva.`,

  clinica: `Você é {NOME}, assistente virtual do {EMPRESA}.
Trate cada paciente com acolhimento, empatia e respeito.
Ajude com informações sobre agendamentos, confirmações, horários disponíveis, endereço e dúvidas gerais sobre a clínica.
Nunca forneça diagnósticos, prescrições ou orientações médicas específicas.
Responda sempre em português brasileiro.`,

  loja: `Você é {NOME}, assistente virtual do {EMPRESA}.
Seja prestativo e objetivo. Ajude o cliente a encontrar produtos, verificar disponibilidade, conhecer preços e finalizar a compra.
Informe sobre formas de pagamento aceitas (PIX, cartão, link de pagamento) e sobre a política de trocas quando necessário.
Responda sempre em português brasileiro.`,

  servicos: `Você é {NOME}, assistente virtual do {EMPRESA}.
Seja profissional, preciso e cordial. Auxilie com informações sobre serviços oferecidos, agendamentos de reuniões e consultas, geração de orçamentos e respostas a dúvidas frequentes.
Responda sempre em português brasileiro.`,

  academia: `Você é {NOME}, assistente virtual do {EMPRESA}.
Seja motivador e acolhedor. Ajude com informações sobre aulas, horários, agendamentos e planos disponíveis.
Incentive os clientes a manter a constância e cuidar da saúde.
Responda sempre em português brasileiro.`,

  educacao: `Você é {NOME}, assistente virtual do {EMPRESA}.
Seja claro, paciente e encorajador. Ajude alunos e responsáveis com informações sobre cursos, matrículas, horários, mensalidades e dúvidas gerais sobre a instituição.
Responda sempre em português brasileiro.`,

  outro: `Você é {NOME}, assistente virtual do {EMPRESA}.
Seja prestativo, cordial e objetivo. Ajude os clientes com informações sobre a empresa, produtos ou serviços oferecidos, e encaminhe para o contato certo quando necessário.
Responda sempre em português brasileiro.`,
};

// ── Interfaces ───────────────────────────────────────────────

interface Step3Data {
  company_name: string;
  what_offers: string;
  location?: string;
  hours?: string;
  extra_info?: string;
}

interface Step4Data {
  tone: 'formal' | 'amigavel' | 'descontraido';
}

interface Step5Data {
  no_competitor_info: boolean;
  no_prices: boolean;
  no_personal_data: boolean;
  custom_rule?: string;
}

interface GeneratePromptBody {
  assistantName: string;
  segmentKey: string;
  assistantType: 'smart' | 'vendas';
  step3: Step3Data;
  step4: Step4Data;
  step5: Step5Data;
}

// ── Handler ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePromptBody = await request.json();
    const { assistantName, segmentKey, assistantType, step3, step4, step5 } = body;

    if (!assistantName || !segmentKey || !step3?.company_name || !step3?.what_offers) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: assistantName, segmentKey, step3.company_name, step3.what_offers' },
        { status: 400 }
      );
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // ── Sem chave: usar fallback diretamente ─────────────────
    if (!OPENAI_API_KEY) {
      const prompt = buildFallback(assistantName, step3.company_name, segmentKey);
      return NextResponse.json({ prompt, source: 'fallback' });
    }

    // ── Montar contexto para o GPT ───────────────────────────
    const toneDesc = {
      formal: 'formal e profissional, usando linguagem respeitosa e tratamento por "você"',
      amigavel: 'amigável e acolhedor, como se fosse um colaborador próximo da empresa',
      descontraido: 'descontraído e divertido, com leveza e personalidade, sem ser invasivo',
    }[step4.tone] ?? 'amigável e acolhedor';

    const rules: string[] = [];
    if (step5.no_competitor_info) rules.push('Nunca mencione ou compare com concorrentes.');
    if (step5.no_prices)          rules.push('Não informe preços — redirecione o cliente para falar com a equipe.');
    if (step5.no_personal_data)   rules.push('Não solicite nem armazene dados pessoais sensíveis como CPF ou cartão.');
    if (step5.custom_rule)        rules.push(step5.custom_rule.trim());

    const typeContext = assistantType === 'vendas'
      ? 'Este assistente é focado em vendas — priorize sempre guiar o cliente para concluir uma compra ou pedido.'
      : 'Este assistente é multifuncional — equilibre atendimento, informação e conversão.';

    const userMessage = `
Crie um system_prompt em português brasileiro para um assistente virtual com as seguintes características:

NOME DO ASSISTENTE: ${assistantName}
EMPRESA: ${step3.company_name}
O QUE OFERECE: ${step3.what_offers}
${step3.location ? `LOCALIZAÇÃO: ${step3.location}` : ''}
${step3.hours    ? `HORÁRIOS: ${step3.hours}`         : ''}
${step3.extra_info ? `INFORMAÇÕES EXTRAS: ${step3.extra_info}` : ''}

TOM DE VOZ: ${toneDesc}
CONTEXTO: ${typeContext}
${rules.length > 0 ? `REGRAS OBRIGATÓRIAS:\n${rules.map(r => `- ${r}`).join('\n')}` : ''}

INSTRUÇÕES PARA O PROMPT:
- Comece com "Você é ${assistantName}, assistente virtual do ${step3.company_name}."
- Inclua as informações da empresa de forma natural no prompt
- Defina claramente o tom de voz
- Inclua as regras obrigatórias de forma natural
- Máximo de 300 palavras
- Não use asteriscos, markdown ou formatação especial
- Responda APENAS com o system_prompt, sem explicações adicionais
`.trim();

    // ── Chamar GPT-4o ────────────────────────────────────────
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em criar personas e prompts para assistentes virtuais de empresas brasileiras. Crie prompts naturais, específicos e eficazes.',
          },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!gptResponse.ok) {
      // GPT falhou — usar fallback sem quebrar o fluxo
      console.error('GPT-4o falhou:', gptResponse.status);
      const prompt = buildFallback(assistantName, step3.company_name, segmentKey);
      return NextResponse.json({ prompt, source: 'fallback' });
    }

    const gptData = await gptResponse.json();
    const generatedPrompt = gptData.choices?.[0]?.message?.content?.trim();

    if (!generatedPrompt) {
      const prompt = buildFallback(assistantName, step3.company_name, segmentKey);
      return NextResponse.json({ prompt, source: 'fallback' });
    }

    return NextResponse.json({ prompt: generatedPrompt, source: 'gpt' });

  } catch (error: any) {
    console.error('Erro em generate-prompt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper: montar fallback ──────────────────────────────────
function buildFallback(assistantName: string, companyName: string, segmentKey: string): string {
  const template = SEGMENT_TEMPLATES[segmentKey] ?? SEGMENT_TEMPLATES['outro'];
  return template
    .replace(/{NOME}/g, assistantName)
    .replace(/{EMPRESA}/g, companyName);
}
