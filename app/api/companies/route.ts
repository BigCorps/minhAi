// app/api/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'Usuário não autenticado' }, { status: 401 });
    }

    const data = await request.json();

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: data.name,
        slug: data.is_public ? data.slug : `private-${randomUUID()}`,
        user_id: user.id,
        logo_url: data.logo_url || null,
        is_public: data.is_public ?? true,
        private_slug: randomUUID(),
        wake_word: data.wake_word || 'olá assistente',
        greeting_message: data.greeting_message || 'Olá! Como posso ajudar você hoje?',
        system_prompt: 'Você é um assistente virtual prestativo. Responda de forma clara, objetiva e educada.',
        assistant_type: data.assistant_type === 'vendas' ? 'vendas' : 'smart',
        webapp_enabled: data.assistant_type === 'vendas' ? true : false,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro Supabase:', error);
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (company) {
      // ✅ Buscar funções com default_enabled para saber quais ativar
      const { data: allFunctions } = await supabase
        .from('assistant_functions')
        .select('function_key, credits_per_use, default_enabled')
        .eq('is_active', true);

      if (allFunctions && allFunctions.length > 0) {
        const settingsToInsert = allFunctions.map(fn => ({
          company_id: company.id,
          function_key: fn.function_key,
          // ✅ Só ativa funções marcadas como default_enabled = true
          // O setup bot ativa as demais conforme recomendação por ramo
          is_enabled: fn.default_enabled ?? false,
          custom_credits_per_use: fn.credits_per_use,
          enabled_at: fn.default_enabled ? new Date().toISOString() : null,
          enabled_by: fn.default_enabled ? user.id : null,
        }));

        const { error: settingsError } = await supabase
          .from('company_function_settings')
          .upsert(settingsToInsert, {
            onConflict: 'company_id,function_key',
            ignoreDuplicates: true,
          });

        if (settingsError) {
          console.error('Erro ao inserir configurações de função padrão:', settingsError);
        }
      }
    }

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    console.error('Erro API:', error);
    return NextResponse.json(
      { message: error.message || 'Erro ao criar assistente' },
      { status: 500 }
    );
  }
}
