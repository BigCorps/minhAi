import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Deepgram API Key
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY!;

// Funções auxiliares
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

async function transcribeWithDeepgram(audioFile: File): Promise<string> {
  const audioBuffer = await audioFile.arrayBuffer();
  
  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=pt-BR&punctuate=true&smart_format=true', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': audioFile.type || 'audio/webm',
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Deepgram error:', response.status, errorText);
    throw new Error(`Deepgram error: ${response.status}`);
  }

  const result = await response.json();
  const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
  
  console.log('🎯 Deepgram result:', {
    transcript,
    confidence: result.results?.channels[0]?.alternatives[0]?.confidence
  });
  
  return transcript;
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
    error: error?.message 
  });

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
    
    // Similaridade
    const score = similarity(questionNormalized, faqQuestionNormalized);
    console.log(`  📊 Similarity: ${(score * 100).toFixed(1)}% (threshold: 40%)`);
    
    if (score > bestScore && score > 0.40) {
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
        if (varScore > 0.40) {
          console.log(`    - "${variation}": ${(varScore * 100).toFixed(1)}%`);
        }
        
        if (varScore > bestScore && varScore > 0.40) {
          bestScore = varScore;
          bestMatch = faq;
          bestMethod = 'variation-similarity';
          console.log(`    ⭐ Nova melhor variação!`);
        }
      }
    }
    
    // Keywords
    const faqWords = faqQuestionNormalized.split(' ').filter((w: string) => w.length > 2);
    const commonWords = questionWords.filter((w: string) => faqWords.includes(w));
    const keywordScore = commonWords.length / Math.max(questionWords.length, faqWords.length);
    
    if (commonWords.length > 0) {
      console.log(`  🔤 Keywords comuns: [${commonWords.join(', ')}] = ${(keywordScore * 100).toFixed(1)}%`);
    }
    
    if (keywordScore > bestScore && keywordScore > 0.40) {
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
    console.log('❌ NENHUM MATCH (threshold mínimo: 40%)');
    console.log('🤖 Vai usar GPT');
  }

  return bestMatch;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const companyId = formData.get('companyId') as string;
    const conversationId = formData.get('conversationId') as string | null;
    const directQuestion = formData.get('directQuestion') as string | null;

    console.log('📊 Áudio:', {
      size: audioFile?.size || 0,
      type: audioFile?.type || 'unknown',
      name: audioFile?.name || 'unknown',
      directQuestion: directQuestion ? 'SIM' : 'NÃO'
    });

    if (!audioFile || !companyId) {
      return NextResponse.json(
        { error: 'Áudio e ID obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    console.log('⚡ Iniciando...', directQuestion ? '(Direct Question)' : '(Deepgram)');
    
    // FASE 1: Transcrição ou Direct Question
    const sttStart = Date.now();
    
    let userMessage = '';
    let company: any = null;
    let transcriptionError = null;
    
    if (directQuestion) {
      // Pergunta direta (veio com wake word)
      console.log('💬 Direct:', directQuestion);
      const companyResult = await supabase.from('companies').select('id, name, system_prompt').eq('id', companyId).single();
      userMessage = directQuestion;
      company = companyResult.data;
    } else {
      // Transcrição normal
      try {
        const [companyResult, transcript] = await Promise.all([
          supabase.from('companies').select('id, name, system_prompt').eq('id', companyId).single(),
          transcribeWithDeepgram(audioFile)
        ]);
        
        userMessage = transcript;
        company = companyResult.data;
      } catch (error: any) {
        transcriptionError = error;
        console.error('❌ Erro Deepgram:', error.message);
        
        // Se Deepgram falhar, tentar Whisper fallback
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

    const transcriptionTime = Date.now() - sttStart;

    if (!userMessage || !company) {
      console.log('❌ Transcrição vazia ou company não encontrada');
      
      const errorTTS = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: 'Não consegui te ouvir. Pode repetir?',
        speed: 1.15,
      });
      
      const errorBuffer = Buffer.from(await errorTTS.arrayBuffer());
      
      return new Response(errorBuffer, {
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
      console.log(`⏱️ Direct: ${transcriptionTime}ms`);
    } else {
      console.log(`⏱️ ${transcriptionError ? 'Whisper (fallback)' : 'Deepgram'}: ${transcriptionTime}ms`);
      
      if (transcriptionError) {
        console.log(`⚠️ Deepgram falhou, usando Whisper`);
      }
    }

    // FASE 2: FAQ Matching
    const faqStart = Date.now();
    const matchingFAQ = await findMatchingFAQ(supabase, companyId, userMessage);
    const faqTime = Date.now() - faqStart;
    
    console.log(`⏱️ FAQ matching: ${faqTime}ms`);

    let responseText = '';
    let usedFAQ = false;

    if (matchingFAQ) {
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
      // GPT
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
      
      conversationMessages.push({
        role: 'system',
        content: company.system_prompt || 'Você é um assistente prestativo.'
      });
      
      conversationMessages.push({
        role: 'user',
        content: userMessage
      });
      
      console.log('🤖 GPT');
      const gptStart = Date.now();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: conversationMessages,
        max_tokens: 100,
        temperature: 0.7,
        presence_penalty: 0.1,
      });
      console.log(`⏱️ GPT: ${Date.now() - gptStart}ms`);
      
      responseText = completion.choices[0]?.message?.content || 'Desculpe, não entendi.';
    }

    // FASE 3: TTS
    const ttsStart = Date.now();
    const tts = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: responseText,
      speed: 1.15,
    });
    const ttsTime = Date.now() - ttsStart;
    console.log(`⏱️ TTS: ${ttsTime}ms`);

    const audioBuffer = Buffer.from(await tts.arrayBuffer());

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
    console.log(`✅ TOTAL: ${totalTime}ms`);

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Conversation-Id': finalConversationId,
        'X-Used-FAQ': String(usedFAQ),
        'X-Processing-Time': String(totalTime),
        'X-Transcription': encodeURIComponent(userMessage),
      },
    });
  } catch (error: any) {
    console.error('❌ Erro:', error.message, error.stack);
    
    // TTS de erro
    try {
      const errorTTS = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: 'Desculpe, ocorreu um erro. Tente novamente.',
        speed: 1.15,
      });
      
      const errorBuffer = Buffer.from(await errorTTS.arrayBuffer());
      
      return new Response(errorBuffer, {
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
