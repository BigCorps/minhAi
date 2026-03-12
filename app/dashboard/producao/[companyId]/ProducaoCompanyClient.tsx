'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { usePlayText } from '@/hooks/usePlayText';
import FichaProducaoDisplay from '@/components/assistant/FichaProducaoDisplay';
import IngredientesClient from '@/components/dashboard/producao/IngredientesClient';
import FichaConversacionalDisplay from '@/components/assistant/FichaConversacionalDisplay';

interface Ingrediente {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number | null;
  custo_estimado: boolean;
}

interface Ficha {
  id: string;
  nome: string;
  descricao: string | null;
  rendimento: number;
  unidade_rendimento: string;
  preco_venda_sugerido: number | null;
  custo_total: number | null;
  margem_lucro: number | null;
  is_active: boolean;
  is_ficha_preparo: boolean;
  created_at: string;
  producao_ingredientes: Ingrediente[];
}

interface ProducaoCompanyClientProps {
  company: { id: string; name: string; slug: string };
  fichas: Ficha[];
  stats: { totalFichas: number; ativas: number; comCusto: number };
}

function IngredienteGerado({ fichaId, isDark }: { fichaId: string; isDark: boolean }) {
  const supabase = createClient();
  const [ingrediente, setIngrediente] = useState<{
    nome: string;
    preco_por_unidade: number;
    unidade: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('producao_ingredientes')
      .select('nome, preco_por_unidade, unidade')
      .eq('ficha_id', fichaId)
      .eq('tipo', 'produzido')
      .maybeSingle()
      .then(({ data }) => {
        setIngrediente(data);
        setLoading(false);
      });
  }, [fichaId]);

  if (loading) return (
    <p className="text-xs text-gray-400 dark:text-white/30 py-1">Carregando ingrediente...</p>
  );
  if (!ingrediente) return (
    <p className="text-xs text-gray-400 dark:text-white/30 py-1">Ingrediente ainda não gerado.</p>
  );

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      background: isDark ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.05)',
      border: `1px solid ${isDark ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.15)'}`,
      borderRadius: 8,
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#a855f7' }}>
          {ingrediente.nome}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
          R$ {ingrediente.preco_por_unidade.toFixed(2).replace('.', ',')}/{ingrediente.unidade}
        </p>
      </div>
      <span style={{
        padding: '4px 8px',
        background: 'rgba(168,85,247,0.2)',
        color: '#a855f7',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
      }}>
        PRODUZIDO
      </span>
    </div>
  );
}

export default function ProducaoCompanyClient({
  company,
  fichas: initialFichas,
  stats: initialStats,
}: ProducaoCompanyClientProps) {
  const [fichas, setFichas] = useState(initialFichas);
  const [stats, setStats] = useState(initialStats);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'ativas' | 'inativas'>('todas');
  const [activeTab, setActiveTab] = useState<'fichas' | 'ingredientes'>('fichas');
  const [tipoFicha, setTipoFicha] = useState<'produtos' | 'preparos'>('produtos');
  const [novaFichaTipo, setNovaFichaTipo] = useState<'produto' | 'preparo'>('produto');
  const supabase = createClient();
  const { playText, stopAudio } = usePlayText();
  const [showNovaFicha, setShowNovaFicha] = useState(false);
  const [pageTheme, setPageTheme] = useState<'dark' | 'light'>('light');
  const isDark = pageTheme === 'dark';
  const [showConversacional, setShowConversacional] = useState(false);

  useEffect(() => {
    const detectTheme = () => {
      const dark = document.documentElement.classList.contains('dark');
      setPageTheme(dark ? 'dark' : 'light');
    };
    detectTheme();
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  async function handleToggleAtivo(fichaId: string, current: boolean) {
    setLoadingId(fichaId);
    const { error } = await supabase
      .from('producao_fichas')
      .update({ is_active: !current })
      .eq('id', fichaId);

    if (!error) {
      const updated = fichas.map(f => f.id === fichaId ? { ...f, is_active: !current } : f);
      setFichas(updated);
      setStats({
        totalFichas: updated.length,
        ativas: updated.filter(f => f.is_active).length,
        comCusto: updated.filter(f => f.custo_total !== null).length,
      });
    }
    setLoadingId(null);
  }

  async function handleDelete(fichaId: string) {
    if (!confirm('Tem certeza que deseja excluir esta ficha? Esta ação não pode ser desfeita.')) return;
    setLoadingId(fichaId);
    const { error } = await supabase
      .from('producao_fichas')
      .delete()
      .eq('id', fichaId);

    if (!error) {
      const updated = fichas.filter(f => f.id !== fichaId);
      setFichas(updated);
      setStats({
        totalFichas: updated.length,
        ativas: updated.filter(f => f.is_active).length,
        comCusto: updated.filter(f => f.custo_total !== null).length,
      });
    }
    setLoadingId(null);
  }

  const fichasPorTipo = fichas.filter(f =>
    tipoFicha === 'preparos' ? f.is_ficha_preparo : !f.is_ficha_preparo
  );

  const fichasFiltradas = fichasPorTipo.filter(f => {
    if (filtro === 'ativas') return f.is_active;
    if (filtro === 'inativas') return !f.is_active;
    return true;
  });

  function formatCusto(valor: number | null): string {
    if (valor === null) return '—';
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  }

  function formatMargem(margem: number | null): string {
    if (margem === null) return '—';
    return `${margem.toFixed(1)}%`;
  }

  function getMargemColor(margem: number | null): string {
    if (margem === null) return 'text-gray-400';
    if (margem >= 60) return 'text-green-600 dark:text-green-400';
    if (margem >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getStatusBadge(ficha: Ficha) {
    if (!ficha.is_active)
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50">Inativa</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">Ativa</span>;
  }

  function abrirNovaFicha(tipo: 'produto' | 'preparo') {
    setNovaFichaTipo(tipo);
    setShowNovaFicha(true);
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/producao"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-white/50 hover:text-blue-600 dark:hover:text-blue-400 transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Producao
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {company.name}
          </h2>
          <p className="text-gray-600 dark:text-white/60 mt-1">
            Gerencie fichas tecnicas e custos de receitas
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total de Guias', value: stats.totalFichas, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Guias Ativas',   value: stats.ativas,      color: 'text-green-600 dark:text-green-400' },
            { label: 'Com Custo',      value: stats.comCusto,    color: 'text-purple-600 dark:text-purple-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-5 bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm shadow-sm">
              <p className="text-sm text-gray-500 dark:text-white/50 mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Abas unificadas */}
        <div className="flex gap-0 mb-6 border-b border-gray-200 dark:border-white/10">
          <button
            onClick={() => { setActiveTab('fichas'); setTipoFicha('produtos'); }}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === 'fichas' && tipoFicha === 'produtos'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
            }`}
          >
            Produtos Finais
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'fichas' && tipoFicha === 'produtos'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                : 'bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-white/30'
            }`}>
              {fichas.filter(f => !f.is_ficha_preparo).length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('fichas'); setTipoFicha('preparos'); }}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === 'fichas' && tipoFicha === 'preparos'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
            }`}
          >
            Fichas de Preparo
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'fichas' && tipoFicha === 'preparos'
                ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'
                : 'bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-white/30'
            }`}>
              {fichas.filter(f => f.is_ficha_preparo).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ingredientes')}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === 'ingredientes'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
            }`}
          >
            Ingredientes Base
          </button>
        </div>

        {/* Aba: Ingredientes */}
        {activeTab === 'ingredientes' && (
          <IngredientesClient companyId={company.id} theme={pageTheme} />
        )}

        {/* Aba: Fichas */}
        {activeTab === 'fichas' && (
          <>
{/* Toolbar */}
<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
  <div className="flex gap-2">
    {(['todas', 'ativas', 'inativas'] as const).map(f => (
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
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-400 dark:text-white/40">
      {fichasFiltradas.length} ficha{fichasFiltradas.length !== 1 ? 's' : ''}
    </span>

    {/* ✅ NOVO: Criar por Conversa */}
    <button
      onClick={() => setShowConversacional(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)' }}
    >
      <span className="text-sm leading-none">💬</span>
      Criar por Conversa
    </button>

    {/* Botão existente: Nova Guia */}
    <button
      onClick={() => abrirNovaFicha(tipoFicha === 'preparos' ? 'preparo' : 'produto')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
      style={{ background: tipoFicha === 'preparos' ? '#7c3aed' : '#2563eb' }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14"/><path d="M12 5v14"/>
      </svg>
      {tipoFicha === 'preparos' ? 'Nova Ficha de Preparo' : 'Nova Guia'}
    </button>
  </div>
</div>

            {/* Lista de fichas */}
            <div className="rounded-xl bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm shadow-sm overflow-hidden">
              {fichasFiltradas.length === 0 ? (
                <div className="py-16 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-white/20" />
                  <p className="text-gray-500 dark:text-white/40 font-medium">
                    {tipoFicha === 'preparos' ? 'Nenhuma ficha de preparo encontrada' : 'Nenhuma guia encontrada'}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-white/30 mt-1">
                    {tipoFicha === 'preparos'
                      ? 'Crie fichas de preparo para ingredientes semielaborados como molhos, massas e recheios'
                      : 'As guias sao criadas pelo assistente de voz dizendo "criar guia" ou "nova receita"'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-white/5">
                  {fichasFiltradas.map(ficha => (
                    <div key={ficha.id}>

                      {/* Linha principal */}
                      <div className="px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">

                          {/* Nome + status */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white truncate">
                                {ficha.nome}
                              </span>
                              {getStatusBadge(ficha)}
                              {ficha.is_ficha_preparo && (
                                <span style={{
                                  padding: '2px 8px',
                                  background: 'rgba(168,85,247,0.15)',
                                  color: '#a855f7',
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}>
                                  PREPARO
                                </span>
                              )}
                              {ficha.producao_ingredientes?.some(i => i.custo_estimado) && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
                                  Preco estimado
                                </span>
                              )}
                            </div>
                            {ficha.descricao && (
                              <p className="text-xs text-gray-500 dark:text-white/40 truncate">{ficha.descricao}</p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
                              Rendimento: {ficha.rendimento} {ficha.unidade_rendimento} ·{' '}
                              {ficha.producao_ingredientes?.length ?? 0} ingrediente{(ficha.producao_ingredientes?.length ?? 0) !== 1 ? 's' : ''}
                            </p>
                          </div>

                          {/* Custo e margem */}
                          <div className="hidden sm:flex flex-col items-end gap-1 min-w-[110px]">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCusto(ficha.custo_total)}
                            </span>
                            {ficha.is_ficha_preparo ? (
                              ficha.custo_total !== null && ficha.rendimento > 0 && (
                                <span className="text-xs font-medium" style={{ color: '#a855f7' }}>
                                  {formatCusto(ficha.custo_total / ficha.rendimento)}/{ficha.unidade_rendimento}
                                </span>
                              )
                            ) : (
                              <>
                                <span className={`text-xs font-medium ${getMargemColor(ficha.margem_lucro)}`}>
                                  Margem: {formatMargem(ficha.margem_lucro)}
                                </span>
                                {ficha.preco_venda_sugerido && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400">
                                    Venda: {formatCusto(ficha.preco_venda_sugerido)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Acoes */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedId(expandedId === ficha.id ? null : ficha.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400 dark:text-white/40"
                              title="Ver ingredientes"
                            >
                              {expandedId === ficha.id
                                ? <ChevronUp className="w-4 h-4" />
                                : <ChevronDown className="w-4 h-4" />
                              }
                            </button>

                            <button
                              onClick={() => handleToggleAtivo(ficha.id, ficha.is_active)}
                              disabled={loadingId === ficha.id}
                              title={ficha.is_active ? 'Desativar ficha' : 'Ativar ficha'}
                              className={`p-1.5 rounded-lg transition-all text-xs font-medium px-2 py-1 ${
                                loadingId === ficha.id
                                  ? 'opacity-50 cursor-not-allowed'
                                  : ficha.is_active
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-white/40'
                              }`}
                            >
                              {loadingId === ficha.id
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : ficha.is_active ? 'Ativa' : 'Inativa'
                              }
                            </button>

                            <button
                              onClick={() => handleDelete(ficha.id)}
                              disabled={loadingId === ficha.id}
                              title="Excluir ficha"
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Custo mobile */}
                        <div className="sm:hidden mt-2 flex items-center gap-4 text-xs">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            Custo: {formatCusto(ficha.custo_total)}
                          </span>
                          {ficha.is_ficha_preparo ? (
                            ficha.custo_total !== null && ficha.rendimento > 0 && (
                              <span style={{ color: '#a855f7' }}>
                                {formatCusto(ficha.custo_total / ficha.rendimento)}/{ficha.unidade_rendimento}
                              </span>
                            )
                          ) : (
                            <>
                              <span className={getMargemColor(ficha.margem_lucro)}>
                                Margem: {formatMargem(ficha.margem_lucro)}
                              </span>
                              {ficha.preco_venda_sugerido && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  Venda: {formatCusto(ficha.preco_venda_sugerido)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expandido */}
                      {expandedId === ficha.id && (
                        <div className="px-6 pb-4 bg-gray-50/80 dark:bg-white/3">

                          {ficha.is_ficha_preparo && (
                            <div className="mb-4 mt-3">
                              <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2">
                                Ingrediente Gerado
                              </p>
                              <IngredienteGerado fichaId={ficha.id} isDark={isDark} />
                            </div>
                          )}

                          {ficha.producao_ingredientes?.length > 0 && (
                            <>
                              <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3 mt-3">
                                Ingredientes
                              </p>
                              <div className="grid sm:grid-cols-2 gap-2">
                                {ficha.producao_ingredientes.map(ing => (
                                  <div
                                    key={ing.id}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      {ing.custo_estimado && (
                                        <span title="Preco estimado pela IA" className="text-yellow-500 text-xs">!</span>
                                      )}
                                      <span className="text-gray-900 dark:text-white font-medium">{ing.nome}</span>
                                      <span className="text-gray-400 dark:text-white/40">
                                        {ing.quantidade} {ing.unidade}
                                      </span>
                                    </div>
                                    <span className="text-gray-600 dark:text-white/60 font-mono text-xs">
                                      {ing.custo_unitario !== null
                                        ? `R$ ${(ing.custo_unitario * ing.quantidade).toFixed(2).replace('.', ',')}`
                                        : '—'
                                      }
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer contextual */}
            {tipoFicha === 'preparos' ? (
              <div className="mt-6 p-4 rounded-xl border" style={{
                background: isDark ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.05)',
                borderColor: isDark ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.15)',
              }}>
                <p className="text-sm" style={{ color: isDark ? '#e9d5ff' : '#7c3aed' }}>
                  <strong>Fichas de Preparo</strong> produzem ingredientes automaticamente.
                  O custo por unidade e calculado e alimenta o cadastro de ingredientes,
                  propagando para todas as fichas que os utilizam.
                </p>
              </div>
            ) : (
              <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Para criar ou editar guia, use o assistente de voz e diga{' '}
                  <strong>"criar guia"</strong> ou <strong>"nova receita"</strong>.
                  Guias com preco estimado possuem valores aproximados pela IA — confirme com seus fornecedores.
                </p>
              </div>
            )}
          </>
        )}

      </div>

      {showConversacional && (
  <FichaConversacionalDisplay
    data={{
      companyId: company.id,
      fichaType: tipoFicha === 'preparos' ? 'preparo' : 'produto',
    }}
    onClose={() => {
      stopAudio();
      setShowConversacional(false);
      window.location.reload();
    }}
    playText={playText}
    theme={pageTheme}
  />
)}

      {showNovaFicha && (
        <FichaProducaoDisplay
          data={{ companyId: company.id, fichaType: novaFichaTipo }}
          onClose={() => {
            stopAudio();
            setShowNovaFicha(false);
            window.location.reload();
          }}
          playText={playText}
          theme={pageTheme}
        />
      )}
    </div>
  );
}
