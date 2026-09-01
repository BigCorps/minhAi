// app/api/assistant/segment-functions/route.ts
// Retorna a contagem e a lista de funções de um segmento.
// Usado pelo Step6 para exibir "N funções configuradas automaticamente".

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentKey    = searchParams.get('segment');
    const assistantType = (searchParams.get('type') ?? 'smart') as 'smart' | 'vendas';

    if (!segmentKey) {
      return NextResponse.json({ error: 'segment é obrigatório' }, { status: 400 });
    }

    const supabase = createClient();

    // Buscar o segmento
    const { data: segment, error } = await supabase
      .from('assistant_segments')
      .select('function_keys, function_keys_vendas')
      .eq('segment_key', segmentKey)
      .eq('is_active', true)
      .single();

    if (error || !segment) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }

    const keys: string[] = assistantType === 'vendas'
      ? (segment.function_keys_vendas as string[])
      : (segment.function_keys as string[]);

    // Buscar nomes das funções para exibir no Step6
    const { data: functions } = await supabase
      .from('assistant_functions')
      .select('function_key, function_name, function_category, short_description')
      .in('function_key', keys)
      .eq('is_active', true)
      .order('function_category')
      .order('function_name');

    return NextResponse.json({
      count:     keys.length,
      functions: functions ?? [],
    });

  } catch (error: any) {
    console.error('Erro em segment-functions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
