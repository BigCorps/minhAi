import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { transcribeAudio, DEFAULT_HINTS } from '@/lib/google-speech-streaming';
import { generateAssistantResponse } from '@/lib/gemini';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
  console.log('=== FAQ MATCHING DEBUG ===');
  console.log('🏢 Company ID:', companyId);
  console.log('❓ Pergunta:', question);
  
  const { data: faqs, error } = await supabase
    .from('faq_entries')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true);

  console.log('📊 FAQs query result:', { 
    count: faqs?.length || 0, 
    error: error?.message,
    errorDetails: error ? JSON.stringify(error) : null
  });

  if (error) {
    console.error('❌ ERRO AO BUSCAR FAQs:', error);
  }

  if (!faqs || faqs.length === 0) {
    console.log('❌ SEM FAQs cadastradas!');
    return null;
  }

  console.log('📋 FAQs disponíveis:');
  faqs.forEach((faq: any, i: number) => {
    console.log(`  ${i+1}. "${faq.question}"`);
  });

  const questionNormalized = normalizeText(question);
  const questionWords = questionNormalized.split(' ').filter((w: string) => w.length > 2);
  
  console.log('🔤 Pergunta normalizada:', questionNormalized);
  console.log('🔤 Palavras:', questionWords);
  
  let bestMatch: any = null;
  let bestScore = 0;
  let bestMethod = '';

  for (const faq of faqs) {
    const faqQuestionNormalized = normalizeText(faq.question);
    console.log(`\n🔍 Testando FAQ: "${faq.question}"`);
    
    // Match exato
    if (questionNormalized === faqQuestionNormalized) {
      console.log(`  ✅ EXACT MATCH!`);
      bestScore = 1.0;
      bestMatch = faq;
      bestMethod = 'exact-match';
      break;
    }
    
    // Similaridade - threshold 85%
    const score = similarity(questionNormalized, faqQuestionNormalized);
    console.log(`  📊 Similarity: ${(score * 100).toFixed(1)}% (threshold: 85%)`);
    
    if (score > bestScore && score > 0.85) {
      bestScore = score;
      bestMatch = faq;
      bestMethod = 'similarity';
      console.log(`  ⭐ Melhor até agora!`);
    }
    
    // Variações
    if (faq.variations && Array.isArray(faq.variations)) {
      console.log(`  🔄 Testando ${faq.variations.length} variações...`);
      
      for (const variation of faq.variations) {
        const variationNormalized = normalizeText(variation);
        
        if (questionNormalized === variationNormalized) {
          console.log(`  ✅ VARIATION EXACT MATCH: "${variation}"`);
          bestScore = 1.0;
          bestMatch = faq;
          bestMethod = 'variation-exact';
          break;
        }
        
        const varScore = similarity(questionNormalized, variationNormalized);
        if (varScore > 0.85) {
          console.log(`    - "${variation}": ${(varScore * 100).toFixed(1)}%`);
        }
        
        if (varScore > bestScore && varScore > 0.85) {
          bestScore = varScore;
          bestMatch = faq;
          bestMethod = 'variation-similarity';
          console.log(`    ⭐ Nova melhor variação!`);
        }
      }
    }
    
    // Keywords - threshold 70%
    const faqWords = faqQuestionNormalized.split(' ').filter((w: string) => w.length > 2);
    const commonWords = questionWords.filter((w: string) => faqWords.includes(w));
    const keywordScore = commonWords.length / Math.max(questionWords.length, faqWords.length);
    
    if (commonWords.length > 0) {
      console.log(`  🔤 Keywords comuns: [${commonWords.join(', ')}] = ${(keywordScore * 100).toFixed(1)}%`);
    }
    
    if (keywordScore > bestScore && keywordScore > 0.70) {
      bestScore = keywordScore;
      bestMatch = faq;
      bestMethod = 'keywords';
      console.log(`  ⭐ Melhor por keywords!`);
    }
  }

  if (bestMatch) {
    console.log(`✅ MATCH ENCONTRADO!`);
    console.log(`   Pergunta FAQ: "${bestMatch.question}"`);
    console.log(`   Score: ${(bestScore * 100).toFixed(1)}%`);
    console.log(`   Método: ${bestMethod}`);
  } else {
    console.log('❌ NENHUM MATCH (threshold: 85% similarity, 70% keywords)');
    console.log('🤖 Vai usar Gemini');
  }

  return bestMatch;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let sttTime = 0;
  let faqTime = 0;
  let llmTime = 0;
  let ttsTime = 0;
  
  console.log('\n=== 🎯 NOVA REQUISIÇÃO ===');
  console.log(`⏰ Start: ${new Date().toISOString()}`);
  
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const companyId = formData.get('companyId') as string;
    const conversationId = formData.get('conversationId') as string | null;
    const directQuestion = formData.get('directQuestion') as string | null;
    const checkEndOnly = formData.get('checkEndOnly') as string | null;

    console.log('📊 Áudio:', {
      size: audioFile?.size || 0,
      type: audioFile?.type || 'unknown',
      name: audioFile?.name || 'unknown',
      directQuestion: directQuestion ? 'SIM' : 'NÃO',
      checkEndOnly: checkEndOnly ? 'SIM' : 'NÃO'
    });

    if (!audioFile || !companyId) {
      return NextResponse.json(
        { error: 'Áudio e ID obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    console.log('⚡ Iniciando...', directQuestion ? '(Direct Question)' : '(Google STT)');
    
    // FASE 1: Transcrição ou Direct Question
    const sttStart = Date.now();
    
    let userMessage = '';
    let company: any = null;
    let transcriptionError = null;
    
    if (directQuestion) {
      // Pergunta direta (veio com wake word)
      console.log('💬 Direct:', directQuestion);
      const companyResult = await supabase.from('companies').select('id, name, system_prompt, greeting_message, welcome_message').eq('id', companyId).single();
      userMessage = directQuestion;
      company = companyResult.data;
    } else {
      // Transcrição com Google Speech-to-Text
      try {
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Detectar encoding do áudio
        let encoding: 'LINEAR16' | 'WEBM_OPUS' = 'LINEAR16';
        if (audioFile.type.includes('webm')) {
          encoding = 'WEBM_OPUS';
        }
        
        const [companyResult, transcript] = await Promise.all([
          supabase.from('companies').select('id, name, system_prompt').eq('id', companyId).single(),
          transcribeAudio(buffer, {
            encoding,
            sampleRateHertz: 16000,
            languageCode: 'pt-BR',
            hints: DEFAULT_HINTS,
            model: 'command_and_search',
          })
        ]);
        
        userMessage = transcript;
        company = companyResult.data;
      } catch (error: any) {
        transcriptionError = error;
        console.error('❌ Erro Google STT:', error.message);
        
        // Fallback para Whisper
        console.log('🔄 Fallback para Whisper...');
        
        const [companyResult, whisperResult] = await Promise.all([
          supabase.from('companies').select('id, name, system_prompt').eq('id', companyId).single(),
          openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'pt',
            temperature: 0.0,
          })
        ]);
        
        userMessage = whisperResult.text || '';
        company = companyResult.data;
      }
    }

    sttTime = Date.now() - sttStart;

    if (!userMessage || !company) {
      console.log('❌ Transcrição vazia ou company não encontrada');
      
      const errorAudio = await synthesizeSpeech({
        text: 'Não consegui te ouvir. Pode repetir?',
        voiceName: BRAZILIAN_VOICES.FEMALE_A,
        speakingRate: 1.0,
        audioEncoding: 'MP3',
      });
      
      return new Response(new Uint8Array(errorAudio), {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Transcription': encodeURIComponent('[vazio]'),
          'X-Used-FAQ': 'false',
          'X-Processing-Time': String(Date.now() - startTime),
        },
      });
    }

    console.log(`👂 "${userMessage}"`);
    console.log(`📏 Tamanho: ${userMessage.length} caracteres`);
    console.log(`🔤 Normalizado: "${normalizeText(userMessage)}"`);
    
    if (directQuestion) {
      console.log(`⏱️ Direct: ${sttTime}ms`);
    } else {
      console.log(`⏱️ ${transcriptionError ? 'Whisper (fallback)' : 'Google STT'}: ${sttTime}ms`);
      
      if (transcriptionError) {
        console.log(`⚠️ Google STT falhou, usando Whisper`);
      }
    }

    // Se for checkEndOnly, retornar só transcrição (sem FAQ/LLM/TTS)
    if (checkEndOnly) {
      console.log('✅ Check-only mode: retornando só transcrição');
      
      // Criar áudio vazio
      const silentBuffer = Buffer.from([]);
      
      return new Response(silentBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Transcription': encodeURIComponent(userMessage),
          'X-Processing-Time': `${Date.now() - startTime}`,
        },
      });
    }

    // FASE 2: FAQ Matching
    const faqStart = Date.now();
    const matchingFAQ = await findMatchingFAQ(supabase, companyId, userMessage);
    faqTime = Date.now() - faqStart;
    console.log(`⏱️ FAQ matching: ${faqTime}ms`);
    console.log(`📊 FAQ result:`, matchingFAQ ? `FOUND: "${matchingFAQ.question}"` : 'NOT FOUND');
    
    let responseText = '';
    let usedFAQ = false;

    if (matchingFAQ) {
      // Usar resposta do FAQ
      responseText = matchingFAQ.answer;
      usedFAQ = true;
      console.log('⚡ FAQ');
      
      // Incrementar contador (não bloqueia)
      supabase
        .from('faq_entries')
        .update({ usage_count: (matchingFAQ.usage_count || 0) + 1 })
        .eq('id', matchingFAQ.id)
        .then(() => console.log('📊 +1 contador'));
    } else {
      // Usar Gemini
      const conversationMessages: any[] = [];
      
      if (conversationId && conversationId !== 'new') {
        const { data: history } = await supabase
          .from('conversation_messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(10);
        
        if (history && history.length > 0) {
          conversationMessages.push(...history);
        }
      }
      
      console.log('🤖 Gemini');
      const llmStart = Date.now();
      
      // Preparar contexto para o Gemini
      const context = {
        companyName: company.name,
        systemPrompt: company.system_prompt ?? undefined,
        greetingMessage: company.greeting_message ?? undefined,
        conversationHistory: conversationMessages.length > 0 ? conversationMessages : undefined,
      };
      
      responseText = await generateAssistantResponse(userMessage, context);
      llmTime = Date.now() - llmStart;
      console.log(`⏱️ Gemini: ${llmTime}ms`);
    }

    // FASE 3: TTS com Google Text-to-Speech
    const ttsStart = Date.now();
    const audioBuffer = await synthesizeSpeech({
      text: responseText,
      voiceName: BRAZILIAN_VOICES.FEMALE_A,
      speakingRate: 1.0,
      audioEncoding: 'MP3',
    });
    ttsTime = Date.now() - ttsStart;
    console.log(`⏱️ Google TTS: ${ttsTime}ms`);
    
    // Converter Buffer para Uint8Array (compatível com NextResponse)
    const audioData = new Uint8Array(audioBuffer);

    // FASE 4: Salvar histórico (não bloqueia response)
    let finalConversationId = conversationId || randomUUID();
    
    if (!conversationId || conversationId === 'new') {
      supabase.from('conversations').insert({
        id: finalConversationId,
        company_id: companyId,
      }).then(() => {
        supabase.from('conversation_messages').insert([
          { conversation_id: finalConversationId, role: 'user', content: userMessage },
          { conversation_id: finalConversationId, role: 'assistant', content: responseText },
        ]);
      });
    } else {
      supabase.from('conversation_messages').insert([
        { conversation_id: finalConversationId, role: 'user', content: userMessage },
        { conversation_id: finalConversationId, role: 'assistant', content: responseText },
      ]);
    }

    const totalTime = Date.now() - startTime;

    console.log('\n=== ⏱️ RESUMO DE TEMPOS ===');
    console.log(`STT: ${sttTime}ms`);
    console.log(`FAQ: ${faqTime}ms`);
    console.log(`LLM: ${llmTime}ms`);
    console.log(`TTS: ${ttsTime}ms`);
    console.log(`TOTAL: ${totalTime}ms`);
    console.log('========================\n');

    return new Response(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Conversation-Id': finalConversationId,
        'X-Used-FAQ': String(usedFAQ),
        'X-Processing-Time': String(totalTime),
        'X-Transcription': encodeURIComponent(userMessage),
        'X-Service': 'google-stack',
      },
    });
  } catch (error: any) {
    console.error('❌ Erro:', error.message, error.stack);
    
    // TTS de erro com Google
    try {
      const errorAudio = await synthesizeSpeech({
        text: 'Desculpe, ocorreu um erro. Tente novamente.',
        voiceName: BRAZILIAN_VOICES.FEMALE_A,
        speakingRate: 1.0,
        audioEncoding: 'MP3',
      });
      
      return new Response(new Uint8Array(errorAudio), {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Error': 'true',
        },
      });
    } catch (ttsError) {
      return NextResponse.json(
        { error: 'Erro interno' },
        { status: 500 }
      );
    }
  }
}