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

      const { data: cuponsData, error: cuponsError } = await supabase
        .from('cupons')
        .select('id, code, type, discount_type, discount_value, times_used, max_uses, is_active, expires_at, created_at, metadata')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      console.log('🔵 [load] cuponsData count:', cuponsData?.length, '| cuponsError:', cuponsError);

      const lista = cuponsData || [];
      setCupons(lista);

      const now = new Date();
      setStats({
        totalCupons: lista.length,
        ativos: lista.filter(c => c.is_active && (!c.expires_at || new Date(c.expires_at) > now)).length,
        totalResgates: lista.reduce((sum, c) => sum + (c.times_used || 0), 0),
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
      stats={stats}
    />
  );
}