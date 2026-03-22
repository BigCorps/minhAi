// app/api/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Obter o usuário da sessão para vincular ao assistente
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: data.name,
        slug: data.is_public ? data.slug : `private-${randomUUID()}`,
        user_id: user.id, // Campo essencial para o RLS
        logo_url: data.logo_url || null,
        is_public: data.is_public ?? true,
        private_slug: randomUUID(),
        wake_word: data.wake_word || 'olá assistente',
        greeting_message: data.greeting_message || 'Olá! Como posso ajudar você hoje?',
        system_prompt: 'Você é um assistente virtual prestativo. Responda de forma clara, objetiva e educada.',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro Supabase:', error);
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    // ===== INÍCIO DA CORREÇÃO: INICIALIZAR FUNÇÕES PARA NOVA EMPRESA =====
    if (company) {
      // BUSCAR TODAS AS FUNÇÕES GLOBAIS ATIVAS
      const { data: allFunctions } = await supabase
        .from('assistant_functions')
        .select('function_key, consumes_credits, credits_per_use')
        .eq('is_active', true);

      if (allFunctions && allFunctions.length > 0) {
        const settingsToInsert = allFunctions.map(fn => ({
          company_id: company.id,
          function_key: fn.function_key,
          is_enabled: true, // Ativar por padrão
          custom_credits_per_use: fn.credits_per_use, // Usar o padrão global inicialmente
          enabled_at: new Date().toISOString(),
          enabled_by: user.id,
        }));

        // INSERIR AS CONFIGURAÇÕES PADRÃO PARA A NOVA EMPRESA
        const { error: settingsError } = await supabase
  .from('company_function_settings')
  .upsert(settingsToInsert, {
    onConflict: 'company_id,function_key',
    ignoreDuplicates: true,
  });

        if (settingsError) {
          console.error('Erro ao inserir configurações de função padrão:', settingsError);
          // Não bloqueia a criação da empresa, mas loga o erro para investigação
        }
      }
    }
    // ===== FIM DA CORREÇÃO =====

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    console.error('Erro API:', error);
    return NextResponse.json(
      { message: error.message || 'Erro ao criar assistente' },
      { status: 500 }
    );
  }
}