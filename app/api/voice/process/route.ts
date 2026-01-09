import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

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

    // Buscar empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // TRANSCRIÇÃO COM QUALIDADE MÁXIMA
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pt', // Forçar português
      prompt: 'Transcrever com precisão em português brasileiro.', // Melhor contexto
      response_format: 'text',
      temperature: 0.0, // Máxima precisão (sem criatividade)
    });

    const userMessage = transcription.trim();

    if (!userMessage) {
      return NextResponse.json(
        { error: 'Não foi possível entender o áudio' },
        { status: 400 }
      );
    }

    // Buscar ou criar conversa
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
          .order('created_at', { ascending: true });

        if (messages) {
          conversationHistory = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          }));
        }
      }
    }

    if (!conversation) {
      const newConversationId = uuidv4();
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          id: newConversationId,
          company_id: companyId,
        })
        .select()
        .single();

      if (convError) {
        console.error('Erro ao criar conversa:', convError);
        return NextResponse.json(
          { error: 'Erro ao criar conversa' },
          { status: 500 }
        );
      }

      conversation = newConv;
    }

    // Salvar mensagem do usuário
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: userMessage,
    });

    // GERAR RESPOSTA COM MELHOR CONTEXTO
    const systemPrompt = company.system_prompt || 
      'Você é um assistente virtual prestativo e educado. Responda de forma clara, concisa e natural em português brasileiro.';

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages as any,
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantResponse = chatCompletion.choices[0]?.message?.content || 
      'Desculpe, não consegui processar sua solicitação.';

    // Salvar resposta
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: assistantResponse,
    });

    // GERAR ÁUDIO TTS COM MELHOR QUALIDADE
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1', // Ou 'tts-1-hd' para qualidade ainda melhor
      voice: 'nova', // Voz mais natural
      input: assistantResponse,
      response_format: 'mp3',
      speed: 1.0, // Velocidade normal
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // Retornar resposta com headers
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
