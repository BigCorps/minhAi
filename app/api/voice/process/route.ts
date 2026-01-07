import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio, processWithGPT, generateSpeech } from '@/lib/openai';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 segundos max

export async function POST(request: NextRequest) {
  try {
    // Pegar dados do form
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const companyId = formData.get('companyId') as string;
    const conversationId = formData.get('conversationId') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Arquivo de áudio não fornecido' },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'ID da empresa não fornecido' },
        { status: 400 }
      );
    }

    // Converter File para Blob
    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type,
    });

    // Buscar prompt da empresa
    const supabase = createClient();
    const { data: promptData, error: promptError } = await supabase
      .from('company_prompts')
      .select('system_prompt')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single();

    if (promptError || !promptData) {
      return NextResponse.json(
        { error: 'Prompt da empresa não encontrado' },
        { status: 404 }
      );
    }

    const systemPrompt = promptData.system_prompt;

    // Buscar histórico da conversa (últimas 5 mensagens)
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    if (conversationId) {
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (messages) {
        conversationHistory = messages.reverse().map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      }
    }

    // 1. Transcrever áudio
    console.log('Transcrevendo áudio...');
    const transcription = await transcribeAudio(audioBlob);
    console.log('Transcrição:', transcription);

    // 2. Processar com GPT
    console.log('Processando com GPT...');
    const response = await processWithGPT(
      transcription,
      systemPrompt,
      conversationHistory
    );
    console.log('Resposta GPT:', response);

    // 3. Gerar áudio da resposta
    console.log('Gerando áudio...');
    const audioResponse = await generateSpeech(response);

    // 4. Criar ou atualizar conversa no banco
    let finalConversationId = conversationId;

    if (!conversationId) {
      // Criar nova conversa
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          company_id: companyId,
          status: 'active',
        })
        .select('id')
        .single();

      if (convError || !newConversation) {
        console.error('Erro ao criar conversa:', convError);
      } else {
        finalConversationId = newConversation.id;
      }
    }

    // 5. Salvar mensagens no banco
    if (finalConversationId) {
      await supabase.from('messages').insert([
        {
          conversation_id: finalConversationId,
          role: 'user',
          content: transcription,
        },
        {
          conversation_id: finalConversationId,
          role: 'assistant',
          content: response,
        },
      ]);

      // Atualizar contador de mensagens
      await supabase.rpc('increment_message_count', {
        conv_id: finalConversationId,
      });
    }

    // 6. Retornar resposta
    return new NextResponse(audioResponse, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Transcription': encodeURIComponent(transcription),
        'X-Response-Text': encodeURIComponent(response),
        'X-Conversation-Id': finalConversationId || '',
      },
    });
  } catch (error: any) {
    console.error('Error processing voice:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar voz' },
      { status: 500 }
    );
  }
}
