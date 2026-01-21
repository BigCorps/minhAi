import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const supabase = createClient();

    // Buscar ou criar créditos da empresa
    let { data: credits, error } = await supabase
      .from('company_credits')
      .select('*')
      .eq('company_id', companyId)
      .single();

    // Se não existe, criar com 20 créditos grátis
    if (error && error.code === 'PGRST116') {
      const { data: newCredits, error: createError } = await supabase
        .from('company_credits')
        .insert([{
          company_id: companyId,
          available_credits: 20,
          total_purchased: 0,
          total_used: 0
        }])
        .select()
        .single();

      if (createError) throw createError;
      credits = newCredits;

      // Registrar transação inicial
      await supabase
        .from('credit_transactions')
        .insert([{
          company_id: companyId,
          transaction_type: 'initial',
          amount: 20,
          balance_after: 20,
          notes: 'Créditos iniciais gratuitos'
        }]);
    } else if (error) {
      throw error;
    }

    // Calcular percentual usado
    const totalCredits = credits.available_credits + credits.total_used;
    const percentage_used = totalCredits > 0 
      ? (credits.total_used / totalCredits) * 100 
      : 0;

    return NextResponse.json({
      ...credits,
      percentage_used
    });

  } catch (error) {
    console.error('Erro ao buscar créditos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar créditos' },
      { status: 500 }
    );
  }
}