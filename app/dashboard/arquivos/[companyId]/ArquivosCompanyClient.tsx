// app/dashboard/arquivos/[companyId]/ArquivosCompanyClient.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { ArrowLeft, Ticket, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

interface ArquivosCompanyClientProps {
  company: { id: string; name: string; slug: string };
  cupons: any[];
  stats: { totalCupons: number; ativos: number; totalResgates: number };
}

type TabKey = 'cupons'; // futuras abas: | 'documentos' | 'imagens'
type FiltroKey = 'todos' | 'ativos' | 'expirados' | 'esgotados';

export default function ArquivosCompanyClient({
  company,
  cupons: initialCupons,
  stats: initialStats,
}: ArquivosCompanyClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('cupons');
  const [cupons, setCupons] = useState(initialCupons);
  const [stats, setStats] = useState(initialStats);
  const [filtro, setFiltro] = useState<FiltroKey>('todos');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();

  // ── Toggle ativo/inativo ──────────────────────────────────
  async function handleToggleAtivo(cupomId: string, current: boolean) {
    setLoadingId(cupomId);
    const { error } = await supabase
      .from('cupons')
      .update({ is_active: !current })
      .eq('id', cupomId);

    if (!error) {
      setCupons(prev =>
        prev.map(c => c.id === cupomId ? { ...c, is_active: !current } : c)
      );
      // Recalcular stats
      const updated = cupons.map(c => c.id === cupomId ? { ...c, is_active: !current } : c);
      setStats({
        totalCupons: updated.length,
        ativos: updated.filter(c => c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date())).length,
        totalResgates: updated.reduce((sum, c) => sum + (c.times_used || 0), 0),
      });
    }
    setLoadingId(null);
  }

  // ── Filtrar cupons ────────────────────────────────────────
  const now = new Date();
  const cuponsFiltered = cupons.filter(c => {
    if (filtro === 'ativos') return c.is_active && (!c.expires_at || new Date(c.expires_at) > now);
    if (filtro === 'expirados') return c.expires_at && new Date(c.expires_at) <= now;
    if (filtro === 'esgotados') return c.max_uses && c.times_used >= c.max_uses;
    return true;
  });

  // ── Helpers ───────────────────────────────────────────────
  function getClienteName(cupom: any): string {
    return cupom.metadata?.referred_by_identifier || '—';
  }

  function formatDesconto(cupom: any): string {
    if (cupom.discount_type === 'percentage') return `${cupom.discount_value}%`;
    return `R$ ${Number(cupom.discount_value).toFixed(2).replace('.', ',')}`;
  }

  function getStatusBadge(cupom: any) {
    if (!cupom.is_active)
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50">Inativo</span>;
    if (cupom.expires_at && new Date(cupom.expires_at) <= now)
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">Expirado</span>;
    if (cupom.max_uses && cupom.times_used >= cupom.max_uses)
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">Esgotado</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">Ativo</span>;
  }

  // ── TABS config ───────────────────────────────────────────
  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    {
      key: 'cupons',
      label: 'Cupons',
      icon: <Ticket className="w-4 h-4" />,
    },
    // Futuras abas aqui
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/arquivos"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-white/50 hover:text-blue-600 dark:hover:text-blue-400 transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Arquivos
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {company.name}
          </h2>
          <p className="text-gray-600 dark:text-white/60 mt-1">
            Gerencie arquivos e cupons desta empresa
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total de Cupons', value: stats.totalCupons, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Cupons Ativos', value: stats.ativos, color: 'text-green-600 dark:text-green-400' },
            { label: 'Total de Resgates', value: stats.totalResgates, color: 'text-purple-600 dark:text-purple-400' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-5 bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm shadow-sm"
            >
              <p className="text-sm text-gray-500 dark:text-white/50 mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/60 dark:bg-white/5 rounded-xl p-1 w-fit border border-gray-200 dark:border-white/10">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── ABA CUPONS ── */}
        {activeTab === 'cupons' && (
          <div className="rounded-xl bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm shadow-sm overflow-hidden">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex gap-2">
                {(['todos', 'ativos', 'expirados', 'esgotados'] as FiltroKey[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      filtro === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/15'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 dark:text-white/40">
                {cuponsFiltered.length} cupom{cuponsFiltered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Tabela */}
            {cuponsFiltered.length === 0 ? (
              <div className="py-16 text-center">
                <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-white/20" />
                <p className="text-gray-500 dark:text-white/40 font-medium">Nenhum cupom encontrado</p>
                <p className="text-sm text-gray-400 dark:text-white/30 mt-1">
                  Os cupons são gerados pelos clientes via assistente de voz
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/10">
                      {['Código', 'Cliente', 'Desconto', 'Usos', 'Validade', 'Status', 'Ações'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {cuponsFiltered.map(cupom => (
                      <tr key={cupom.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">

                        {/* Código */}
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold tracking-wider text-gray-900 dark:text-white">
                            {cupom.code}
                          </span>
                        </td>

                        {/* Cliente */}
                        <td className="px-6 py-4">
                          <span className="text-gray-700 dark:text-white/80">
                            {getClienteName(cupom)}
                          </span>
                        </td>

                        {/* Desconto */}
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                            {formatDesconto(cupom)}
                          </span>
                        </td>

                        {/* Usos */}
                        <td className="px-6 py-4 text-gray-600 dark:text-white/60">
                          {cupom.times_used}
                          {cupom.max_uses ? ` / ${cupom.max_uses}` : ' / ∞'}
                        </td>

                        {/* Validade */}
                        <td className="px-6 py-4 text-gray-600 dark:text-white/60">
                          {cupom.expires_at
                            ? new Date(cupom.expires_at).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(cupom)}
                        </td>

                        {/* Ações */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleAtivo(cupom.id, cupom.is_active)}
                            disabled={loadingId === cupom.id}
                            title={cupom.is_active ? 'Desativar cupom' : 'Ativar cupom'}
                            className={`p-1.5 rounded-lg transition-all ${
                              loadingId === cupom.id
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                          >
                            {loadingId === cupom.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                            ) : cupom.is_active ? (
                              <ToggleRight className="w-5 h-5 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Futuras abas renderizadas aqui */}
      </div>
    </div>
  );
}