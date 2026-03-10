'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import ProducaoCompanyClient from './ProducaoCompanyClient';

export default function ProducaoCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const supabase = createClient();

  const [company, setCompany] = useState<any>(null);
  const [fichas, setFichas] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalFichas: 0, ativas: 0, comCusto: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, slug')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .single();

      if (!companyData) { router.push('/dashboard/producao'); return; }
      setCompany(companyData);

      const { data: fichasData } = await supabase
        .from('producao_fichas')
        .select(`
          id, nome, descricao, rendimento, unidade_rendimento,
          preco_venda_sugerido, custo_total, margem_lucro, is_active, created_at,
          producao_ingredientes (
            id, nome, quantidade, unidade, custo_unitario, custo_estimado
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      const lista = fichasData || [];
      setFichas(lista);
      const now = new Date();
      setStats({
        totalFichas: lista.length,
        ativas: lista.filter((f: any) => f.is_active).length,
        comCusto: lista.filter((f: any) => f.custo_total !== null).length,
      });
      setLoading(false);
    };
    load();
  }, [companyId]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-8">
        <div className="h-12 rounded-xl bg-gray-200 dark:bg-slate-800/50 w-48"></div>
        <div className="h-32 rounded-xl bg-gray-200 dark:bg-slate-800/50"></div>
        <div className="h-96 rounded-xl bg-gray-200 dark:bg-slate-800/50"></div>
      </div>
    );
  }

  if (!company) return null;

  return (
    <ProducaoCompanyClient
      company={company}
      fichas={fichas}
      stats={stats}
    />
  );
}
