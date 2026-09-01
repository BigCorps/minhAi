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
          id, nome, categoria, descricao,
          rendimento_qtd, rendimento_unid,
          preco_venda, preco_venda_sugerido, markup_base,
          is_ficha_preparo, tags,
          custo_total, margem_lucro,
          tem_estimativas, criado_por_voz,
          is_active, created_at,
          producao_ficha_itens(
            id, ingrediente_nome_temp, quantidade, unidade, preco_temp, source,
            producao_ingredientes(id, nome, preco_por_unidade)
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      const lista = (fichasData || []).map((ficha: any) => ({
        ...ficha,
        is_ficha_preparo: ficha.is_ficha_preparo ?? false,
        tags: ficha.tags ?? [],
        rendimento: ficha.rendimento_qtd,
        unidade_rendimento: ficha.rendimento_unid,
        preco_venda: ficha.preco_venda ?? null,
        preco_venda_sugerido: ficha.preco_venda_sugerido ?? ficha.preco_venda,
        custo_total: ficha.custo_total ?? null,
        margem_lucro: ficha.margem_lucro ?? null,
        is_active: ficha.is_active ?? true,
        producao_ingredientes: (ficha.producao_ficha_itens ?? []).map((item: any) => ({
          id: item.id,
          nome: (() => {
            const n = item.producao_ingredientes?.nome ?? item.ingrediente_nome_temp;
            return n && n.toLowerCase() !== 'ingrediente' ? n : 'Sem nome';
          })(),
          quantidade: item.quantidade,
          unidade: item.unidade,
          // ✅ Prioridade: preço do ingrediente vinculado > preco_temp > null
          custo_unitario: (() => {
            const precoIngrediente = item.producao_ingredientes?.preco_por_unidade;
            if (precoIngrediente && precoIngrediente > 0) return precoIngrediente;
            if (item.preco_temp && item.preco_temp > 0) return item.preco_temp;
            return null;
          })(),
          custo_estimado: item.source === 'ai_estimate' || item.source === 'ai_default',
        })),
      }));

      setFichas(lista);
      setStats({
        totalFichas: lista.length,
        ativas: lista.filter((f: any) => f.is_active).length,
        comCusto: lista.filter((f: any) => f.custo_total !== null && f.custo_total > 0).length,
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
