// app/api/gemini-chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateAssistantResponse, ChatMessage } from '@/lib/gemini';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/gemini-chat
 * 
 * Processa mensagem do usuário com ChatGPT
 * Body: { 
 *   question: string, 
 *   company_id: string,
 *   conversation_id?: string,
 *   history?: ChatMessage[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, company_id, conversation_id, history } = body;
    
    if (!question || !company_id) {
      return NextResponse.json(
        { error: 'question e company_id são obrigatórios' },
        { status: 400 }
      );
    }
    
    console.log('🤖 ChatGPT processando:', {
      question: question.substring(0, 50),
      company_id,
      has_history: !!history,
    });
    
    const startTime = Date.now();
    
    // Buscar informações da empresa
    const supabase = createClient();
    const { data: company } = await supabase
      .from('companies')
      .select('name, system_prompt, greeting_message')
      .eq('id', company_id)
      .single();
    
    if (!company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }
    
    // Buscar histórico do Supabase se conversation_id fornecido
    let conversationHistory: ChatMessage[] = history ?? [];
    
    if (conversation_id && !history) {
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })
        .limit(10); // Últimas 10 mensagens
      
      if (messages) {
        conversationHistory = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));
      }
    }
    
    // Gerar resposta com ChatGPT
    const answer = await generateAssistantResponse(
      question,
      {
        companyName: company.name,
        systemPrompt: company.system_prompt ?? undefined,
        greetingMessage: company.greeting_message ?? undefined,
      },
      conversationHistory
    );
    
    const duration = Date.now() - startTime;
    console.log(`✅ ChatGPT respondeu em ${duration}ms:`, answer.substring(0, 50));
    
    // Salvar no banco se conversation_id fornecido
    if (conversation_id) {
      // Mensagem do usuário
      await supabase.from('messages').insert({
        conversation_id,
        role: 'user',
        content: question,
      });
      
      // Resposta do assistente
      await supabase.from('messages').insert({
        conversation_id,
        role: 'assistant',
        content: answer,
      });
    }
    
    return NextResponse.json({
      answer,
      duration,
      service: 'gpt-4o-mini',
      tokens_used: Math.ceil(answer.length / 4), // Estimativa
    });
    
  } catch (error: any) {
    console.error('❌ Erro ChatGPT:', error);
    
    // Log detalhado do erro
    console.error('Stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar mensagem',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS para CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}