import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Função para calcular similaridade entre strings (Levenshtein simples)
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

// Buscar FAQ que corresponde à pergunta
async function findMatchingFAQ(supabase: any, companyId: string, question: string) {
  const { data: faqs } = await supabase
    .from('faq_entries')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (!faqs || faqs.length === 0) return null;

  const questionLower = question.toLowerCase();
  let bestMatch: any = null;
  let bestScore = 0;

  for (const faq of faqs) {
    // Verificar pergunta principal
    let score = similarity(questionLower, faq.question.toLowerCase());
    
    // Verificar variações
    for (const variation of faq.variations || []) {
      const varScore = similarity(questionLower, variation.toLowerCase());
      if (varScore > score) score = varScore;
    }
    
    // Verificar se contém palavras-chave
    const faqWords = faq.question.toLowerCase().split(' ');
    const questionWords = questionLower.split(' ');
    const commonWords = faqWords.filter((word: string) => 
      word.length > 3 && questionWords.includes(word)
    );
    
    if (commonWords.length > 0) {
      score += (commonWords.length * 0.1);
    }

    if (score > bestScore && score > 0.6) { // Threshold de 60%
      bestScore = score;
      bestMatch = faq;
    }
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

    // FASE 1: Transcrição + Busca empresa (PARALELO)
    console.log('⚡ Transcrevendo...');
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

    console.log(`✅ Transcrição: "${userMessage}" (${Date.now() - startTime}ms)`);

    // FASE 2: Buscar FAQ correspondente
    console.log('🔍 Buscando FAQ...');
    const matchedFAQ = await findMatchingFAQ(supabase, companyId, userMessage);

    let assistantResponse: string;
    let usedFAQ = false;

    if (matchedFAQ) {
      // FAQ ENCONTRADA - Resposta instantânea!
      console.log(`✅ FAQ encontrada: "${matchedFAQ.question}"`);
      assistantResponse = matchedFAQ.answer;
      usedFAQ = true;

      // Atualizar contador de uso (background)
      supabase
        .from('faq_entries')
        .update({
          usage_count: matchedFAQ.usage_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', matchedFAQ.id);
    } else {
      // FAQ NÃO ENCONTRADA - Usar OpenAI
      console.log('🤖 Usando OpenAI...');
      
      // Buscar conversa e histórico
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

      // Salvar mensagem usuário (background)
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

      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: chatMessages as any,
        temperature: 0.7,
        max_tokens: 120,
      });

      assistantResponse = chatCompletion.choices[0]?.message?.content || 
        'Desculpe, não entendi.';

      // Salvar resposta (background)
      supabase.from('messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantResponse,
      });
    }

    console.log(`✅ Resposta gerada (${Date.now() - startTime}ms)`);

    // FASE 3: TTS (VOZ SEMPRE ALLOY)
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: assistantResponse,
      response_format: 'mp3',
      speed: 1.1,
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    console.log(`✅ TOTAL: ${Date.now() - startTime}ms ${usedFAQ ? '(FAQ)' : '(GPT)'}`);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Transcription': encodeURIComponent(userMessage),
        'X-Response-Text': encodeURIComponent(assistantResponse),
        'X-Conversation-Id': conversationId || 'new',
        'X-Used-FAQ': usedFAQ ? 'true' : 'false',
      },
    });
  } catch (error: any) {
    console.error('❌ Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar áudio', details: error.message },
      { status: 500 }
    );
  }
}
