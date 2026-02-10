import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const supabase = createClient();

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: data.name,
        slug: data.slug,
        logo_url: data.logo_url || null,
        is_public: data.is_public ?? true,
        private_slug: uuidv4(),
        wake_word: data.wake_word || 'olá assistente',
        greeting_message: data.greeting_message || 'Olá! Como posso ajudar você hoje?',
        system_prompt: data.system_prompt || 'Você é um assistente virtual prestativo. Responda de forma clara, objetiva e educada.',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Erro ao criar assistente' },
      { status: 500 }
    );
  }
}
