import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
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

    // PARALELIZAR busca de empresa e transcrição
    const [companyResult, transcriptionResult] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt',
        temperature: 0.0,
      })
    ]);

    const { data: company, error: companyError } = companyResult;
    
    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const userMessage = transcriptionResult.trim();

    if (!userMessage) {
      return NextResponse.json(
        { error: 'Não foi possível entender o áudio' },
        { status: 400 }
      );
    }

    let conversation;
    let conversationHistory: any[] = [];

    if (conversationId) {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (existingConv) {
        conversation = existingConv;

        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(10); // LIMITAR histórico para resposta mais rápida

        if (messages) {
          conversationHistory = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          }));
        }
      }
    }

    if (!conversation) {
      const newConversationId = randomUUID();
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          id: newConversationId,
          company_id: companyId,
        })
        .select()
        .single();

      conversation = newConv;
    }

    // Salvar mensagem do usuário (não await - deixar em background)
    supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: userMessage,
    });

    const systemPrompt = company.system_prompt || 
      'Você é um assistente virtual. Responda de forma clara e concisa em português brasileiro.';

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // PARALELIZAR GPT e salvamento da mensagem do usuário
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages as any,
      temperature: 0.7,
      max_tokens: 300, // REDUZIDO de 500 para resposta mais rápida
    });

    const assistantResponse = chatCompletion.choices[0]?.message?.content || 
      'Desculpe, não consegui processar sua solicitação.';

    // Salvar resposta (não await)
    supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: assistantResponse,
    });

    // TTS MAIS RÁPIDO - voz alloy (mais estável que nova)
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1', // Modelo rápido (não HD)
      voice: 'alloy', // VOZ CONSISTENTE (nova tem bugs)
      input: assistantResponse,
      response_format: 'mp3',
      speed: 1.05, // Levemente mais rápido
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    const response = new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Transcription': encodeURIComponent(userMessage),
        'X-Response-Text': encodeURIComponent(assistantResponse),
        'X-Conversation-Id': conversation.id,
      },
    });

    return response;
  } catch (error: any) {
    console.error('Erro no processamento:', error);
    return NextResponse.json(
      { error: 'Erro ao processar áudio', details: error.message },
      { status: 500 }
    );
  }
}
