import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');

  if (!companyId) {
    return NextResponse.json({ error: 'company_id obrigatório' }, { status: 400 });
  }

  const supabase = createClient();

  // Buscar consultas
  const { data: consultas, error } = await supabase
    .from('historico_consultas')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const consultasProcessadas = await Promise.all(
    (consultas || []).map(async (c) => {
      const createdAt = new Date(c.created_at);
      const horasPassadas = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      // Verificar se existe download ativo (não expirado) em companion_downloads
      const { data: download } = await supabase
        .from('companion_downloads')
        .select('id, expires_at, status')
        .eq('company_id', companyId)
        .ilike('file_name', `%${c.tipo_consulta}%`) // Busca por tipo de consulta no nome do arquivo
        .gte('expires_at', now.toISOString()) // Ainda não expirado
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const temDownloadAtivo = !!download;
      const expirado = horasPassadas >= 24;
      
      return {
        ...c,
        pdf_disponivel: temDownloadAtivo,
        horas_restantes: temDownloadAtivo 
          ? Math.max(0, (new Date(download.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60))
          : 0,
        expirado,
        download_token: download?.id || null,
      };
    })
  );

  return NextResponse.json({ consultas: consultasProcessadas });
}
