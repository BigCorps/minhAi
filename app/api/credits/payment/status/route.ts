import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { payment_id } = await request.json();
    
    if (!payment_id) {
      return NextResponse.json(
        { error: 'payment_id é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Chamar Edge Function para verificar pagamento
    const { data, error } = await supabase.functions.invoke('verificar-pagamento-creditos', {
      body: { payment_id }
    });

    if (error) {
      console.error('Erro na Edge Function:', error);
      throw new Error(error.message || 'Erro ao verificar pagamento');
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao verificar pagamento' },
      { status: 500 }
    );
  }
}