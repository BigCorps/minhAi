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

    // PARALELIZAR tudo que for possível
    const [companyResult, transcriptionResult] = await Promise.all([
      supabase.from('companies').select('id, system_prompt').eq('id', companyId).single(),
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

    const userMessage = (transcriptionResult.text || '').trim();

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
        .select('id')
        .eq('id', conversationId)
        .single();

      if (existingConv) {
        conversation = existingConv;

        // REDUZIR histórico para 5 mensagens (mais rápido)
        const { data: messages } = await supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (messages) {
          conversationHistory = messages.reverse().map(msg => ({
            role: msg.role,
            content: msg.content,
          }));
        }
      }
    }

    if (!conversation) {
      const newConversationId = randomUUID();
      conversation = { id: newConversationId };
      
      // Salvar conversa em background (não aguardar)
      supabase.from('conversations').insert({
        id: newConversationId,
        company_id: companyId,
      });
    }

    // Salvar mensagem em background
    supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: userMessage,
    });

    // Prompt otimizado para respostas CURTAS e RÁPIDAS
    const systemPrompt = company.system_prompt || 
      'Você é um assistente virtual. Responda de forma MUITO BREVE e DIRETA em português brasileiro. Máximo 2 frases.';

    const chatMessages = [
      { role: 'system', content: systemPrompt + ' IMPORTANTE: Seja MUITO conciso e direto.' },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // GPT com tokens REDUZIDOS para resposta mais rápida
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages as any,
      temperature: 0.7,
      max_tokens: 150, // MUITO REDUZIDO (era 300)
    });

    const assistantResponse = chatCompletion.choices[0]?.message?.content || 
      'Desculpe, não consegui processar.';

    // Salvar resposta em background
    supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: assistantResponse,
    });

    // TTS ultra-rápido
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1', // Modelo rápido
      voice: 'alloy',
      input: assistantResponse,
      response_format: 'mp3',
      speed: 1.1, // Levemente mais rápido
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
