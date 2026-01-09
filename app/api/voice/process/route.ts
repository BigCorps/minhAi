import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
    console.log('⚡ Fase 1: Iniciando transcrição + busca');
    const [companyResult, transcriptionResult] = await Promise.all([
      supabase.from('companies').select('id, system_prompt').eq('id', companyId).single(),
      openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt',
        temperature: 0.0,
      })
    ]);
    console.log(`✅ Fase 1 completa: ${Date.now() - startTime}ms`);

    const { data: company, error: companyError } = companyResult;
    
    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const userMessage = (transcriptionResult.text || '').trim();

    if (!userMessage) {
      return NextResponse.json(
        { error: 'Não foi possível entender o áudio' },
        { status: 400 }
      );
    }

    // FASE 2: Buscar/criar conversa + histórico
    console.log('⚡ Fase 2: Conversa + histórico');
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

        // Apenas últimas 3 mensagens (mais rápido)
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
      
      // Background - não aguardar
      supabase.from('conversations').insert({
        id: newConversationId,
        company_id: companyId,
      });
    }

    // Background - salvar mensagem usuário
    supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: userMessage,
    });

    console.log(`✅ Fase 2 completa: ${Date.now() - startTime}ms`);

    // FASE 3: Gerar resposta GPT
    console.log('⚡ Fase 3: GPT');
    const systemPrompt = company.system_prompt || 
      'Você é um assistente virtual. Seja MUITO breve e direto. Máximo 2 frases curtas.';

    const chatMessages = [
      { role: 'system', content: systemPrompt + ' Responda em no máximo 2 frases.' },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages as any,
      temperature: 0.7,
      max_tokens: 120, // MUITO CURTO
    });

    const assistantResponse = chatCompletion.choices[0]?.message?.content || 
      'Desculpe, não entendi.';

    console.log(`✅ Fase 3 completa: ${Date.now() - startTime}ms`);

    // Background - salvar resposta
    supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: assistantResponse,
    });

    // FASE 4: TTS (VOZ SEMPRE ALLOY)
    console.log('⚡ Fase 4: TTS');
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // VOZ FIXA
      input: assistantResponse,
      response_format: 'mp3',
      speed: 1.1,
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    console.log(`✅ Total: ${Date.now() - startTime}ms`);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Transcription': encodeURIComponent(userMessage),
        'X-Response-Text': encodeURIComponent(assistantResponse),
        'X-Conversation-Id': conversation.id,
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
