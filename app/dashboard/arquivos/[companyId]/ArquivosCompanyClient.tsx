'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { ArrowLeft, Ticket, ToggleLeft, ToggleRight, RefreshCw, FileText, Download, CheckCircle, XCircle } from 'lucide-react';

// ========================================
// INTERFACES E TYPES (ANTES DA FUNÇÃO)
// ========================================

interface ArquivosCompanyClientProps {
  company: { id: string; name: string; slug: string };
  cupons: any[];
  consultas: any[];
  stats: { 
    totalCupons: number; 
    totalConsultas: number; 
    totalArquivos: number; 
  };
}

type TabKey = 'cupons' | 'consultas';
type FiltroKey = 'todos' | 'ativos' | 'expirados' | 'esgotados';

interface Consulta {
  id: string;
  tipo_consulta: string;
  created_at: string;
  status_pagamento: string;
  pdf_disponivel: boolean;
  horas_restantes: number;
  expirado: boolean;
  download_token: string | null;
}

interface Company {
  id: string;
  name: string;
  slug: string;
}

// ========================================
// COMPONENTE
// ========================================

export default function ArquivosCompanyClient({
  company: initialCompany,
  cupons: initialCupons,
  consultas: initialConsultas,
  stats: initialStats,
}: ArquivosCompanyClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('cupons');
  const [cupons, setCupons] = useState(initialCupons);
  const [stats, setStats] = useState(initialStats);
  const [filtro, setFiltro] = useState<FiltroKey>('todos');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>(initialConsultas);
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company>(initialCompany);
  const supabase = createClient();

  // Buscar todas as empresas do usuário
  useEffect(() => {
    async function fetchCompanies() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('companies')
        .select('id, name, slug')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (data) {
        setCompanies(data);
      }
    }
    fetchCompanies();
  }, []);

  // Recarregar dados ao trocar de empresa
  useEffect(() => {
    if (selectedCompany.id !== initialCompany.id) {
      window.location.href = `/dashboard/arquivos/${selectedCompany.id}`;
    }
  }, [selectedCompany.id, initialCompany.id]);

  // Buscar consultas quando aba é ativada
  useEffect(() => {
    if (activeTab === 'consultas' && initialConsultas.length > 0 && consultas.length === 0) {
      setConsultas(initialConsultas);
    } else if (activeTab === 'consultas' && initialConsultas.length === 0 && consultas.length === 0) {
      fetchConsultas();
    }
  }, [activeTab, initialConsultas]);

  async function handleToggleAtivo(cupomId: string, current: boolean) {
    setLoadingId(cupomId);
    const { error } = await supabase
      .from('cupons')
      .update({ is_active: !current })
      .eq('id', cupomId);

    if (!error) {
      const updated = cupons.map(c => c.id === cupomId ? { ...c, is_active: !current } : c);
      setCupons(updated);
      const now = new Date();
      const totalCupons = updated.length;
      const ativos = updated.filter(c => c.is_active && (!c.expires_at || new Date(c.expires_at) > now)).length;
      
      setStats({
        totalCupons,
        totalConsultas: stats.totalConsultas,
        totalArquivos: totalCupons + stats.totalConsultas,
      });
    }
    setLoadingId(null);
  }

  async function fetchConsultas() {
    setLoadingConsultas(true);
    try {
      const res = await fetch(`/api/historico-consultas?company_id=${selectedCompany.id}`);
      const data = await res.json();
      if (data.consultas) {
        setConsultas(data.consultas);
      }
    } catch (error) {
      console.error('Erro ao buscar consultas:', error);
    } finally {
      setLoadingConsultas(false);
    }
  }

  async function handleBaixarPDF(consultaId: string) {
    setDownloadingId(consultaId);
    
    try {
      const consulta = consultas.find(c => c.id === consultaId);
      if (!consulta || !consulta.download_token) {
        throw new Error('PDF não disponível');
      }

      // Redirecionar para página de download usando o token
      window.open(`/d/${consulta.download_token}`, '_blank');
      
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      alert('Erro ao baixar PDF');
    } finally {
      setDownloadingId(null);
    }
  }

  const now = new Date();
  const cuponsFiltered = cupons.filter(c => {
    if (filtro === 'ativos') return c.is_active && (!c.expires_at || new Date(c.expires_at) > now);
    if (filtro === 'expirados') return c.expires_at && new Date(c.expires_at) <= now;
    if (filtro === 'esgotados') return c.max_uses && c.times_used >= c.max_uses;
    return true;
  });

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

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-8">
          <Link
            href="/dashboard/arquivos"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-white/50 hover:text-blue-600 dark:hover:text-blue-400 transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Arquivos
          </Link>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {selectedCompany.name}
              </h2>
              <p className="text-gray-600 dark:text-white/60 mt-1">
                Gerencie arquivos e cupons desta empresa
              </p>
            </div>

            {companies.length > 1 && (
              <div className="shrink-0">
                <select
                  value={selectedCompany.id}
                  onChange={(e) => {
                    const company = companies.find(c => c.id === e.target.value);
                    if (company) setSelectedCompany(company);
                  }}
                  className="px-4 py-2 rounded-lg border bg-white text-gray-900 border-gray-300 dark:bg-slate-800 dark:text-white dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total de Cupons', value: stats.totalCupons, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Total de Consultas', value: stats.totalConsultas, color: 'text-green-600 dark:text-green-400' },
            { label: 'Total de Arquivos', value: stats.totalArquivos, color: 'text-purple-600 dark:text-purple-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-5 bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm shadow-sm">
              <p className="text-sm text-gray-500 dark:text-white/50 mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab('cupons')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'cupons'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Ticket className="w-4 h-4" />
              Cupons
            </button>
            <button
              onClick={() => setActiveTab('consultas')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'consultas'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Consultas
            </button>
          </div>
        </div>

        {activeTab === 'cupons' && (
          <div className="rounded-xl bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm shadow-sm overflow-hidden">

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
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold tracking-wider text-gray-900 dark:text-white">
                            {cupom.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-white/80">
                          {getClienteName(cupom)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                            {formatDesconto(cupom)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-white/60">
                          {cupom.times_used}{cupom.max_uses ? ` / ${cupom.max_uses}` : ' / ∞'}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-white/60">
                          {cupom.expires_at ? new Date(cupom.expires_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(cupom)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleAtivo(cupom.id, cupom.is_active)}
                            disabled={loadingId === cupom.id}
                            title={cupom.is_active ? 'Desativar cupom' : 'Ativar cupom'}
                            className={`p-1.5 rounded-lg transition-all ${
                              loadingId === cupom.id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-white/10'
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

        {activeTab === 'consultas' && (
          <div className="rounded-xl bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm shadow-sm overflow-hidden">

            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Histórico de Consultas
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 dark:text-white/40">
                  {consultas.length} consulta{consultas.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={fetchConsultas}
                  disabled={loadingConsultas}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingConsultas ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingConsultas && consultas.length === 0 ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-white/20 animate-spin" />
                <p className="text-gray-500 dark:text-white/40 font-medium">Carregando consultas...</p>
              </div>
            ) : consultas.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-white/20" />
                <p className="text-gray-500 dark:text-white/40 font-medium">Nenhuma consulta realizada</p>
                <p className="text-sm text-gray-400 dark:text-white/30 mt-1">
                  As consultas aparecem aqui após serem realizadas via assistente
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/10">
                      {['Tipo', 'Data', 'Status', 'PDF', 'Ações'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {consultas.map(consulta => (
                      <tr key={consulta.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                        
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {consulta.tipo_consulta.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-white/60">
                          {new Date(consulta.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>

                        <td className="px-6 py-4">
                          {consulta.status_pagamento === 'PAGO' ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                              Realizado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                              Erro
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {consulta.pdf_disponivel ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-xs text-gray-600 dark:text-white/60">
                                Disponível ({Math.floor(consulta.horas_restantes)}h restantes)
                              </span>
                            </div>
                          ) : consulta.expirado ? (
                            <span className="text-xs text-gray-400 dark:text-white/40">
                              Expirado
                            </span>
                          ) : (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400">
                              Processando...
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {consulta.pdf_disponivel ? (
                            <button
                              onClick={() => handleBaixarPDF(consulta.id)}
                              disabled={downloadingId === consulta.id}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-medium"
                            >
                              {downloadingId === consulta.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              Baixar
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-white/30">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
