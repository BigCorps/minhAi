'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Zap, TrendingUp, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

interface VendasCardProps {
  companyId: string;
}

export function VendasCard({ companyId }: VendasCardProps) {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalComissoes, setTotalComissoes] = useState(0);
  const [comissoesPendentes, setComissoesPendentes] = useState(0);
  const [quantidadeVendas, setQuantidadeVendas] = useState(0);
  const { resolvedTheme } = useTheme();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        // Comissões pendentes
        const { data: pending } = await supabase
          .from('commission_pending')
          .select('valor_venda, valor_comissao')
          .eq('company_id', companyId)
          .eq('status', 'pendente');

        // Comissões já descontadas
        const { data: discounted } = await supabase
          .from('commission_pending')
          .select('valor_venda, valor_comissao')
          .eq('company_id', companyId)
          .eq('status', 'descontado');

        const allSales = [...(pending || []), ...(discounted || [])];

        const totalV = allSales.reduce((s, c) => s + Number(c.valor_venda), 0);
        const totalC = allSales.reduce((s, c) => s + Number(c.valor_comissao), 0);
        const pendC  = (pending || []).reduce((s, c) => s + Number(c.valor_comissao), 0);

        setTotalVendas(totalV);
        setTotalComissoes(totalC);
        setComissoesPendentes(pendC);
        setQuantidadeVendas(allSales.length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (companyId) load();
  }, [companyId]);

  if (!mounted || loading) {
    return (
      <div className="rounded-xl shadow-lg p-6 border animate-pulse bg-slate-800/50 border-white/10 backdrop-blur-xl">
        <div className="h-32" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Link
      href="/dashboard/saldo"
      className={`block rounded-xl shadow-lg p-6 border transition-all hover:shadow-2xl hover:-translate-y-1 ${
        isDark
          ? 'bg-gradient-to-br from-amber-900/30 to-slate-900 border-amber-500/20 backdrop-blur-xl hover:border-amber-500/40'
          : 'bg-white border-amber-200 hover:border-amber-300'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

        {/* Ícone + título */}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
          }`}>
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                minhAi Vendas
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-black">
                10% comissão
              </span>
            </div>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              {quantidadeVendas} venda{quantidadeVendas !== 1 ? 's' : ''} realizadas
            </p>
          </div>
        </div>

        {/* Métricas */}
        <div className="flex flex-wrap gap-6 flex-1 justify-center md:justify-end">
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {fmt(totalVendas)}
            </p>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              Total vendido
            </p>
          </div>

          <div className="text-center">
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {fmt(totalComissoes)}
            </p>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              Comissões totais
            </p>
          </div>

          {comissoesPendentes > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">
                {fmt(comissoesPendentes)}
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Pendentes (saque)
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="shrink-0">
          <button className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
            isDark
              ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-900/20'
              : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-200'
          }`}>
            <TrendingUp className="w-4 h-4" />
            Ver Recebimentos
          </button>
        </div>
      </div>
    </Link>
  );
}
