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
    const { package_id } = await request.json();
    
    if (!package_id) {
      return NextResponse.json(
        { error: 'package_id é obrigatório' },
        { status: 400 }
      );
    }

    console.log('💳 Iniciando compra para user:', user.id, 'pacote:', package_id);

    // 3. Chamar Edge Function (agora com user_id)
    const { data, error } = await supabase.functions.invoke('gerar-cobranca-creditos', {
      body: { 
        user_id: user.id,   // ← MUDOU! Agora é user_id
        package_id 
      }
    });

    if (error) {
      console.error('❌ Erro da Edge Function:', error);
      return NextResponse.json(
        { error: 'Erro ao criar pagamento', details: error.message },
        { status: 500 }
      );
    }

    if (!data || !data.success) {
      console.error('❌ Edge Function retornou erro:', data);
      return NextResponse.json(
        { error: data?.error || 'Erro ao processar pagamento' },
        { status: 500 }
      );
    }

    console.log('✅ Pagamento criado:', data.payment_id);

    return NextResponse.json(data);

  } catch (error) {
    console.error('💥 Erro na API:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao processar compra',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
