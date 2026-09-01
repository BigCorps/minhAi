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

  // Buscar TODOS os downloads ativos da empresa de uma vez
  const { data: downloads } = await supabase
    .from('companion_downloads')
    .select('id, expires_at, status, token, file_base64, file_name, file_type, created_at')
    .eq('company_id', companyId)
    .gte('expires_at', now.toISOString())
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Processar consultas e associar downloads
  const consultasProcessadas = (consultas || []).map((c) => {
    // Encontrar download criado próximo ao horário da consulta (até 15min de diferença)
    const download = downloads?.find(d => {
      const diffMinutes = Math.abs((new Date(d.created_at).getTime() - new Date(c.created_at).getTime()) / (1000 * 60));
      return diffMinutes < 15;
    });

    const temDownloadAtivo = !!download;
    
    return {
      ...c,
      pdf_disponivel: temDownloadAtivo,
      minutos_restantes: temDownloadAtivo 
        ? Math.max(0, Math.floor((new Date(download.expires_at).getTime() - now.getTime()) / (1000 * 60)))
        : 0,
      download_token: download?.token || null,
      file_base64: download?.file_base64 || null,
      file_name: download?.file_name || null,
      file_type: download?.file_type || null,
    };
  });

  return NextResponse.json({ consultas: consultasProcessadas });
}