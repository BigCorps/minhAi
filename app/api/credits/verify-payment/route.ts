import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 1. Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Parse do body
    const { payment_id } = await request.json();
    
    if (!payment_id) {
      return NextResponse.json(
        { error: 'payment_id é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🔍 Verificando pagamento:', payment_id);

    // 3. Chamar Edge Function para verificar no Banco Inter
    const { data, error } = await supabase.functions.invoke('verificar-pagamento-creditos', {
      body: { payment_id }
    });

    if (error) {
      console.error('❌ Erro da Edge Function:', error);
      return NextResponse.json(
        { error: 'Erro ao verificar pagamento', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Resposta:', data);

    return NextResponse.json(data);

  } catch (error) {
    console.error('💥 Erro na API:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao verificar pagamento',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
