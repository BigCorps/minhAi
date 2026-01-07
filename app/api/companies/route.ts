import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const supabase = createClient();

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: data.name,
        slug: data.slug,
        wake_word: data.wake_word || 'olá assistente',
        greeting_message: data.greeting_message || 'Olá! Como posso ajudar você hoje?',
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
      { message: error.message || 'Erro ao criar empresa' },
      { status: 500 }
    );
  }
}
