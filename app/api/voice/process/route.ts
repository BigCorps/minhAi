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

// ✅ Verificar hints confirmados — roda antes do FAQ e ChatGPT
// Retorna function_key se bater com ≥60% das palavras do transcript salvo
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

    if (!audioFile || !companyId) {
      return NextResponse.json({ error: 'Áudio e ID obrigatórios' }, { status: 400 });
    }

    const supabase = createClient();
    
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, system_prompt, orcamento_prompt, greeting_message, welcome_message')
      .eq('id', companyId)
      .single();

    if (!company) throw new Error('Company not found');

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
      const { data: newSession, error: sessionError } = await supabase
        .from('assistant_sessions')
        .insert({ company_id: companyId, messages: [] })
        .select()
        .single();

      if (sessionError || !newSession) {
        console.error('❌ Erro ao criar sessão:', sessionError);
        currentSession = { id: randomUUID(), messages: [] };
        console.log('⚠️ Usando sessão temporária (sem persistência)');
      } else {
        currentSession = newSession;
        console.log('✨ Nova sessão criada:', currentSession.id);
      }
    }

    const userMessage = directQuestion || '';
    const saleMode = formData.get('saleMode') === 'true';

    if (!userMessage) {
      const errorAudio = await synthesizeSpeech({
        text: 'Não consegui te ouvir. Pode repetir?',
        voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
        speakingRate: 1.2,
        audioEncoding: 'MP3',
      });
      return new Response(new Uint8Array(errorAudio), {
        headers: { 'Content-Type': 'audio/mpeg', 'X-Used-FAQ': 'false' },
      });
    }

    console.log(`👂 "${userMessage}"`);

    const useOrcamentoPrompt = formData.get('useOrcamentoPrompt') === 'true';
    console.log('📋 useOrcamentoPrompt:', useOrcamentoPrompt);

    // ✅ HINTS: Verificar antes do FAQ e ChatGPT (não roda para orçamento)
    if (!useOrcamentoPrompt) {
      const matchedFunctionKey = await findMatchingHint(supabase, companyId, userMessage);
      if (matchedFunctionKey) {
        console.log(`🎯 Hint ativou função: ${matchedFunctionKey}`);
        const totalTime = Date.now() - startTime;

        // Retornar áudio curto + header X-Function-Key para o frontend executar a função
        const hintAudio = await synthesizeSpeech({
          text: 'Um momento...',
          voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
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

    // FAQ só roda quando NÃO for orçamento
    const matchingFAQ = useOrcamentoPrompt
      ? null
      : await findMatchingFAQ(supabase, companyId, userMessage);
    
    let responseText = '';
    let usedFAQ = false;

    if (matchingFAQ) {
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

const saleModeContext = saleMode
  ? `\n\nCONTEXTO ATUAL: O cliente está visualizando o CARDÁPIO/LOJA VIRTUAL.
Suas prioridades agora:
1. Responda perguntas sobre produtos, preços e disponibilidade de forma direta.
2. Se o cliente perguntar algo não relacionado a produtos, responda brevemente e redirecione: "Posso te ajudar a escolher algo do cardápio?"
3. Respostas curtas — o cliente está no processo de compra.
4. Se mencionar um produto, confirme se está disponível e informe o preço.`
  : '';

const systemPrompt = useOrcamentoPrompt && company.orcamento_prompt
  ? company.orcamento_prompt
        : `${company.system_prompt || `Você é um assistente virtual da empresa ${company.name}.`}

Regras:
- Seja breve (máximo 2-3 frases)
- Use linguagem natural
- Português brasileiro
- Se não souber, seja honesto

Pergunta: ${userMessage}`;

      console.log('📋 Usando prompt:', useOrcamentoPrompt ? 'ORÇAMENTO' : 'PADRÃO');

      responseText = await processWithGPT(userMessage, systemPrompt, conversationHistory);
      console.log(`🧠 Usando contexto de ${conversationHistory.length} mensagens`);
      console.log('✅ OpenAI respondeu');

      const functionKey = useOrcamentoPrompt ? 'orcamento' : 'chatgpt';

      await supabase.from('assistant_function_logs').insert({
        company_id: companyId,
        function_key: functionKey,
        credits_consumed: 2,
        metadata: { user_input: userMessage, assistant_response: responseText },
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
      voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
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
