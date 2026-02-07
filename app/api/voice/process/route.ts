import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';
import { randomUUID } from 'crypto';

// ✅ Usar Gemini com API Key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

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
      .select('id, name, system_prompt, greeting_message, welcome_message')
      .eq('id', companyId)
      .single();

    if (!company) {
      throw new Error('Company not found');
    }

    const userMessage = directQuestion || '';

    if (!userMessage) {
      const errorAudio = await synthesizeSpeech({
        text: 'Não consegui te ouvir. Pode repetir?',
        voiceName: BRAZILIAN_VOICES.FEMALE_A,
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
    } else {
      // Usar Gemini
      console.log('🤖 Usando Gemini');
      
      // ✅ gemini-1.5-flash - versão estável mais recente
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
      }, { apiVersion: 'v1beta' });
      
      const prompt = `${company.system_prompt || `Você é um assistente virtual da empresa ${company.name}.`}

Regras:
- Seja breve (máximo 2-3 frases)
- Use linguagem natural
- Português brasileiro
- Se não souber, seja honesto

Pergunta: ${userMessage}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      responseText = response.text() || 'Desculpe, não consegui processar.';
      
      console.log('✅ Gemini respondeu');
    }

    // TTS
    const audioBuffer = await synthesizeSpeech({
      text: responseText,
      voiceName: BRAZILIAN_VOICES.FEMALE_A,
      speakingRate: 1.0,
      audioEncoding: 'MP3',
    });
    
    const audioData = new Uint8Array(audioBuffer);

    // Salvar histórico
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
    console.log(`⏱️ Total: ${totalTime}ms\n`);

    return new Response(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Conversation-Id': finalConversationId,
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
    } catch {
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
  }
}
