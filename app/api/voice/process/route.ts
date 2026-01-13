import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Função melhorada de similaridade
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

// Normalizar texto (remover acentos, pontuação)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .trim();
}

// Buscar FAQ com matching melhorado
async function findMatchingFAQ(supabase: any, companyId: string, question: string) {
  const { data: faqs } = await supabase
    .from('faq_entries')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (!faqs || faqs.length === 0) {
    console.log('📭 Nenhuma FAQ cadastrada');
    return null;
  }

  console.log(`🔍 Buscando em ${faqs.length} FAQs...`);

  const questionNormalized = normalizeText(question);
  const questionWords = questionNormalized.split(' ').filter(w => w.length > 2);
  
  let bestMatch: any = null;
  let bestScore = 0;
  let bestMethod = '';

  for (const faq of faqs) {
    let score = 0;
    let method = '';
    
    // MÉTODO 1: Similaridade exata com pergunta principal
    const mainSimilarity = similarity(questionNormalized, normalizeText(faq.question));
    if (mainSimilarity > score) {
      score = mainSimilarity;
      method = `main_question (${(mainSimilarity * 100).toFixed(0)}%)`;
    }
    
    // MÉTODO 2: Similaridade com variações
    for (const variation of faq.variations || []) {
      const varSimilarity = similarity(questionNormalized, normalizeText(variation));
      if (varSimilarity > score) {
        score = varSimilarity;
        method = `variation "${variation}" (${(varSimilarity * 100).toFixed(0)}%)`;
      }
    }
    
    // MÉTODO 3: Palavras-chave em comum
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
        method = `keywords [${commonWords.join(', ')}] (${(keywordScore * 100).toFixed(0)}%)`;
      }
    }
    
    // MÉTODO 4: Contém frase inteira
    if (questionNormalized.includes(normalizeText(faq.question)) || 
        normalizeText(faq.question).includes(questionNormalized)) {
      const containsScore = 0.9;
      if (containsScore > score) {
        score = containsScore;
        method = 'contains_phrase (90%)';
      }
    }
    
    // MÉTODO 5: Variações contém a pergunta
    for (const variation of faq.variations || []) {
      const varNormalized = normalizeText(variation);
      if (questionNormalized.includes(varNormalized) || varNormalized.includes(questionNormalized)) {
        const containsScore = 0.85;
        if (containsScore > score) {
          score = containsScore;
          method = `contains_variation "${variation}" (85%)`;
        }
      }
    }

    if (score > bestScore && score > 0.45) { // Threshold 45%
      bestScore = score;
      bestMatch = faq;
      bestMethod = method;
    }
  }

  if (bestMatch) {
    console.log(`✅ FAQ encontrada: "${bestMatch.question}"`);
    console.log(`   Método: ${bestMethod}`);
    console.log(`   Score: ${(bestScore * 100).toFixed(1)}%`);
  } else {
    console.log('❌ Nenhuma FAQ correspondente encontrada');
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

    if (!audioFile || !companyId) {
      return NextResponse.json(
        { error: 'Áudio e ID da empresa são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    console.log('⚡ Iniciando processamento...');
    
    // FASE 1: Transcrição + Busca empresa (PARALELO)
    const [companyResult, transcriptionResult] = await Promise.all([
      supabase.from('companies').select('id, name, system_prompt').eq('id', companyId).single(),
      openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt',
        temperature: 0.0,
      })
    ]);

    const { data: company } = companyResult;
    const userMessage = (transcriptionResult.text || '').trim();

    if (!userMessage || !company) {
      return NextResponse.json({ error: 'Erro no processamento' }, { status: 400 });
    }

    console.log(`👂 Pergunta: "${userMessage}"`);
    console.log(`⏱️  Transcrição: ${Date.now() - startTime}ms`);

    // FASE 2: Buscar FAQ correspondente
    const faqStartTime = Date.now();
    const matchedFAQ = await findMatchingFAQ(supabase, companyId, userMessage);
    console.log(`⏱️  Busca FAQ: ${Date.now() - faqStartTime}ms`);

    let assistantResponse: string;
    let usedFAQ = false;

    if (matchedFAQ) {
      // FAQ ENCONTRADA - Resposta instantânea!
      assistantResponse = matchedFAQ.answer;
      usedFAQ = true;

      // Atualizar contador (background)
      supabase
        .from('faq_entries')
        .update({
          usage_count: matchedFAQ.usage_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', matchedFAQ.id)
        .then(() => console.log('📊 Contador FAQ atualizado'));
    } else {
      // FAQ NÃO ENCONTRADA - Usar OpenAI
      console.log('🤖 Usando OpenAI...');
      
      let conversation;
      let conversationHistory: any[] = [];

      if (conversationId) {
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', conversationId)
          .single();

        if (existingConv) {
          conversation = existingConv;

          const { data: messages } = await supabase
            .from('messages')
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(3);

          if (messages) {
            conversationHistory = messages.reverse();
          }
        }
      }

      if (!conversation) {
        const newConversationId = randomUUID();
        conversation = { id: newConversationId };
        
        supabase.from('conversations').insert({
          id: newConversationId,
          company_id: companyId,
        });
      }

      // Salvar mensagem (background)
      supabase.from('messages').insert({
        conversation_id: conversation.id,
        role: 'user',
        content: userMessage,
      });

      const systemPrompt = company.system_prompt || 
        `Você é o assistente virtual da ${company.name}. Seja profissional, educado e direto. Responda em no máximo 2 frases curtas.`;

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
        max_tokens: 120,
      });
      console.log(`⏱️  GPT: ${Date.now() - gptStartTime}ms`);

      assistantResponse = chatCompletion.choices[0]?.message?.content || 
        'Desculpe, não entendi.';

      // Salvar resposta (background)
      supabase.from('messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantResponse,
      });
    }

    console.log(`💬 Resposta: "${assistantResponse.substring(0, 50)}..."`);

    // FASE 3: TTS
    const ttsStartTime = Date.now();
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: assistantResponse,
      response_format: 'mp3',
      speed: 1.1,
    });
    console.log(`⏱️  TTS: ${Date.now() - ttsStartTime}ms`);

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ TOTAL: ${totalTime}ms ${usedFAQ ? '(⚡ FAQ)' : '(🤖 GPT)'}`);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Transcription': encodeURIComponent(userMessage),
        'X-Response-Text': encodeURIComponent(assistantResponse),
        'X-Conversation-Id': conversationId || 'new',
        'X-Used-FAQ': usedFAQ ? 'true' : 'false',
        'X-Processing-Time': totalTime.toString(),
      },
    });
  } catch (error: any) {
    console.error('❌ ERRO:', error);
    return NextResponse.json(
      { error: 'Erro ao processar áudio', details: error.message },
      { status: 500 }
    );
  }
}
