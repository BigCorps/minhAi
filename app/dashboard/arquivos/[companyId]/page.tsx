'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import ArquivosCompanyClient from './ArquivosCompanyClient';

export default function ArquivosCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const supabase = createClient();

  const [company, setCompany] = useState<any>(null);
  const [cupons, setCupons] = useState<any[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    totalCupons: 0, 
    totalConsultas: 0, 
    totalArquivos: 0 
  });
  const [loading, setLoading] = useState(true);

  console.log('🟡 [ArquivosCompanyPage] render — companyId:', companyId);

  useEffect(() => {
    console.log('🔵 [useEffect] disparou — companyId:', companyId);

    const load = async () => {
      console.log('🔵 [load] iniciando...');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔵 [load] user:', user?.id, '| authError:', authError);

      if (!user) {
        console.log('🔴 [load] sem user → redirect /login');
        router.push('/login');
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, slug')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .single();

      console.log('🔵 [load] companyData:', companyData, '| companyError:', companyError);

      if (!companyData) {
        console.log('🔴 [load] empresa não encontrada → redirect /dashboard/arquivos');
        router.push('/dashboard/arquivos');
        return;
      }

      setCompany(companyData);

      // Buscar cupons
      const { data: cuponsData, error: cuponsError } = await supabase
        .from('cupons')
        .select('id, code, type, discount_type, discount_value, times_used, max_uses, is_active, expires_at, created_at, metadata')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      console.log('🔵 [load] cuponsData count:', cuponsData?.length, '| cuponsError:', cuponsError);

      const listaCupons = cuponsData || [];
      setCupons(listaCupons);

      // Buscar consultas
      const { data: consultasData, error: consultasError } = await supabase
        .from('historico_consultas')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      console.log('🔵 [load] consultasData count:', consultasData?.length, '| consultasError:', consultasError);

      const now = new Date();

      // Buscar TODOS os downloads ativos da empresa de uma vez
      const { data: downloads } = await supabase
        .from('companion_downloads')
        .select('id, expires_at, status, token, file_base64, file_name, file_type, created_at')
        .eq('company_id', companyId)
        .gte('expires_at', now.toISOString())
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      console.log('🔵 [load] downloads ativos:', downloads?.length);

      // Processar consultas e associar downloads
      const consultasProcessadas = (consultasData || []).map((c) => {
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

      setConsultas(consultasProcessadas);

      // Calcular stats
      const totalCupons = listaCupons.length;
      const totalConsultas = consultasData?.length || 0;
      
      setStats({
        totalCupons,
        totalConsultas,
        totalArquivos: totalCupons + totalConsultas,
      });

      console.log('✅ [load] concluído — setLoading(false)');
      setLoading(false);
    };

    load();
  }, [companyId]);

  console.log('🟡 [ArquivosCompanyPage] loading:', loading, '| company:', company?.name);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-8">
        <div className="h-12 rounded-xl bg-gray-200 dark:bg-slate-800/50 w-48"></div>
        <div className="h-32 rounded-xl bg-gray-200 dark:bg-slate-800/50"></div>
        <div className="h-96 rounded-xl bg-gray-200 dark:bg-slate-800/50"></div>
      </div>
    );
  }

  if (!company) {
    console.log('🔴 [ArquivosCompanyPage] company null após loading — retornando null');
    return null;
  }

  return (
    <ArquivosCompanyClient
      company={company}
      cupons={cupons}
      consultas={consultas}
      stats={stats}
    />
  );
}