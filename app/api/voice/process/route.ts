import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { processWithGPT } from '@/lib/openai';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

// ─── Sanitização de segurança ─────────────────────────────────────────────

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
      console.warn(`🚨 Prompt injection detectado: "${truncated.slice(0, 80)}..."`);
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

// ─── findMatchingFAQ ──────────────────────────────────────────────────────

async function findMatchingFAQ(supabase: any, companyId: string, question: string) {
  console.log('=== FAQ MATCHING ===');
  console.log('❓', question);

  const { data: faqs, error } = await supabase
    .from('faq_entries')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error || !faqs || faqs.length === 0) {
    console.log('❌ Sem FAQs');
    return null;
  }

  const questionNormalized = normalizeText(question);
  const questionWords = questionNormalized.split(' ').filter((w: string) => w.length > 2);

  let bestMatch: any = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const faqQuestionNormalized = normalizeText(faq.question);

    if (questionNormalized === faqQuestionNormalized) {
      bestScore = 1.0;
      bestMatch = faq;
      break;
    }

    const score = similarity(questionNormalized, faqQuestionNormalized);
    if (score > bestScore && score > 0.85) {
      bestScore = score;
      bestMatch = faq;
    }

    if (faq.variations && Array.isArray(faq.variations)) {
      for (const variation of faq.variations) {
        const variationNormalized = normalizeText(variation);
        if (questionNormalized === variationNormalized) {
          bestScore = 1.0;
          bestMatch = faq;
          break;
        }
        const varScore = similarity(questionNormalized, variationNormalized);
        if (varScore > bestScore && varScore > 0.85) {
          bestScore = varScore;
          bestMatch = faq;
        }
      }
    }

    const faqWords = faqQuestionNormalized.split(' ').filter((w: string) => w.length > 2);
    const commonWords = questionWords.filter((w: string) => faqWords.includes(w));
    const keywordScore = commonWords.length / Math.max(questionWords.length, faqWords.length);

    if (keywordScore > bestScore && keywordScore > 0.70) {
      bestScore = keywordScore;
      bestMatch = faq;
    }
  }

  if (bestMatch) {
    console.log(`✅ FAQ: "${bestMatch.question}" (${(bestScore * 100).toFixed(0)}%)`);
  } else {
    console.log('❌ Sem match FAQ');
  }

  return bestMatch;
}

// ─── findMatchingHint ─────────────────────────────────────────────────────

async function findMatchingHint(
  supabase: any,
  companyId: string,
  userMessage: string
): Promise<string | null> {
  try {
    const { data: hints, error } = await supabase
      .from('function_hints')
      .select('transcript, function_key')
      .eq('company_id', companyId)
      .eq('confirmed', true)
      .not('function_key', 'is', null);

    if (error || !hints || hints.length === 0) return null;

    const lowerMsg = normalizeText(userMessage);

    for (const hint of hints) {
      const hintNorm = normalizeText(hint.transcript);
      const hintWords = hintNorm.split(/\s+/).filter((w: string) => w.length > 2);
      if (hintWords.length === 0) continue;

      const matches = hintWords.filter((w: string) => lowerMsg.includes(w));
      const score = matches.length / hintWords.length;

      if (score >= 0.6) {
        console.log(`🎯 Hint matched: "${hint.transcript}" → ${hint.function_key} (${Math.round(score * 100)}%)`);
        return hint.function_key;
      }
    }

    return null;
  } catch (err) {
    console.warn('⚠️ Erro ao verificar hints:', err);
    return null;
  }
}

// ─── fetchRAGContext (NOVO) ───────────────────────────────────────────────

async function fetchRAGContext(
  supabase: any,
  companyId: string,
  userMessage: string,
): Promise<string | null> {
  try {
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: userMessage,
      }),
    });

    if (!embeddingResponse.ok) {
      console.warn('⚠️ RAG: falha ao gerar embedding:', embeddingResponse.status);
      return null;
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding: number[] = embeddingData.data[0].embedding;

    const { data: matches, error } = await supabase.rpc('match_context', {
      query_embedding: queryEmbedding,
      p_company_id: companyId,
      product_threshold: 0.75,
      faq_threshold: 0.80,
      product_count: 6,
      faq_count: 3,
    });

    if (error) {
      console.warn('⚠️ RAG: erro no match_context RPC:', error.message);
      return null;
    }

    if (!matches || matches.length === 0) {
      console.log('🔍 RAG: nenhum match semântico encontrado');
      return null;
    }

    const lines: string[] = matches.map((m: any) => {
      const label = m.type === 'product' ? '[produto]' : '[faq]';
      const score = (m.similarity * 100).toFixed(0);
      return `${label} ${m.content} (relevância: ${score}%)`;
    });

    const ragContext = lines.join('\n');
    console.log(`🔍 RAG: ${matches.length} resultado(s) semântico(s) encontrado(s)`);

    return ragContext;

  } catch (err: any) {
    console.warn('⚠️ RAG: erro inesperado (ignorado):', err.message);
    return null;
  }
}

// ─── Resolve voz TTS da empresa ───────────────────────────────────────────

function resolveVoiceName(ttsVoice: string | null | undefined): string {
  const allowed = [BRAZILIAN_VOICES.NEURAL_MALE, BRAZILIAN_VOICES.NEURAL_FEMALE];
  if (ttsVoice && allowed.includes(ttsVoice as any)) return ttsVoice;
  return BRAZILIAN_VOICES.NEURAL_MALE;
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n=== 🎯 NOVA REQUISIÇÃO ===');

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const companyId = formData.get('companyId') as string;
    const conversationId = formData.get('conversationId') as string | null;
    const directQuestion = formData.get('directQuestion') as string | null;
    const returnText = formData.get('returnText') === 'true';
    const companyContext = formData.get('companyContext') as string | null;

    if (!audioFile || !companyId) {
      return NextResponse.json({ error: 'Áudio e ID obrigatórios' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: company } = await supabase
      .from('companies')
      .select('id, name, system_prompt, orcamento_prompt, greeting_message, groq_fallback_message, welcome_message, tts_voice, assistant_role')
      .eq('id', companyId)
      .single();

    if (!company) throw new Error('Company not found');

    const voiceName = resolveVoiceName(company.tts_voice);
    console.log(`🔊 Voz TTS: ${voiceName}`);

    const sessionId = formData.get('sessionId') as string | null;
    let currentSession: any = null;
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (sessionId) {
      const { data: session } = await supabase
        .from('assistant_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('company_id', companyId)
        .single();

      if (session && new Date(session.expires_at) > new Date()) {
        currentSession = session;
        conversationHistory = session.messages || [];
        console.log(`💬 Sessão encontrada com ${conversationHistory.length} mensagens`);
      } else {
        console.log('⚠️ Sessão expirada ou não encontrada, criando nova');
      }
    }

    if (!currentSession) {
      const newSessionId = sessionId || randomUUID();

      const { data: newSession, error: sessionError } = await supabase
        .from('assistant_sessions')
        .insert({
          id: newSessionId,
          company_id: companyId,
          messages: [],
        })
        .select()
        .single();

      if (sessionError || !newSession) {
        console.error('❌ Erro ao criar sessão:', sessionError);
        currentSession = { id: newSessionId, messages: [] };
        console.log('⚠️ Usando sessão temporária (sem persistência)');
      } else {
        currentSession = newSession;
        console.log('✨ Nova sessão criada:', currentSession.id);
      }
    }

    const rawMessage = directQuestion || '';
    const saleMode = formData.get('saleMode') === 'true';

    const { safe: userMessage, blocked, reason } = sanitizeInput(rawMessage);

    if (!rawMessage) {
      const errorAudio = await synthesizeSpeech({
        text: 'Não consegui te ouvir. Pode repetir?',
        voiceName,
        speakingRate: 1.2,
        audioEncoding: 'MP3',
      });
      return new Response(new Uint8Array(errorAudio), {
        headers: { 'Content-Type': 'audio/mpeg', 'X-Used-FAQ': 'false' },
      });
    }

    if (blocked) {
      console.warn(`🚨 Mensagem bloqueada para company ${companyId}: ${reason}`);

      await supabase.from('assistant_function_logs').insert({
        company_id: companyId,
        function_key: 'security_block',
        credits_consumed: 0,
        metadata: {
          reason,
          input_preview: rawMessage.slice(0, 80),
          blocked_at: new Date().toISOString(),
        },
      });

      const blockedAudio = await synthesizeSpeech({
        text: 'Não consigo processar essa solicitação.',
        voiceName,
        speakingRate: 1.2,
        audioEncoding: 'MP3',
      });
      return new Response(new Uint8Array(blockedAudio), {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Security-Block': 'true',
          'X-Used-FAQ': 'false',
        },
      });
    }

    console.log(`👂 "${userMessage}"`);

    const useOrcamentoPrompt = formData.get('useOrcamentoPrompt') === 'true';
    console.log('📋 useOrcamentoPrompt:', useOrcamentoPrompt);

    // Hints
    if (!useOrcamentoPrompt) {
      const matchedFunctionKey = await findMatchingHint(supabase, companyId, userMessage);
      if (matchedFunctionKey) {
        console.log(`🎯 Hint ativou função: ${matchedFunctionKey}`);
        const totalTime = Date.now() - startTime;

        const hintAudio = await synthesizeSpeech({
          text: 'Um momento...',
          voiceName,
          speakingRate: 1.2,
          audioEncoding: 'MP3',
        });

        return new Response(new Uint8Array(hintAudio), {
          headers: {
            'Content-Type': 'audio/mpeg',
            'X-Function-Key': matchedFunctionKey,
            'X-Session-Id': currentSession.id,
            'X-Processing-Time': String(totalTime),
            'X-Transcription': encodeURIComponent(userMessage),
          },
        });
      }
    }

    // FAQ
    const matchingFAQ = useOrcamentoPrompt
      ? null
      : await findMatchingFAQ(supabase, companyId, userMessage);

    let responseText = '';
    let usedFAQ = false;

    if (matchingFAQ) {
      if (matchingFAQ.function_key) {
        console.log(`⚡ FAQ com função vinculada: ${matchingFAQ.function_key}`);

        supabase
          .from('faq_entries')
          .update({ usage_count: (matchingFAQ.usage_count || 0) + 1 })
          .eq('id', matchingFAQ.id)
          .then(() => console.log('📊 +1'));

        await supabase.from('assistant_function_logs').insert({
          company_id: companyId,
          function_key: matchingFAQ.function_key,
          credits_consumed: 1,
          metadata: {
            user_input: userMessage,
            triggered_by: 'faq',
            faq_id: matchingFAQ.id,
          },
        });

        const introText = matchingFAQ.answer || 'Um momento...';
        const faqFunctionAudio = await synthesizeSpeech({
          text: introText,
          voiceName,
          speakingRate: 1.2,
          audioEncoding: 'MP3',
        });

        const totalTime = Date.now() - startTime;
        console.log(`⏱️ Total: ${totalTime}ms\n`);

        const responseHeaders: Record<string, string> = {
          'Content-Type': 'audio/mpeg',
          'X-Function-Key': matchingFAQ.function_key,
          'X-Session-Id': currentSession.id,
          'X-Used-FAQ': 'true',
          'X-Processing-Time': String(totalTime),
          'X-Transcription': encodeURIComponent(userMessage),
          'X-Response-Text': encodeURIComponent(introText.slice(0, 300)),
        };

        if (matchingFAQ.function_params) {
          responseHeaders['X-Function-Params'] = encodeURIComponent(
            JSON.stringify(matchingFAQ.function_params)
          );
        }

        return new Response(new Uint8Array(faqFunctionAudio), { headers: responseHeaders });
      }

      responseText = matchingFAQ.answer;
      usedFAQ = true;
      console.log('⚡ Usando FAQ');

      supabase
        .from('faq_entries')
        .update({ usage_count: (matchingFAQ.usage_count || 0) + 1 })
        .eq('id', matchingFAQ.id)
        .then(() => console.log('📊 +1'));

      await supabase.from('assistant_function_logs').insert({
        company_id: companyId,
        function_key: 'faq',
        credits_consumed: 1,
        metadata: { user_input: userMessage, assistant_response: responseText },
      });

    } else {
      console.log('🤖 Usando OpenAI GPT-4o-mini');

      // RAG: busca semântica como fallback antes do GPT
      let ragContext: string | null = null;
      if (!useOrcamentoPrompt) {
        ragContext = await fetchRAGContext(supabase, companyId, userMessage);
      }

      const systemPrompt = buildSystemPrompt({
        company,
        companyContext,
        userMessage,
        saleMode,
        useOrcamentoPrompt,
        ragContext,
      });

      console.log('📋 Usando prompt:', useOrcamentoPrompt ? 'ORÇAMENTO' : 'PADRÃO');
      console.log(`📦 companyContext recebido: ${companyContext ? companyContext.length + ' chars' : 'VAZIO ⚠️'}`);
      console.log(`🔍 ragContext: ${ragContext ? ragContext.length + ' chars' : 'nenhum'}`);

      responseText = await processWithGPT(userMessage, systemPrompt, conversationHistory);
      console.log(`🧠 Usando contexto de ${conversationHistory.length} mensagens`);
      console.log('✅ OpenAI respondeu');

      const functionKey = useOrcamentoPrompt ? 'orcamento' : 'chatgpt';

      await supabase.from('assistant_function_logs').insert({
        company_id: companyId,
        function_key: functionKey,
        credits_consumed: 2,
        metadata: {
          user_input: userMessage,
          assistant_response: responseText,
          rag_used: !!ragContext,
          rag_matches: ragContext ? ragContext.split('\n').length : 0,
        },
      });
    }

    conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: responseText }
    );

    const MAX_MESSAGES = 10;
    if (conversationHistory.length > MAX_MESSAGES) {
      conversationHistory = conversationHistory.slice(-MAX_MESSAGES);
    }

    try {
      await supabase
        .from('assistant_sessions')
        .update({
          messages: conversationHistory,
          last_activity_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .eq('id', currentSession.id);
      console.log(`💾 Sessão atualizada: ${conversationHistory.length} mensagens`);
    } catch (sessionUpdateError) {
      console.warn('⚠️ Erro ao atualizar sessão (não crítico):', sessionUpdateError);
    }

    if (returnText) {
      console.log('📄 Retornando texto (sem áudio)');
      let finalConversationId = conversationId || randomUUID();
      if (!conversationId || conversationId === 'new') {
        await supabase.from('conversations').insert({ id: finalConversationId, company_id: companyId });
      }
      await supabase.from('messages').insert([
        { conversation_id: finalConversationId, role: 'user', content: userMessage },
        { conversation_id: finalConversationId, role: 'assistant', content: responseText },
      ]);
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ Total: ${totalTime}ms\n`);
      return NextResponse.json({
        response: responseText,
        sessionId: currentSession.id,
        conversationId: finalConversationId,
        usedFAQ,
        processingTime: totalTime,
      }, { headers: { 'X-Used-FAQ': String(usedFAQ) } });
    }

    const audioBuffer = await synthesizeSpeech({
      text: responseText,
      voiceName,
      speakingRate: 1.2,
      audioEncoding: 'MP3',
    });

    const audioData = new Uint8Array(audioBuffer);
    let finalConversationId = conversationId || randomUUID();

    if (!conversationId || conversationId === 'new') {
      await supabase.from('conversations').insert({ id: finalConversationId, company_id: companyId });
    }

    await supabase.from('messages').insert([
      { conversation_id: finalConversationId, role: 'user', content: userMessage },
      { conversation_id: finalConversationId, role: 'assistant', content: responseText },
    ]);

    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Total: ${totalTime}ms\n`);

    return new Response(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Conversation-Id': finalConversationId,
        'X-Session-Id': currentSession.id,
        'X-Used-FAQ': String(usedFAQ),
        'X-Processing-Time': String(totalTime),
        'X-Transcription': encodeURIComponent(userMessage),
        'X-Response-Text': encodeURIComponent(responseText.slice(0, 300)),
      },
    });

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
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

// ─── buildSystemPrompt ────────────────────────────────────────────────────

interface BuildSystemPromptParams {
  company: {
    name: string;
    system_prompt?: string | null;
    orcamento_prompt?: string | null;
    assistant_role?: string | null;
  };
  companyContext: string | null;
  userMessage: string;
  saleMode: boolean;
  useOrcamentoPrompt: boolean;
  ragContext?: string | null; // NOVO
}

function buildSystemPrompt({
  company,
  companyContext,
  userMessage,
  saleMode,
  useOrcamentoPrompt,
  ragContext,
}: BuildSystemPromptParams): string {

  if (useOrcamentoPrompt && company.orcamento_prompt) {
    return company.orcamento_prompt;
  }

  const role = company.assistant_role || 'assistente virtual';
  const basePrompt = company.system_prompt
    ? company.system_prompt
    : `Você é ${role} da empresa ${company.name}. Responda de forma clara, objetiva e educada.`;

  const contextBlock = companyContext
    ? `\n\n## Dados atuais da empresa:\n${companyContext}`
    : '';

  // NOVO: bloco RAG — só aparece quando encontrou matches semânticos
  const ragBlock = ragContext
    ? `\n\n## Contexto semântico relevante para a pergunta atual:\n${ragContext}\n\nUse estas informações para responder com precisão. Se os dados acima contradisserem algo, prefira os dados acima.`
    : '';

  const saleModeBlock = saleMode
    ? `\n\n## CONTEXTO ATUAL: O cliente está visualizando o CARDÁPIO/LOJA VIRTUAL.
Suas prioridades agora:
1. Responda perguntas sobre produtos, preços e disponibilidade de forma direta.
2. Se o cliente perguntar algo não relacionado a produtos, responda brevemente e redirecione: "Posso te ajudar a escolher algo do cardápio?"
3. Respostas curtas — o cliente está no processo de compra.
4. Se mencionar um produto, confirme se está disponível e informe o preço.`
    : '';

  const rules = `\n\n## Regras de resposta:
- Máximo 2-3 frases por resposta (será falado em voz alta)
- Português brasileiro, linguagem natural e amigável
- Use SOMENTE os dados da empresa acima para responder sobre produtos, preços, horários ou localização
- Se não tiver a informação nos dados acima, diga honestamente que não tem essa informação no momento
- NUNCA invente preços, horários ou produtos que não estejam listados`;

  return `${basePrompt}${contextBlock}${ragBlock}${saleModeBlock}${rules}`;
}
