'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useSearchParams } from 'next/navigation';
import { useAssistant } from '@/contexts/AssistantContext';
import {
  UserPlus,
  Loader2,
  AlertCircle,
  Search,
  Download,
  RefreshCw,
  Fingerprint,
  Camera,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
}

interface Registration {
  id: string;
  company_id: string;
  fields: Record<string, string>;
  biometry_data: any;
  facial_id: string | null;
  created_at: string;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  nome:        'Nome',
  telefone:    'Telefone',
  email:       'E-mail',
  cpf:         'CPF',
  endereco:    'Endereço',
  empresa:     'Empresa',
  cargo:       'Cargo',
  observacoes: 'Observações',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return `${diffDays} dias atrás`;
  } else {
    return date.toLocaleDateString('pt-BR');
  }
}

// ── Componente principal ─────────────────────────────────────────────────────

function CadastrosPageContent() {
  const { selectedAssistantId: selectedCompanyId, selectedAssistantName } = useAssistant();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const supabase = createClient();

  // Carregar cadastros ao mudar empresa
  useEffect(() => {
    if (!selectedCompanyId) {
      setRegistrations([]);
      return;
    }

    loadRegistrations(selectedCompanyId);
  }, [selectedCompanyId]);

  async function loadRegistrations(companyId: string) {
    setLoadingRegistrations(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Erro ao carregar cadastros:', error);
    } finally {
      setLoadingRegistrations(false);
    }
  }

  async function handleRefresh() {
    if (selectedCompanyId) {
      await loadRegistrations(selectedCompanyId);
    }
  }

  // Colunas dinâmicas — extraídas dos dados reais
  const allFieldKeys = [
    ...new Set(registrations.flatMap(r => Object.keys(r.fields ?? {}))),
  ];

  // Filtro de busca — varre todos os valores de fields
  const filtered = registrations.filter(r => {
    if (!search.trim()) return true;
    const haystack = Object.values(r.fields ?? {}).join(' ').toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  // Ordenação inline ao clicar no cabeçalho de data
  const sorted = [...filtered].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? -diff : diff;
  });

  // Exportar CSV
  function exportCSV() {
    if (!sorted.length) return;
    const headers = ['Data', ...allFieldKeys.map(k => FIELD_LABELS[k] ?? k), 'Biometria', 'Facial'];
    const rows = sorted.map(r => [
      new Date(r.created_at).toLocaleString('pt-BR'),
      ...allFieldKeys.map(k => r.fields?.[k] ?? ''),
      r.biometry_data ? 'Sim' : 'Pendente',
      r.facial_id ?? 'Pendente',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadastros_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="mb-8">
            <div className="flex items-end justify-between gap-4 mb-6">

              {/* Lado esquerdo */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 whitespace-nowrap">
                  Cadastros
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Registros coletados pelo assistente {selectedAssistantName} .
                </p>
              </div>
            </div>
          </div>

          {/* ── Estado: nenhum assistente selecionado ───────────────────────── */}
          {!selectedCompanyId && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
              <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Selecione um Assistente
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Escolha um assistente acima para visualizar os cadastros
              </p>
            </div>
          )}

          {/* ── Conteúdo principal ──────────────────────────────────────────── */}
          {selectedCompanyId && (
            <>
              {/* Barra de ações */}
              <div className="mb-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3">

                  {/* Busca */}
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar por nome, telefone, e-mail..."
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Contador */}
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {sorted.length} registro{sorted.length !== 1 ? 's' : ''}
                  </span>

                  {/* Atualizar */}
                  <button
                    onClick={handleRefresh}
                    disabled={loadingRegistrations}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingRegistrations ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>

                  {/* Exportar */}
                  <button
                    onClick={exportCSV}
                    disabled={sorted.length === 0}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" />
                    Exportar CSV
                  </button>
                </div>
              </div>

              {/* ── Loading ────────────────────────────────────────────────── */}
              {loadingRegistrations && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              )}

              {/* ── Lista vazia ────────────────────────────────────────────── */}
              {!loadingRegistrations && sorted.length === 0 && (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                  <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-40" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {search ? 'Nenhum resultado encontrado' : 'Nenhum cadastro ainda'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {search
                      ? 'Tente outros termos de busca'
                      : 'Os cadastros coletados pelo assistente aparecerão aqui'}
                  </p>
                </div>
              )}

              {/* ── Tabela ─────────────────────────────────────────────────── */}
              {!loadingRegistrations && sorted.length > 0 && (
                <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                          {/* Data — clicável para ordenar */}
                          <th
                            className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition"
                            onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
                          >
                            <span className="flex items-center gap-1">
                              Data
                              {sortOrder === 'desc'
                                ? <ChevronDown className="w-3.5 h-3.5" />
                                : <ChevronUp className="w-3.5 h-3.5" />
                              }
                            </span>
                          </th>

                          {/* Colunas dinâmicas */}
                          {allFieldKeys.map(k => (
                            <th key={k} className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {FIELD_LABELS[k] ?? k}
                            </th>
                          ))}

                          {/* Biometria / Facial — reservadas */}
                          <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Fingerprint className="w-3.5 h-3.5" />
                              Biometria
                            </span>
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Camera className="w-3.5 h-3.5" />
                              Facial
                            </span>
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {sorted.map(r => (
                          <tr
                            key={r.id}
                            className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer"
                            onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                          >
                            {/* Data */}
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {formatDate(r.created_at)}
                            </td>

                            {/* Campos dinâmicos */}
                            {allFieldKeys.map(k => (
                              <td key={k} className="px-4 py-3 text-gray-900 dark:text-white max-w-[200px] truncate">
                                {r.fields?.[k] ?? (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </td>
                            ))}

                            {/* Biometria */}
                            <td className="px-4 py-3">
                              {r.biometry_data ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                  <Fingerprint className="w-3 h-3" />
                                  Registrada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500">
                                  Pendente
                                </span>
                              )}
                            </td>

                            {/* Facial */}
                            <td className="px-4 py-3">
                              {r.facial_id ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                  <Camera className="w-3 h-3" />
                                  Registrada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Rodapé da tabela */}
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {sorted.length} de {registrations.length} cadastro{registrations.length !== 1 ? 's' : ''}
                      {search && ` · filtrado por "${search}"`}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1 opacity-50">
                        <Fingerprint className="w-3 h-3" />
                        Biometria — em breve
                      </span>
                      <span className="flex items-center gap-1 opacity-50">
                        <Camera className="w-3 h-3" />
                        Facial — em breve
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Export com Suspense (obrigatório por useSearchParams) ────────────────────

export default function CadastrosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <CadastrosPageContent />
    </Suspense>
  );
}
