import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { processVoiceInteraction } from '@/lib/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const companyId = formData.get('companyId') as string;
    const conversationId = formData.get('conversationId') as string | null;

    if (!audioFile || !companyId) {
      return NextResponse.json(
        { error: 'Audio and companyId are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Buscar empresa e seu prompt
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*, company_prompts!inner(*)')
      .eq('id', companyId)
      .eq('company_prompts.is_active', true)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Usar system_prompt da empresa (novo) ou do company_prompts (legado)
    const systemPrompt = company.system_prompt || 
                        company.company_prompts?.[0]?.system_prompt || 
                        'Você é um assistente virtual prestativo. Responda de forma clara, objetiva e educada.';

    // Buscar histórico de conversa se existir conversationId
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    if (conversationId) {
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10); // Últimas 10 mensagens para contexto

      if (messages) {
        conversationHistory = messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }));
      }
    }

    // Converter File para Blob
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });

    // Processar interação de voz
    const { transcription, response, audioResponse } = await processVoiceInteraction(
      audioBlob,
      systemPrompt,
      conversationHistory
    );

    // Salvar conversa no banco
    let newConversationId = conversationId;
    
    if (!newConversationId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .insert({
          company_id: companyId,
        })
        .select()
        .single();

      newConversationId = conversation?.id || null;
    }

    if (newConversationId) {
      // Salvar mensagem do usuário
      await supabase.from('messages').insert({
        conversation_id: newConversationId,
        role: 'user',
        content: transcription,
      });

      // Salvar resposta do assistente
      await supabase.from('messages').insert({
        conversation_id: newConversationId,
        role: 'assistant',
        content: response,
      });
    }

    // Retornar áudio com metadados nos headers
    return new NextResponse(audioResponse, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Transcription': encodeURIComponent(transcription),
        'X-Response-Text': encodeURIComponent(response),
        'X-Conversation-Id': newConversationId || '',
      },
    });
  } catch (error: any) {
    console.error('Error processing voice:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing voice' },
      { status: 500 }
    );
  }
}
