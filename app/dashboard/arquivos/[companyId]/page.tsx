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
  const [stats, setStats] = useState({ totalCupons: 0, ativos: 0, totalResgates: 0 });
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

      // Buscar empresa
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

      const now = new Date();
      setStats({
        totalCupons: listaCupons.length,
        ativos: listaCupons.filter(c => c.is_active && (!c.expires_at || new Date(c.expires_at) > now)).length,
        totalResgates: listaCupons.reduce((sum, c) => sum + (c.times_used || 0), 0),
      });

      // Buscar consultas
      const { data: consultasData, error: consultasError } = await supabase
        .from('historico_consultas')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      console.log('🔵 [load] consultasData count:', consultasData?.length, '| consultasError:', consultasError);

      // Processar consultas para adicionar status de disponibilidade
      const consultasProcessadas = (consultasData || []).map(c => {
        const createdAt = new Date(c.created_at);
        const horasPassadas = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        return {
          ...c,
          pdf_disponivel: c.pdf_base64 !== null && horasPassadas < 24,
          horas_restantes: c.pdf_base64 ? Math.max(0, 24 - horasPassadas) : 0,
          foi_baixado: c.pdf_base64 === null && horasPassadas < 24,
        };
      });

      setConsultas(consultasProcessadas);

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
