import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');

  if (!companyId) {
    return NextResponse.json({ error: 'company_id obrigatório' }, { status: 400 });
  }

  const supabase = createClient();

  // Buscar consultas da empresa
  const { data: consultas, error } = await supabase
    .from('historico_consultas')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Processar dados para adicionar status de disponibilidade
  const now = new Date();
  const consultasProcessadas = consultas.map(c => {
    const createdAt = new Date(c.created_at);
    const horasPassadas = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    return {
      ...c,
      pdf_disponivel: c.pdf_base64 !== null && horasPassadas < 24,
      horas_restantes: c.pdf_base64 ? Math.max(0, 24 - horasPassadas) : 0,
      foi_baixado: c.pdf_base64 === null && horasPassadas < 24, // PDF removido antes de 24h = foi baixado
    };
  });

  return NextResponse.json({ consultas: consultasProcessadas });
}
