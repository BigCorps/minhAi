import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { company_id, package_id } = await request.json();
    
    if (!company_id || !package_id) {
      return NextResponse.json(
        { error: 'company_id e package_id são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 🎯 Chamar Edge Function para gerar cobrança no Banco Inter
    const { data, error } = await supabase.functions.invoke('gerar-cobranca-creditos', {
      body: { company_id, package_id }
    });

    if (error) {
      console.error('Erro na Edge Function:', error);
      throw new Error(error.message || 'Erro ao gerar cobrança');
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao gerar cobrança');
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao processar compra' },
      { status: 500 }
    );
  }
}