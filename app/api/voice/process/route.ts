import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Funções de similaridade...
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
  const questionWords = questionNormalized.split(' ').filter(w => w.length > 2);
  
  console.log('🔤 Pergunta normalizada:', questionNormalized);
  console.log('🔤 Palavras:', questionWords);
  
  let bestMatch: any = null;
  let bestScore = 0;
  let bestMethod = '';

  for (const faq of faqs) {
    let score = 0;
    let method = '';
    
    const mainSimilarity = similarity(questionNormalized, normalizeText(faq.question));
    if (mainSimilarity > score) {
      score = mainSimilarity;
      method = `main(${(mainSimilarity * 100).toFixed(0)}%)`;
    }
    
    for (const variation of faq.variations || []) {
      const varSimilarity = similarity(questionNormalized, normalizeText(variation));
      if (varSimilarity > score) {
        score = varSimilarity;
        method = `var(${(varSimilarity * 100).toFixed(0)}%)`;
      }
    }
    
    const faqWords = normalizeText(faq.question).split(' ').filter(w => w.length > 2);
    const commonWords = questionWords.filter(word => 
      faqWords.some(faqWord => 
        faqWord.includes(word) || word.includes(faqWord)
      )
    );
    
    if (commonWords.length > 0) {
      const keywordScore = (commonWords.length / Math.max(questionWords.length, faqWords.length)) * 0.8;
      if (keywordScore > score) {
        score = keywordScore;
        method = `key(${(keywordScore * 100).toFixed(0)}%)`;
      }
    }
    
    if (questionNormalized.includes(normalizeText(faq.question)) || 
        normalizeText(faq.question).includes(questionNormalized)) {
      const containsScore = 0.9;
      if (containsScore > score) {
        score = containsScore;
        method = 'contains(90%)';
      }
    }
    
    for (const variation of faq.variations || []) {
      const varNormalized = normalizeText(variation);
      if (questionNormalized.includes(varNormalized) || varNormalized.includes(questionNormalized)) {
        const containsScore = 0.85;
        if (containsScore > score) {
          score = containsScore;
          method = 'contains-var(85%)';
        }
      }
    }

    if (score > bestScore && score > 0.45) {
      bestScore = score;
      bestMatch = faq;
      bestMethod = method;
    }
  }

  if (bestMatch) {
    console.log(`✅ MATCH ENCONTRADO!`);
    console.log(`   Pergunta FAQ: "${bestMatch.question}"`);
    console.log(`   Score: ${(bestScore * 100).toFixed(1)}%`);
    console.log(`   Método: ${bestMethod}`);
  } else {
    console.log('❌ NENHUM MATCH (threshold mínimo: 45%)');
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

    console.log('📊 Áudio:', {
      size: audioFile?.size || 0,
      type: audioFile?.type || 'unknown',
      name: audioFile?.name || 'unknown'
    });

    if (!audioFile || !companyId) {
      return NextResponse.json(
        { error: 'Áudio e ID obrigatórios' },
        { status: 400 }
      );
    }

    // CRÍTICO: Rejeitar áudio muito pequeno (corrompido/vazio)
    if (audioFile.size < 3000) {
      console.log('❌ Áudio muito pequeno:', audioFile.size, 'bytes');
      
      // Gerar áudio de erro
      const errorTTS = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: 'Não consegui te ouvir. Pode repetir mais alto?',
        speed: 1.15,
      });
      
      const errorBuffer = Buffer.from(await errorTTS.arrayBuffer());
      
      return new Response(errorBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Transcription': encodeURIComponent('[áudio inválido]'),
          'X-Used-FAQ': 'false',
          'X-Processing-Time': String(Date.now() - startTime),
        },
      });
    }

    const supabase = createClient();

    console.log('⚡ Iniciando...');
    
    // FASE 1: Transcrição TURBO + Company (PARALELO)
    const [companyResult, transcriptionResult] = await Promise.all([
      supabase.from('companies').select('id, name, system_prompt').eq('id', companyId).single(),
      openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1', // NOTA: whisper-turbo ainda não disponível, mas quando sair trocar aqui
        language: 'pt',
        temperature: 0.0,
        prompt: 'Transcrição em português brasileiro. FAQ, horário, preço, localização.', // Context hint
      })
    ]);

    const { data: company } = companyResult;
    const userMessage = (transcriptionResult.text || '').trim();

    if (!userMessage || !company) {
      return NextResponse.json({ error: 'Erro processamento' }, { status: 400 });
    }

    console.log(`👂 "${userMessage}"`);
    console.log(`⏱️ Whisper: ${Date.now() - startTime}ms`);

    // FASE 2: Conversation
    let conversation: any;
    
    if (conversationId) {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .single();

      conversation = existingConv;
    }

    if (!conversation) {
      const newConversationId = randomUUID();
      conversation = { id: newConversationId };
      
      await supabase.from('conversations').insert({
        id: newConversationId,
        company_id: companyId,
      });
    }

    // FASE 3: Salvar user message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: userMessage,
    });

    // FASE 4: FAQ search
    const faqStartTime = Date.now();
    const matchedFAQ = await findMatchingFAQ(supabase, companyId, userMessage);
    console.log(`⏱️ FAQ: ${Date.now() - faqStartTime}ms`);

    let assistantResponse: string;
    let usedFAQ = false;

    if (matchedFAQ) {
      // FAQ
      assistantResponse = matchedFAQ.answer;
      usedFAQ = true;
      console.log('⚡ FAQ!');

      supabase
        .from('faq_entries')
        .update({
          usage_count: matchedFAQ.usage_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', matchedFAQ.id)
        .then(() => console.log('📊 +1'));
        
    } else {
      // GPT
      console.log('🤖 GPT...');
      
      let conversationHistory: any[] = [];
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (messages) {
        conversationHistory = messages.reverse();
      }

      const systemPrompt = company.system_prompt || 
        `Você é assistente da ${company.name}. Seja direto, máximo 2 frases.`;

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ];

      const gptStartTime = Date.now();
      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: chatMessages as any,
        temperature: 0.7,
        max_tokens: 100, // Reduzido de 120 para 100
        presence_penalty: 0.1, // Evita repetição
      });
      console.log(`⏱️ GPT: ${Date.now() - gptStartTime}ms`);

      assistantResponse = chatCompletion.choices[0]?.message?.content || 
        'Desculpe, não entendi.';
    }

    // FASE 5: Salvar assistant response
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: assistantResponse,
    });

    // FASE 6: TTS
    const ttsStartTime = Date.now();
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1', // Se quiser mais rápido: tts-1-hd é melhor qualidade mas mais lento
      voice: 'alloy',
      input: assistantResponse,
      response_format: 'mp3',
      speed: 1.15, // Aumentado de 1.1 para 1.15 (5% mais rápido)
    });
    console.log(`⏱️ TTS: ${Date.now() - ttsStartTime}ms`);

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ ${totalTime}ms ${usedFAQ ? '⚡' : '🤖'}`);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Transcription': encodeURIComponent(userMessage),
        'X-Response-Text': encodeURIComponent(assistantResponse),
        'X-Conversation-Id': conversation.id,
        'X-Used-FAQ': usedFAQ ? 'true' : 'false',
        'X-Processing-Time': totalTime.toString(),
        'Cache-Control': 'no-cache', // Não cachear para ter tempos reais
      },
    });
  } catch (error: any) {
    console.error('❌', error.message);
    return NextResponse.json(
      { error: 'Erro processar', details: error.message },
      { status: 500 }
    );
  }
}