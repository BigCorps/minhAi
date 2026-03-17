'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  ArrowLeft, Ticket, ToggleLeft, ToggleRight, RefreshCw,
  FileText, Download, CheckCircle, Upload, File, Image,
} from 'lucide-react';
import { useAssistant } from '@/contexts/AssistantContext';
import { useRouter } from 'next/navigation';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ArquivosCompanyClientProps {
  company: { id: string; name: string; slug: string };
  cupons: any[];
  consultas: any[];
  enviados: any[];
  stats: {
    totalCupons: number;
    totalConsultas: number;
    totalEnviados: number;
    totalArquivos: number;
  };
}

type TabKey    = 'enviados' | 'cupons' | 'consultas';
type FiltroKey = 'todos' | 'ativos' | 'expirados' | 'esgotados';

interface Consulta {
  id: string;
  tipo_consulta: string;
  created_at: string;
  status_pagamento: string;
  pdf_disponivel: boolean;
  minutos_restantes: number;
  expirado: boolean;
  download_token: string | null;
  file_base64: string | null;
  file_name: string | null;
  file_type: string | null;
}

interface Enviado {
  id: string;
  token: string;
  storage_path: string | null;
  status: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  expires_at: string | null;
}

interface Company { id: string; name: string; slug: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="w-4 h-4 text-gray-400" />;
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-400" />;
  if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />;
  return <File className="w-4 h-4 text-gray-400" />;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ArquivosCompanyClient({
  company: initialCompany,
  cupons: initialCupons,
  consultas: initialConsultas,
  enviados: initialEnviados,
  stats: initialStats,
}: ArquivosCompanyClientProps) {
  const supabase = createClient();

  const [activeTab,        setActiveTab]        = useState<TabKey>('enviados');
  const [cupons,           setCupons]           = useState(initialCupons);
  const [consultas,        setConsultas]        = useState<Consulta[]>(initialConsultas);
  const [enviados,         setEnviados]         = useState<Enviado[]>(initialEnviados);
  const [stats,            setStats]            = useState(initialStats);
  const [filtro,           setFiltro]           = useState<FiltroKey>('todos');
  const [loadingId,        setLoadingId]        = useState<string | null>(null);
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [loadingEnviados,  setLoadingEnviados]  = useState(false);
  const [downloadingId,    setDownloadingId]    = useState<string | null>(null);
  const [deletingId,       setDeletingId]       = useState<string | null>(null);
  const { selectedAssistantId, selectedAssistantName } = useAssistant();
  const router = useRouter();

  useEffect(() => {
    if (selectedAssistantId && selectedAssistantId !== initialCompany.id) {
      router.replace(`/dashboard/arquivos/${selectedAssistantId}`);
    }
  }, [selectedAssistantId]);

  // ── Consultas: lazy load ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'consultas' && initialConsultas.length > 0 && consultas.length === 0) {
      setConsultas(initialConsultas);
    } else if (activeTab === 'consultas' && initialConsultas.length === 0 && consultas.length === 0) {
      fetchConsultas();
    }
  }, [activeTab]); // eslint-disable-line

  // ── Cupons: toggle ──────────────────────────────────────────────────────────
  async function handleToggleAtivo(cupomId: string, current: boolean) {
    setLoadingId(cupomId);
    const { error } = await supabase
      .from('cupons')
      .update({ is_active: !current })
      .eq('id', cupomId);

    if (!error) {
      const updated = cupons.map(c => c.id === cupomId ? { ...c, is_active: !current } : c);
      setCupons(updated);
      setStats(prev => ({
        ...prev,
        totalCupons: updated.length,
        totalArquivos: updated.length + prev.totalConsultas + prev.totalEnviados,
      }));
    }
    setLoadingId(null);
  }

  // ── Consultas: fetch ────────────────────────────────────────────────────────
  async function fetchConsultas() {
    setLoadingConsultas(true);
    try {
      const res = await fetch(`/api/historico-consultas?company_id=${selectedCompany.id}`);
      const data = await res.json();
      if (data.consultas) setConsultas(data.consultas);
    } catch (error) {
      console.error('Erro ao buscar consultas:', error);
    } finally {
      setLoadingConsultas(false);
    }
  }

  // ── Consultas: baixar PDF ───────────────────────────────────────────────────
  async function handleBaixarPDF(consultaId: string) {
    setDownloadingId(consultaId);
    try {
      const consulta = consultas.find(c => c.id === consultaId);
      if (!consulta) throw new Error('Consulta não encontrada');

      if (consulta.download_token) {
        window.open(`/download/${consulta.download_token}`, '_blank');
        return;
      }
      if (consulta.file_base64) {
        let base64Clean = consulta.file_base64;
        if (base64Clean.includes(',')) base64Clean = base64Clean.split(',')[1];
        const byteString = atob(base64Clean);
        const byteArray  = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
        const blob = new Blob([byteArray], { type: consulta.file_type || 'application/pdf' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = consulta.file_name || `${consulta.tipo_consulta}_${new Date(consulta.created_at).toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      throw new Error('PDF não disponível');
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      alert('Erro ao baixar PDF');
    } finally {
      setDownloadingId(null);
    }
  }

  // ── Enviados: fetch ─────────────────────────────────────────────────────────
  const fetchEnviados = useCallback(async () => {
    setLoadingEnviados(true);
    try {
      const { data } = await supabase
        .from('companion_uploads')
        .select('id, token, storage_path, status, file_name, file_type, file_size, created_at, expires_at')
        .eq('company_id', selectedCompany.id)
        .eq('status', 'uploaded')
        .order('created_at', { ascending: false });
      if (data) {
        setEnviados(data);
        setStats(prev => ({
          ...prev,
          totalEnviados: data.length,
          totalArquivos: prev.totalCupons + prev.totalConsultas + data.length,
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar arquivos enviados:', error);
    } finally {
      setLoadingEnviados(false);
    }
  }, [selectedCompany.id, supabase]);

  // ── Enviados: download via signed URL ───────────────────────────────────────
  async function handleBaixarEnviado(enviado: Enviado) {
    if (!enviado.storage_path) { alert('Arquivo sem path no Storage.'); return; }
    setDownloadingId(enviado.id);
    try {
      const { data, error } = await supabase
        .storage
        .from('companion-uploads')
        .createSignedUrl(enviado.storage_path, 60);
      if (error || !data?.signedUrl) throw new Error(error?.message || 'Erro ao gerar link');
      const a    = document.createElement('a');
      a.href     = data.signedUrl;
      a.download = enviado.file_name || 'arquivo';
      a.target   = '_blank';
      a.click();
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro ao baixar arquivo.');
    } finally {
      setDownloadingId(null);
    }
  }

  // ── Enviados: deletar ───────────────────────────────────────────────────────
  async function handleDeletarEnviado(enviado: Enviado) {
    if (!confirm(`Deletar "${enviado.file_name || 'arquivo'}"?`)) return;
    setDeletingId(enviado.id);
    try {
      if (enviado.storage_path) {
        await supabase.storage.from('companion-uploads').remove([enviado.storage_path]);
      }
      await supabase.from('companion_uploads').delete().eq('id', enviado.id);
      const updated = enviados.filter(e => e.id !== enviado.id);
      setEnviados(updated);
      setStats(prev => ({
        ...prev,
        totalEnviados: updated.length,
        totalArquivos: prev.totalCupons + prev.totalConsultas + updated.length,
      }));
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      alert('Erro ao deletar arquivo.');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Helpers de cupom ────────────────────────────────────────────────────────
  const now = new Date();
  const cuponsFiltered = cupons.filter(c => {
    if (filtro === 'ativos')    return c.is_active && (!c.expires_at || new Date(c.expires_at) > now);
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Cabeçalho */}
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
                Arquivos
              </h2>
              <p className="text-gray-600 dark:text-white/60 mt-1">
                Gerencie arquivos e cupons do assistente {selectedAssistantName} .
              </p>
            </div>
          </div>
        </div>

        {/* Cards de stats — 4 colunas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Arquivos Enviados', value: stats.totalEnviados,  color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Total de Cupons',   value: stats.totalCupons,    color: 'text-blue-600 dark:text-blue-400'    },
            { label: 'Total de Consultas',value: stats.totalConsultas, color: 'text-green-600 dark:text-green-400'  },
            { label: 'Total de Arquivos', value: stats.totalArquivos,  color: 'text-purple-600 dark:text-purple-400'},
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

        {/* Abas — ordem: Enviados / Cupons / Consultas */}
        <div className="mb-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-white/10">
            {([
              { key: 'enviados',  label: 'Enviados',  icon: <Upload  className="w-4 h-4" /> },
              { key: 'cupons',    label: 'Cupons',    icon: <Ticket  className="w-4 h-4" /> },
              { key: 'consultas', label: 'Consultas', icon: <FileText className="w-4 h-4" /> },
            ] as { key: TabKey; label: string; icon: React.ReactNode }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === tab.key
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Aba: Enviados ───────────────────────────────────────────────────── */}
        {activeTab === 'enviados' && (
          <div className="rounded-xl bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm shadow-sm overflow-hidden">

            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Arquivos Enviados pelos Clientes
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 dark:text-white/40">
                  {enviados.length} arquivo{enviados.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={fetchEnviados}
                  disabled={loadingEnviados}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingEnviados ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingEnviados && enviados.length === 0 ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-white/20 animate-spin" />
                <p className="text-gray-500 dark:text-white/40 font-medium">Carregando arquivos...</p>
              </div>
            ) : enviados.length === 0 ? (
              <div className="py-16 text-center">
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-white/20" />
                <p className="text-gray-500 dark:text-white/40 font-medium">Nenhum arquivo enviado</p>
                <p className="text-sm text-gray-400 dark:text-white/30 mt-1">
                  Os arquivos enviados pelos clientes via assistente aparecem aqui
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/10">
                      {['Arquivo', 'Tipo', 'Tamanho', 'Recebido em', 'Ações'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {enviados.map(enviado => (
                      <tr key={enviado.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileTypeIcon mimeType={enviado.file_type} />
                            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                              {enviado.file_name || 'sem nome'}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-white/60 text-xs font-mono">
                          {enviado.file_type || '—'}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-white/60">
                          {formatBytes(enviado.file_size)}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-white/60">
                          {new Date(enviado.created_at).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Baixar */}
                            <button
                              onClick={() => handleBaixarEnviado(enviado)}
                              disabled={downloadingId === enviado.id || !enviado.storage_path}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-medium"
                            >
                              {downloadingId === enviado.id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />}
                              Baixar
                            </button>
                            {/* Deletar */}
                            <button
                              onClick={() => handleDeletarEnviado(enviado)}
                              disabled={deletingId === enviado.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-medium"
                            >
                              {deletingId === enviado.id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : '✕'}
                              Deletar
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Aba: Cupons ─────────────────────────────────────────────────────── */}
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
                          <span className="font-mono font-bold tracking-wider text-gray-900 dark:text-white">{cupom.code}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-white/80">{getClienteName(cupom)}</td>
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
                        <td className="px-6 py-4">{getStatusBadge(cupom)}</td>
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

        {/* ── Aba: Consultas ───────────────────────────────────────────────────── */}
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
                            {consulta.tipo_consulta.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-white/60">
                          {new Date(consulta.created_at).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
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
                                Disponível ({Math.floor(consulta.minutos_restantes)} min)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-white/40">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {consulta.pdf_disponivel ? (
                            <button
                              onClick={() => handleBaixarPDF(consulta.id)}
                              disabled={downloadingId === consulta.id}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-medium"
                            >
                              {downloadingId === consulta.id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />}
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
