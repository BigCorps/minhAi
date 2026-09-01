// app/api/voice/process-demo/route.ts
//
// Cópia fina de app/api/voice/process/route.ts, adaptada para o funil
// de demonstração /lead. Diferenças propositais em relação à rota
// original (todas decisões já confirmadas ao longo do projeto):
//
// 1. Recebe `token` (demo_sessions), não `companyId` (companies).
//    Nunca toca na tabela `companies` nem em `assistant_sessions`.
// 2. Histórico de conversa vive em demo_sessions.context (jsonb),
//    não em assistant_sessions.messages.
// 3. Pré-objetivo (objetivo_cumprido = false): GPT-4o-mini com tools
//    (processWithGPTTools) — identificar_lead, fechar_pedido,
//    marcar_horario. Pós-objetivo: GROQ conversa livre, sem tools.
// 4. Zero débito de crédito, zero insert em assistant_function_logs,
//    zero insert em conversations/messages reais.
// 5. Token inválido/expirado → erro claro, frontend reinicia o fluxo
//    do zero (decisão confirmada: não há recuperação parcial).
// 6. Reaproveita a infraestrutura de baixo nível da rota original:
//    sanitizeInput/INJECTION_PATTERNS (colado aqui, ver nota abaixo)
//    e synthesizeSpeech/BRAZILIAN_VOICES.

import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';
import { processWithGPTTools, type GPTToolCall } from '@/lib/openai';
import { processWithGroq } from '@/lib/groq';
import { getDemoSessionByToken, type DemoSessionRecord } from '@/lib/demo-token';
import { createAdminClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── Sanitização de segurança ─────────────────────────────────────────────
// Idêntico ao padrão de app/api/voice/process/route.ts. Duplicado aqui
// propositalmente: a rota original não exporta essas funções, e criar
// uma dependência cruzada entre as duas rotas de voz (produção vs demo)
// é mais risco do que benefício — preferimos duplicação pequena e
// isolada a acoplamento entre o caminho de produção e o de demo.

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /forget\s+(everything|all|your|what)/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /act\s+as\s+(if\s+you\s+are\s+)?(a|an|the)/i,
  /new\s+(role|persona|instructions?|system\s+prompt)/i,
  /\[system\]/i,
  /\[assistant\]/i,
  /\[inst\]/i,
  /<\|im_start\|>/i,
  /<\|system\|>/i,
  /###\s*instruction/i,
  /prompt\s*injection/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /developer\s+mode/i,
];

function sanitizeInput(text: string): { safe: string; blocked: boolean; reason?: string } {
  if (!text || typeof text !== 'string') {
    return { safe: '', blocked: false };
  }

  const truncated = text.slice(0, 1000);

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(truncated)) {
      console.warn(`🚨 [demo] Prompt injection detectado: "${truncated.slice(0, 80)}..."`);
      return {
        safe: '',
        blocked: true,
        reason: `Padrão bloqueado: ${pattern.source.slice(0, 40)}`,
      };
    }
  }

  const cleaned = truncated
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  return { safe: cleaned, blocked: false };
}

// ─── Tools (function-calling) ──────────────────────────────────────────
// Schemas confirmados em migrations/function_schemas_demo.md

const DEMO_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'identificar_lead',
      description:
        'Chamar quando o usuário informar seu próprio nome (de pessoa, não de empresa) em qualquer momento da conversa, especialmente em resposta à pergunta de apresentação do assistente.',
      parameters: {
        type: 'object',
        properties: {
          nome: {
            type: 'string',
            description:
              'Primeiro nome (ou nome completo, se foi isso que a pessoa disse) do lead, como ele mesmo informou.',
          },
        },
        required: ['nome'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fechar_pedido',
      description:
        "Chamar quando o usuário confirmar que quer fechar/finalizar a compra do produto sendo demonstrado, de qualquer forma que ele expresse isso (ex: 'quero comprar', 'pode fechar', 'vou querer esse', 'bora fechar').",
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'marcar_horario',
      description:
        "Chamar quando o usuário confirmar um horário específico para agendar o serviço sendo demonstrado, em qualquer formato de data/hora que ele mencionar (ex: 'amanhã às 15h', 'sexta de manhã', 'pode ser hoje à tarde').",
      parameters: {
        type: 'object',
        properties: {
          horario: {
            type: 'string',
            description:
              'O horário exatamente como o usuário mencionou, em linguagem natural (não normalizar para data ISO — é só para exibição no modal de confirmação mock).',
          },
        },
        required: ['horario'],
      },
    },
  },
];

// ─── Resolve voz TTS (mesma lógica da rota original, voz fixa para demo) ──

function resolveVoiceName(): string {
  return BRAZILIAN_VOICES.NEURAL_MALE;
}

// ─── buildSystemPrompt ─────────────────────────────────────────────────
// Usa DemoSessionRecord (lib/demo-token.ts) diretamente — sem recriar
// um tipo reduzido aqui.

function buildSystemPrompt(session: DemoSessionRecord): string {
  const auxiliar = ['clinica', 'servicos', 'academia'].includes(session.ramo) ? 'agenda' : 'vendas';

  const apresentacao = `Você é o assistente virtual de demonstração da empresa "${session.nome_negocio}". Esta é uma DEMONSTRAÇÃO do produto minhAi para um possível cliente (lead) que está testando como o assistente funcionaria no negócio dele.`;

  const dadosNegocio = `\n\n## Dados desta demonstração:\n- Negócio: ${session.nome_negocio}\n- Produto/serviço em destaque: ${session.produto}\n- Preço: R$ ${session.preco.toFixed(2)}`;

  const nomeLeadBlock = session.nome_lead
    ? `\n- Nome do visitante: ${session.nome_lead} (já chame-o pelo nome nas respostas)`
    : `\n- Nome do visitante: ainda não informado. Pergunte como pode chamá-lo(a) de forma natural, MAS sempre responda também à pergunta/comentário atual do visitante na mesma resposta — nunca troque a resposta dele por só a pergunta do nome.`;

  const fluxoBlock =
    auxiliar === 'vendas'
      ? `\n\n## Fluxo de venda (demonstração):\nO visitante está testando como seria comprar "${session.produto}" por R$ ${session.preco.toFixed(2)}. Se ele demonstrar intenção de comprar/fechar o pedido, confirme o valor e chame a função fechar_pedido.`
      : `\n\n## Fluxo de agendamento (demonstração):\nO visitante está testando como seria agendar "${session.produto}". Se ele mencionar um horário e confirmar, chame a função marcar_horario com o horário exatamente como ele disse.`;

  const regras = `\n\n## Regras de resposta:\n- Máximo 2-3 frases por resposta (será falado em voz alta)\n- Português brasileiro, linguagem natural e amigável\n- Use SOMENTE os dados desta demonstração (produto e preço acima) — não invente outros produtos\n- NUNCA faça duas perguntas na mesma resposta — uma pergunta por vez\n- Deixe claro, se perguntado, que isto é uma demonstração\n- IMPORTANTE: chamar uma função (identificar_lead, fechar_pedido, marcar_horario) NUNCA substitui sua resposta em texto. Você DEVE SEMPRE responder com texto à mensagem do visitante, mesmo quando também chamar uma função no mesmo turno. Nunca devolva uma chamada de função sem nenhum texto de resposta.`;

  return `${apresentacao}${dadosNegocio}${nomeLeadBlock}${fluxoBlock}${regras}`;
}

function buildPostObjetivoSystemPrompt(session: DemoSessionRecord): string {
  const nomeLeadBlock = session.nome_lead ? ` Trate o visitante por ${session.nome_lead}.` : '';
  return `Você é o assistente virtual de demonstração da empresa "${session.nome_negocio}". O visitante já concluiu o objetivo principal desta demonstração (fechou um pedido teste ou marcou um horário teste).${nomeLeadBlock}

Continue conversando normalmente sobre o produto/serviço "${session.produto}" se ele tiver dúvidas, mas quando for natural, direcione gentilmente para:
- criar o assistente de verdade para o próprio negócio dele (há um botão de cadastro na tela), ou
- falar com o WhatsApp de contato da minhAi para mais dúvidas.

Respostas curtas (máximo 2-3 frases), português brasileiro natural.`;
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n=== 🎯 [DEMO] NOVA REQUISIÇÃO ===');

  try {
    const formData = await request.formData();
    const token = formData.get('token') as string | null;
    const directQuestion = formData.get('directQuestion') as string | null;
    const returnText = formData.get('returnText') === 'true';
    const channel = (formData.get('channel') as string | null) ?? 'pagina';

    if (!token) {
      return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    const session = await getDemoSessionByToken(token);

    if (!session) {
      // Decisão confirmada: sem recuperação parcial — o frontend deve
      // reiniciar o fluxo (voltar para /lead, Passo 0) ao receber isto.
      return NextResponse.json(
        { error: 'SESSAO_EXPIRADA', message: 'Esta demonstração expirou. Vamos recomeçar.' },
        { status: 410 }
      );
    }

    const voiceName = resolveVoiceName();
    const rawMessage = directQuestion || '';
    const { safe: userMessage, blocked, reason } = sanitizeInput(rawMessage);

    if (!rawMessage) {
      const errorAudio = await synthesizeSpeech({
        text: 'Não consegui te ouvir. Pode repetir?',
        voiceName,
        speakingRate: 1.2,
        audioEncoding: 'MP3',
      });
      return new Response(new Uint8Array(errorAudio), {
        headers: { 'Content-Type': 'audio/mpeg' },
      });
    }

    if (blocked) {
      console.warn(`🚨 [demo] Mensagem bloqueada para token ${token}: ${reason}`);
      const blockedAudio = await synthesizeSpeech({
        text: 'Não consigo processar essa solicitação.',
        voiceName,
        speakingRate: 1.2,
        audioEncoding: 'MP3',
      });
      return new Response(new Uint8Array(blockedAudio), {
        headers: { 'Content-Type': 'audio/mpeg', 'X-Security-Block': 'true' },
      });
    }

    console.log(`👂 [demo:${token}] "${userMessage}"`);

    // Histórico vem de demo_sessions.context (jsonb), não assistant_sessions
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> =
      (session.context || []).map((m: any) => ({ role: m.role, content: m.content }));

    let responseText = '';
    let toolCalls: GPTToolCall[] = [];

    if (!session.objetivo_cumprido) {
      // ── Pré-objetivo: GPT-4o-mini com tools ──────────────────
      const systemPrompt = buildSystemPrompt(session);
      const result = await processWithGPTTools(userMessage, systemPrompt, DEMO_TOOLS, conversationHistory);
      responseText = result.text;
      toolCalls = result.toolCalls;

      if (!responseText && toolCalls.length > 0) {
        // Camada de segurança (decisão confirmada: máxima robustez,
        // além da correção do prompt): o modelo só chamou tool(s) sem
        // texto. Em vez de um fallback genérico fixo ("Só um
        // momento..."), fazemos uma 2ª chamada — sem tools desta vez,
        // para forçar texto — informando que a(s) função(ões) já
        // foram registradas e pedindo a resposta de fato à mensagem
        // do visitante. Custa 1 chamada extra de API só quando este
        // caso acontece (deve ser raro após a correção do prompt).
        console.warn(`⚠️ [demo:${token}] Modelo retornou tool call(s) sem texto — acionando camada de segurança`);
        const nomesChamados = toolCalls.map(t => t.name).join(', ');
        const promptRetry = `${systemPrompt}\n\n## Nota interna (não mencione isto ao visitante):\nVocê já decidiu chamar a(s) função(ões): ${nomesChamados}. Elas serão executadas. Agora responda em texto, normalmente, à mensagem do visitante a seguir — não repita nem confirme a função, apenas continue a conversa.`;
        const retryResult = await processWithGPTTools(userMessage, promptRetry, [], conversationHistory);
        responseText = retryResult.text || 'Perfeito! Vamos continuar.';
      }
    } else {
      // ── Pós-objetivo: GROQ conversa livre, sem tools ─────────
      const systemPrompt = buildPostObjetivoSystemPrompt(session);
      responseText = await processWithGroq(userMessage, systemPrompt, conversationHistory);
    }

    // ── Processa tool calls (pode ser mais de uma no mesmo turno) ──
    const supabase = createAdminClient();
    let novoNomeLead: string | null = session.nome_lead;
    let novoObjetivoCumprido = session.objetivo_cumprido;
    let horarioMarcado: string | null = null;
    const updates: Record<string, any> = {};

    for (const call of toolCalls) {
      if (call.name === 'identificar_lead' && call.arguments?.nome) {
        novoNomeLead = String(call.arguments.nome).trim();
        updates.nome_lead = novoNomeLead;
      }
      if (call.name === 'fechar_pedido') {
        novoObjetivoCumprido = true;
        updates.objetivo_cumprido = true;
      }
      if (call.name === 'marcar_horario' && call.arguments?.horario) {
        novoObjetivoCumprido = true;
        updates.objetivo_cumprido = true;
        horarioMarcado = String(call.arguments.horario);
        // Migration 002 adicionou a coluna própria horario_marcado —
        // persistido aqui (não só dentro do 'context' jsonb), para
        // que o Passo 2 (e-mail) e qualquer relatório futuro possam
        // consultar direto, sem parsear o histórico de conversa.
        updates.horario_marcado = horarioMarcado;
      }
    }

    // ── Atualiza contexto (histórico) + demais updates em 1 chamada ──
    const novoContext = [
      ...(session.context || []),
      { role: 'user', content: userMessage, channel, at: new Date().toISOString() },
      {
        role: 'assistant',
        content: responseText,
        channel,
        at: new Date().toISOString(),
        ...(horarioMarcado ? { horario_marcado: horarioMarcado } : {}),
      },
    ];

    await supabase
      .from('demo_sessions')
      .update({
        context: novoContext,
        ...updates,
      })
      .eq('token', token);

    const totalTime = Date.now() - startTime;
    console.log(`⏱️ [demo] Total: ${totalTime}ms\n`);

    if (returnText) {
      return NextResponse.json({
        response: responseText,
        toolCalls,
        objetivoCumprido: novoObjetivoCumprido,
        nomeLead: novoNomeLead,
        horarioMarcado,
        processingTime: totalTime,
      });
    }

    const audioBuffer = await synthesizeSpeech({
      text: responseText,
      voiceName,
      speakingRate: 1.2,
      audioEncoding: 'MP3',
    });

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Processing-Time': String(totalTime),
        'X-Transcription': encodeURIComponent(userMessage),
        'X-Response-Text': encodeURIComponent(responseText.slice(0, 300)),
        'X-Tool-Calls': encodeURIComponent(JSON.stringify(toolCalls.map(t => t.name))),
        'X-Objetivo-Cumprido': String(novoObjetivoCumprido),
        ...(horarioMarcado ? { 'X-Horario-Marcado': encodeURIComponent(horarioMarcado) } : {}),
      },
    });
  } catch (error: any) {
    console.error('❌ [demo] Erro:', error.message);
    try {
      const errorAudio = await synthesizeSpeech({
        text: 'Desculpe, ocorreu um erro.',
        voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
        speakingRate: 1.2,
        audioEncoding: 'MP3',
      });
      return new Response(new Uint8Array(errorAudio), {
        headers: { 'Content-Type': 'audio/mpeg', 'X-Error': 'true' },
      });
    } catch {
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
  }
}