import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { processWithGPT } from '@/lib/openai';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Funções auxiliares para FAQ matching
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
    
    // Match exato
    if (questionNormalized === faqQuestionNormalized) {
      bestScore = 1.0;
      bestMatch = faq;
      break;
    }
    
    // Similaridade 85%
    const score = similarity(questionNormalized, faqQuestionNormalized);
    if (score > bestScore && score > 0.85) {
      bestScore = score;
      bestMatch = faq;
    }
    
    // Variações
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
    
    // Keywords 70%
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
      return NextResponse.json(
        { error: 'Áudio e ID obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Buscar company
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, system_prompt, orcamento_prompt, greeting_message, welcome_message')
      .eq('id', companyId)
      .single();

    if (!company) {
      throw new Error('Company not found');
    }

    // ✅ NOVO: Gerenciar sessão de contexto
    const sessionId = formData.get('sessionId') as string | null;
    let currentSession: any = null;
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (sessionId) {
      // Buscar sessão existente
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
      // Criar nova sessão
      const { data: newSession } = await supabase
        .from('assistant_sessions')
        .insert({
          company_id: companyId,
          messages: [],
        })
        .select()
        .single();
      
      currentSession = newSession;
      console.log('✨ Nova sessão criada:', currentSession.id);
    }

    const userMessage = directQuestion || '';

    if (!userMessage) {
      const errorAudio = await synthesizeSpeech({
        text: 'Não consegui te ouvir. Pode repetir?',
        voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
        speakingRate: 1.0,
        audioEncoding: 'MP3',
      });
      
      return new Response(new Uint8Array(errorAudio), {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Used-FAQ': 'false',
        },
      });
    }

    console.log(`👂 "${userMessage}"`);

    // FAQ Matching
    const matchingFAQ = await findMatchingFAQ(supabase, companyId, userMessage);
    
    let responseText = '';
    let usedFAQ = false;

    if (matchingFAQ) {
      responseText = matchingFAQ.answer;
      usedFAQ = true;
      console.log('⚡ Usando FAQ');
      
      // Incrementar contador
      supabase
        .from('faq_entries')
        .update({ usage_count: (matchingFAQ.usage_count || 0) + 1 })
        .eq('id', matchingFAQ.id)
        .then(() => console.log('📊 +1'));

      // ✅ DESCONTAR CRÉDITOS FAQ
      await supabase.rpc('register_function_usage', {
        p_company_id: companyId,
        p_function_key: 'faq',
        p_credits_consumed: 1
      });
    } else {
      // Usar OpenAI (GPT-4o-mini)
      console.log('🤖 Usando OpenAI GPT-4o-mini');
      
      // ✅ CORREÇÃO: Verificar se deve usar prompt de orçamento
      const useOrcamentoPrompt = formData.get('useOrcamentoPrompt') === 'true';

      const systemPrompt = useOrcamentoPrompt && company.orcamento_prompt
        ? company.orcamento_prompt  // ← Usa prompt de orçamento puro
        : `${company.system_prompt || `Você é um assistente virtual da empresa ${company.name}.`}

Regras:
- Seja breve (máximo 2-3 frases)
- Use linguagem natural
- Português brasileiro
- Se não souber, seja honesto

Pergunta: ${userMessage}`;

      console.log('📋 Usando prompt:', useOrcamentoPrompt ? 'ORÇAMENTO' : 'PADRÃO');

      // ✅ ATUALIZADO: Passa conversationHistory para contexto
      responseText = await processWithGPT(userMessage, systemPrompt, conversationHistory);
      console.log(`🧠 Usando contexto de ${conversationHistory.length} mensagens`);
      
      console.log('✅ OpenAI respondeu');

      // ✅ DESCONTAR CRÉDITOS CHATGPT ou ORÇAMENTO
      const functionKey = useOrcamentoPrompt ? 'orcamento' : 'chatgpt';
      const creditsConsumed = useOrcamentoPrompt ? 2 : 2; // Ambos consomem 2
      
      await supabase.rpc('register_function_usage', {
        p_company_id: companyId,
        p_function_key: functionKey,
        p_credits_consumed: creditsConsumed
      });
    }

    // ✅ ATUALIZAR histórico da sessão
    conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: responseText }
    );

    // Manter apenas as últimas 10 mensagens (5 turnos)
    const MAX_MESSAGES = 10;
    if (conversationHistory.length > MAX_MESSAGES) {
      conversationHistory = conversationHistory.slice(-MAX_MESSAGES);
    }

    // Atualizar sessão no banco
    await supabase
      .from('assistant_sessions')
      .update({
        messages: conversationHistory,
        last_activity_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // +30min
      })
      .eq('id', currentSession.id);

    console.log(`💾 Sessão atualizada: ${conversationHistory.length} mensagens`);

    // ✅ NOVO: Retornar texto se solicitado
    if (returnText) {
      console.log('📄 Retornando texto (sem áudio)');
      
      // Salvar histórico
      let finalConversationId = conversationId || randomUUID();
      
      if (!conversationId || conversationId === 'new') {
        await supabase.from('conversations').insert({
          id: finalConversationId,
          company_id: companyId,
        });
      }

      await supabase.from('messages').insert([
        { conversation_id: finalConversationId, role: 'user', content: userMessage },
        { conversation_id: finalConversationId, role: 'assistant', content: responseText },
      ]);

      const totalTime = Date.now() - startTime;
      console.log(`⏱️ Total: ${totalTime}ms\n`);

      return NextResponse.json({
        response: responseText,
        sessionId: currentSession.id, // ✅ NOVO
        conversationId: finalConversationId,
        usedFAQ,
        processingTime: totalTime,
      }, {
        headers: {
          'X-Used-FAQ': String(usedFAQ),
        },
      });
    }

    // TTS (comportamento padrão)
    const audioBuffer = await synthesizeSpeech({
      text: responseText,
      voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
      speakingRate: 1.0,
      audioEncoding: 'MP3',
    });
    
    const audioData = new Uint8Array(audioBuffer);

    // Salvar histórico
    let finalConversationId = conversationId || randomUUID();
    
    if (!conversationId || conversationId === 'new') {
      await supabase.from('conversations').insert({
        id: finalConversationId,
        company_id: companyId,
      });
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
        'X-Session-Id': currentSession.id, // ✅ NOVO
        'X-Used-FAQ': String(usedFAQ),
        'X-Processing-Time': String(totalTime),
        'X-Transcription': encodeURIComponent(userMessage),
      },
    });
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    
    try {
      const errorAudio = await synthesizeSpeech({
        text: 'Desculpe, ocorreu um erro.',
        voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
        speakingRate: 1.0,
        audioEncoding: 'MP3',
      });
      
      return new Response(new Uint8Array(errorAudio), {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Error': 'true',
        },
      });
    } catch {
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
  }
}
