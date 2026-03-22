'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ClipboardList, RefreshCw, Trash2, ChevronDown, ChevronUp, Pencil, Check, X as XIcon } from 'lucide-react';
import { usePlayText } from '@/hooks/usePlayText';
import FichaProducaoDisplay from '@/components/assistant/FichaProducaoDisplay';
import IngredientesClient from '@/components/dashboard/producao/IngredientesClient';
import FichaConversacionalDisplay from '@/components/assistant/FichaConversacionalDisplay';
import { useAssistant } from '@/contexts/AssistantContext';
import { useRouter } from 'next/navigation';
import { ProducaoTag } from '@/lib/types/producao';
import TagSelector from '@/components/producao/TagSelector';

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
  preco_venda: number | null;
  preco_venda_sugerido: number | null;
  custo_total: number | null;
  margem_lucro: number | null;
  is_active: boolean;
  is_ficha_preparo: boolean;
  created_at: string;
  tags: ProducaoTag[];
  producao_ingredientes: Ingrediente[];
}

interface ProducaoCompanyClientProps {
  company: { id: string; name: string; slug: string };
  fichas: Ficha[];
  stats: { totalFichas: number; ativas: number; comCusto: number };
}

function getTagColor(tag: ProducaoTag): { bg: string; text: string } {
  if (tag.startsWith('função:')) {
    const map: Record<string, { bg: string; text: string }> = {
      'função:produto': { bg: 'rgba(37,99,235,0.15)',  text: '#2563eb' },
      'função:preparo': { bg: 'rgba(124,58,237,0.15)', text: '#7c3aed' },
      'função:combo':   { bg: 'rgba(234,88,12,0.15)',  text: '#ea580c' },
      'função:insumo':  { bg: 'rgba(71,85,105,0.15)',  text: '#475569' },
    };
    return map[tag] ?? { bg: 'rgba(37,99,235,0.1)', text: '#2563eb' };
  }
  if (tag.startsWith('origem:')) return { bg: 'rgba(22,163,74,0.12)', text: '#16a34a' };
  if (tag.startsWith('vendável:')) {
    return tag === 'vendável:sim'
      ? { bg: 'rgba(234,179,8,0.15)',   text: '#b45309' }
      : { bg: 'rgba(100,116,139,0.15)', text: '#64748b' };
  }
  return { bg: 'rgba(100,116,139,0.1)', text: '#64748b' };
}

const FILTRO_TAG_OPTIONS = [
  { tag: 'função:produto'   as ProducaoTag, label: 'Produto',   icon: ClipboardList, group: 'função'   as const },
  { tag: 'função:preparo'   as ProducaoTag, label: 'Preparo',   icon: ClipboardList, group: 'função'   as const },
  { tag: 'função:combo'     as ProducaoTag, label: 'Combo',     icon: ClipboardList, group: 'função'   as const },
  { tag: 'vendável:sim'     as ProducaoTag, label: 'Vendável',  icon: ClipboardList, group: 'vendável' as const },
  { tag: 'origem:comprado'  as ProducaoTag, label: 'Comprado',  icon: ClipboardList, group: 'origem'   as const },
  { tag: 'origem:produzido' as ProducaoTag, label: 'Produzido', icon: ClipboardList, group: 'origem'   as const },
];

function IngredienteGerado({ fichaId, isDark }: { fichaId: string; isDark: boolean }) {
  const supabase = createClient();
  const [ingrediente, setIngrediente] = useState<{ nome: string; preco_por_unidade: number; unidade: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('producao_ingredientes')
      .select('nome, preco_por_unidade, unidade')
      .eq('ficha_id', fichaId)
      .eq('tipo', 'produzido')
      .maybeSingle()
      .then(({ data }) => { setIngrediente(data); setLoading(false); });
  }, [fichaId]);

  if (loading) return <p className="text-xs text-gray-400 dark:text-white/30 py-1">Carregando ingrediente...</p>;
  if (!ingrediente) return <p className="text-xs text-gray-400 dark:text-white/30 py-1">Ingrediente ainda não gerado.</p>;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
      background: isDark ? 'rgba(37,99,235,0.1)' : 'rgba(37,99,235,0.05)',
      border: `1px solid ${isDark ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.15)'}`,
      borderRadius: 8,
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#2563eb' }}>{ingrediente.nome}</p>
        <p style={{ margin: 0, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
          R$ {ingrediente.preco_por_unidade.toFixed(2).replace('.', ',')}/{ingrediente.unidade}
        </p>
      </div>
      <span style={{ padding: '4px 8px', background: 'rgba(37,99,235,0.2)', color: '#2563eb', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
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
  const [filtroTags, setFiltroTags] = useState<ProducaoTag[]>([]);
  const [activeTab, setActiveTab] = useState<'fichas' | 'ingredientes'>('fichas');
  const [tipoFicha, setTipoFicha] = useState<'produtos' | 'preparos'>('produtos');
  const [novaFichaTipo, setNovaFichaTipo] = useState<'produto' | 'preparo'>('produto');
  const supabase = createClient();
  const { playText, stopAudio } = usePlayText();
  const [showNovaFicha, setShowNovaFicha] = useState(false);
  const [pageTheme, setPageTheme] = useState<'dark' | 'light'>('light');
  const isDark = pageTheme === 'dark';
  const [showConversacional, setShowConversacional] = useState(false);
  const { selectedAssistantId } = useAssistant();
  const router = useRouter();

  // ── Edição inline ────────────────────────────────────────────────
  const [editandoPreco, setEditandoPreco] = useState<string | null>(null);
  const [precoEditando, setPrecoEditando] = useState<string>('');
  const [editandoIngrediente, setEditandoIngrediente] = useState<string | null>(null);
  const [custoEditando, setCustoEditando] = useState<string>('');

  useEffect(() => {
    if (selectedAssistantId && selectedAssistantId !== company.id) {
      router.replace(`/dashboard/producao/${selectedAssistantId}`);
    }
  }, [selectedAssistantId]);

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
    const { error } = await supabase.from('producao_fichas').update({ is_active: !current }).eq('id', fichaId);
    if (!error) {
      const updated = fichas.map(f => f.id === fichaId ? { ...f, is_active: !current } : f);
      setFichas(updated);
      setStats({
        totalFichas: updated.length,
        ativas: updated.filter(f => f.is_active).length,
        comCusto: updated.filter(f => f.custo_total !== null && (f.custo_total as number) > 0).length,
      });
    }
    setLoadingId(null);
  }

  async function handleDelete(fichaId: string) {
    if (!confirm('Tem certeza que deseja excluir esta ficha? Esta ação não pode ser desfeita.')) return;
    setLoadingId(fichaId);
    const { error } = await supabase.from('producao_fichas').delete().eq('id', fichaId);
    if (!error) {
      const updated = fichas.filter(f => f.id !== fichaId);
      setFichas(updated);
      setStats({
        totalFichas: updated.length,
        ativas: updated.filter(f => f.is_active).length,
        comCusto: updated.filter(f => f.custo_total !== null && (f.custo_total as number) > 0).length,
      });
    }
    setLoadingId(null);
  }

  // ── Salvar preço de venda ────────────────────────────────────────
  async function salvarPrecoVenda(fichaId: string) {
    const novoPreco = parseFloat(precoEditando.replace(',', '.'));
    if (isNaN(novoPreco) || novoPreco <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    const { error } = await supabase
      .from('producao_fichas')
      .update({ preco_venda: novoPreco })
      .eq('id', fichaId);

    if (error) {
      console.error('Erro ao salvar preço:', error);
      alert('Erro ao salvar preço. Tente novamente.');
      return;
    }

    // Aguardar trigger recalcular margem
    await new Promise(r => setTimeout(r, 600));
    const { data } = await supabase
      .from('producao_fichas')
      .select('preco_venda, preco_venda_sugerido, margem_lucro')
      .eq('id', fichaId)
      .single();

    setFichas(prev => prev.map(f =>
      f.id === fichaId
        ? {
            ...f,
            preco_venda: data?.preco_venda ?? novoPreco,
            preco_venda_sugerido: data?.preco_venda_sugerido ?? null,
            margem_lucro: data?.margem_lucro ?? null,
          }
        : f
    ));
    setEditandoPreco(null);
  }

  // ── Salvar custo de ingrediente ──────────────────────────────────
  async function salvarCustoIngrediente(fichaId: string, itemId: string) {
    const novoCusto = parseFloat(custoEditando.replace(',', '.'));
    if (isNaN(novoCusto) || novoCusto < 0) {
      alert('Informe um valor válido.');
      return;
    }

    const { data: item } = await supabase
      .from('producao_ficha_itens')
      .select('ingrediente_id')
      .eq('id', itemId)
      .single();

    if (item?.ingrediente_id) {
      await supabase
        .from('producao_ingredientes')
        .update({ preco_por_unidade: novoCusto })
        .eq('id', item.ingrediente_id);
    } else {
      await supabase
        .from('producao_ficha_itens')
        .update({ preco_temp: novoCusto })
        .eq('id', itemId);
    }

    await new Promise(r => setTimeout(r, 600));
    const { data: fichaAtualizada } = await supabase
      .from('producao_fichas')
      .select('custo_total, margem_lucro, preco_venda_sugerido')
      .eq('id', fichaId)
      .single();

    setFichas(prev => prev.map(f => {
      if (f.id !== fichaId) return f;
      return {
        ...f,
        custo_total: fichaAtualizada?.custo_total ?? f.custo_total,
        margem_lucro: fichaAtualizada?.margem_lucro ?? f.margem_lucro,
        preco_venda_sugerido: fichaAtualizada?.preco_venda_sugerido ?? f.preco_venda_sugerido,
        producao_ingredientes: f.producao_ingredientes.map(ing =>
          ing.id === itemId ? { ...ing, custo_unitario: novoCusto } : ing
        ),
      };
    }));

    setEditandoIngrediente(null);
  }

  const fichasPorTipo = fichas.filter(f =>
    tipoFicha === 'preparos' ? f.is_ficha_preparo : !f.is_ficha_preparo
  );

  const fichasFiltradas = fichasPorTipo.filter(f => {
    const passaStatus =
      filtro === 'ativas'   ? f.is_active :
      filtro === 'inativas' ? !f.is_active :
      true;
    const passaTags =
      filtroTags.length === 0 ||
      filtroTags.every(tag => (f.tags ?? []).includes(tag));
    return passaStatus && passaTags;
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

  // Valor a exibir como preço principal: preco_venda (editado) > preco_venda_sugerido (trigger) > custo_total
  function getPrecoDisplay(ficha: Ficha): number | null {
    return ficha.preco_venda ?? ficha.preco_venda_sugerido ?? ficha.custo_total;
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Linha de Produção</h2>
          <p className="text-gray-600 dark:text-white/60 mt-1">Gerencie fichas tecnicas e custos de receitas</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total de Guias', value: stats.totalFichas, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Guias Ativas',   value: stats.ativas,      color: 'text-green-600 dark:text-green-400' },
            { label: 'Com Custo',      value: stats.comCusto,    color: 'text-blue-600 dark:text-blue-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-white/50 mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Abas */}
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
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
            }`}
          >
            Fichas de Preparo
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'fichas' && tipoFicha === 'preparos'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
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

        {activeTab === 'ingredientes' && (
          <IngredientesClient companyId={company.id} theme={pageTheme} />
        )}

        {activeTab === 'fichas' && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
              <div className="flex items-center gap-2 flex-1">
                {(['todas', 'ativas', 'inativas'] as const).map(f => (
                  <button key={f} onClick={() => setFiltro(f)}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      filtro === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/15'
                    }`}>
                    {f}
                  </button>
                ))}
                <span className="text-xs text-gray-400 dark:text-white/40 ml-auto sm:ml-2 whitespace-nowrap">
                  {fichasFiltradas.length} ficha{fichasFiltradas.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowConversacional(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all whitespace-nowrap"
                  style={{ background: '#16a34a' }}>
                  <span className="text-sm leading-none">🔘</span>
                  Auxiliar de Produção
                </button>
                <button onClick={() => abrirNovaFicha(tipoFicha === 'preparos' ? 'preparo' : 'produto')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all whitespace-nowrap"
                  style={{ background: '#2563eb' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="M12 5v14"/>
                  </svg>
                  {tipoFicha === 'preparos' ? 'Nova Ficha de Preparo' : 'Nova Guia'}
                </button>
              </div>
            </div>

            {/* Filtro por tags */}
            <div className="mb-4">
              <TagSelector tags={filtroTags} onChange={setFiltroTags} options={FILTRO_TAG_OPTIONS} theme={pageTheme} />
              {filtroTags.length > 0 && (
                <button onClick={() => setFiltroTags([])}
                  className="mt-2 text-xs text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors">
                  Limpar filtros de tag
                </button>
              )}
            </div>

            {/* Lista de fichas */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
              {fichasFiltradas.length === 0 ? (
                <div className="py-16 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-white/20" />
                  <p className="text-gray-500 dark:text-white/40 font-medium">
                    {tipoFicha === 'preparos' ? 'Nenhuma ficha de preparo encontrada' : 'Nenhuma guia encontrada'}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-white/30 mt-1">
                    {filtroTags.length > 0 ? 'Tente remover alguns filtros de tag' : 'Use o Auxiliar de Produção para criar fichas'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-white/5">
                  {fichasFiltradas.map(ficha => (
                    <div key={ficha.id}>

                      {/* Linha principal */}
                      <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-4">

                          {/* Nome + status + tags */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white truncate">{ficha.nome}</span>
                              {getStatusBadge(ficha)}
                              {ficha.is_ficha_preparo && (
                                <span style={{ padding: '2px 8px', background: 'rgba(37,99,235,0.15)', color: '#2563eb', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                  PREPARO
                                </span>
                              )}
                              {ficha.producao_ingredientes?.some(i => i.custo_estimado) && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
                                  Preco estimado
                                </span>
                              )}
                            </div>
                            {(ficha.tags ?? []).length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                {(ficha.tags ?? []).map(tag => {
                                  const colors = getTagColor(tag);
                                  return (
                                    <span key={tag} style={{ padding: '1px 6px', background: colors.bg, color: colors.text, borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>
                                      {tag.split(':')[1]}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {ficha.descricao && <p className="text-xs text-gray-500 dark:text-white/40 truncate">{ficha.descricao}</p>}
                            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
                              Rendimento: {ficha.rendimento} {ficha.unidade_rendimento} · {ficha.producao_ingredientes?.length ?? 0} ingrediente{(ficha.producao_ingredientes?.length ?? 0) !== 1 ? 's' : ''}
                            </p>
                          </div>

                          {/* Custo e margem — desktop */}
                          <div className="hidden sm:flex flex-col items-end gap-1 min-w-[150px]">
                            {ficha.is_ficha_preparo ? (
                              <>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCusto(ficha.custo_total)}</span>
                                {ficha.custo_total !== null && ficha.rendimento > 0 && (
                                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                    {formatCusto(ficha.custo_total / ficha.rendimento)}/{ficha.unidade_rendimento}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                {/* Preço de venda editável */}
                                {editandoPreco === ficha.id ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500 dark:text-white/50">R$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={precoEditando}
                                      onChange={e => setPrecoEditando(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') salvarPrecoVenda(ficha.id);
                                        if (e.key === 'Escape') setEditandoPreco(null);
                                      }}
                                      autoFocus
                                      className="w-20 px-2 py-0.5 text-sm font-semibold border rounded bg-white dark:bg-slate-700 border-blue-400 text-gray-900 dark:text-white focus:outline-none"
                                    />
                                    <button onClick={() => salvarPrecoVenda(ficha.id)} className="text-green-500 hover:text-green-600 transition-colors">
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setEditandoPreco(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                      <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {formatCusto(getPrecoDisplay(ficha))}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditandoPreco(ficha.id);
                                        setPrecoEditando(String(ficha.preco_venda ?? ficha.preco_venda_sugerido ?? ''));
                                      }}
                                      className="text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                      title="Editar preço de venda"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                <span className={`text-xs font-medium ${getMargemColor(ficha.margem_lucro)}`}>
                                  Margem: {formatMargem(ficha.margem_lucro)}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-white/40">
                                  Custo: {formatCusto(ficha.custo_total)}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1">
                            <button onClick={() => setExpandedId(expandedId === ficha.id ? null : ficha.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400 dark:text-white/40"
                              title="Ver ingredientes">
                              {expandedId === ficha.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleToggleAtivo(ficha.id, ficha.is_active)} disabled={loadingId === ficha.id}
                              title={ficha.is_active ? 'Desativar ficha' : 'Ativar ficha'}
                              className={`p-1.5 rounded-lg transition-all text-xs font-medium px-2 py-1 ${
                                loadingId === ficha.id ? 'opacity-50 cursor-not-allowed'
                                  : ficha.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-white/40'
                              }`}>
                              {loadingId === ficha.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : ficha.is_active ? 'Ativa' : 'Inativa'}
                            </button>
                            <button onClick={() => handleDelete(ficha.id)} disabled={loadingId === ficha.id}
                              title="Excluir ficha"
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Custo mobile */}
                        <div className="sm:hidden mt-2 flex items-center gap-4 text-xs">
                          {ficha.is_ficha_preparo ? (
                            <>
                              <span className="font-semibold text-gray-900 dark:text-white">Custo: {formatCusto(ficha.custo_total)}</span>
                              {ficha.custo_total !== null && ficha.rendimento > 0 && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  {formatCusto(ficha.custo_total / ficha.rendimento)}/{ficha.unidade_rendimento}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatCusto(getPrecoDisplay(ficha))}
                              </span>
                              <span className={getMargemColor(ficha.margem_lucro)}>Margem: {formatMargem(ficha.margem_lucro)}</span>
                              <span className="text-gray-400 dark:text-white/40">Custo: {formatCusto(ficha.custo_total)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expandido */}
                      {expandedId === ficha.id && (
                        <div className="px-6 pb-4 bg-gray-50 dark:bg-slate-900">
                          {ficha.is_ficha_preparo && (
                            <div className="mb-4 mt-3">
                              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Ingrediente Gerado</p>
                              <IngredienteGerado fichaId={ficha.id} isDark={isDark} />
                            </div>
                          )}

                          {ficha.producao_ingredientes?.length > 0 && (
                            <>
                              <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3 mt-3">
                                Ingredientes
                                <span className="ml-2 normal-case font-normal text-gray-400 dark:text-white/30">(clique no lápis para editar o custo unitário)</span>
                              </p>
                              <div className="grid sm:grid-cols-2 gap-2">
                                {ficha.producao_ingredientes.map(ing => (
                                  <div key={ing.id}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-gray-100 dark:border-white/10 text-sm text-gray-900 dark:text-white">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {ing.custo_estimado && (
                                        <span title="Preco estimado pela IA" className="text-yellow-500 text-xs flex-shrink-0">!</span>
                                      )}
                                      <span className="text-gray-900 dark:text-white font-medium truncate">{ing.nome}</span>
                                      <span className="text-gray-400 dark:text-white/40 flex-shrink-0">{ing.quantidade} {ing.unidade}</span>
                                    </div>

                                    {/* Custo editável */}
                                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                      {editandoIngrediente === ing.id ? (
                                        <>
                                          <span className="text-xs text-gray-400 dark:text-white/40">R$</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={custoEditando}
                                            onChange={e => setCustoEditando(e.target.value)}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') salvarCustoIngrediente(ficha.id, ing.id);
                                              if (e.key === 'Escape') setEditandoIngrediente(null);
                                            }}
                                            autoFocus
                                            className="w-16 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-slate-600 border-blue-400 text-gray-900 dark:text-white focus:outline-none"
                                          />
                                          <button onClick={() => salvarCustoIngrediente(ficha.id, ing.id)} className="text-green-500 hover:text-green-600 transition-colors">
                                            <Check className="w-3 h-3" />
                                          </button>
                                          <button onClick={() => setEditandoIngrediente(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <XIcon className="w-3 h-3" />
                                          </button>
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-gray-600 dark:text-white/60 font-mono text-xs">
                                            {ing.custo_unitario !== null
                                              ? `R$ ${(ing.custo_unitario * ing.quantidade).toFixed(2).replace('.', ',')}`
                                              : '—'
                                            }
                                          </span>
                                          <button
                                            onClick={() => {
                                              setEditandoIngrediente(ing.id);
                                              setCustoEditando(String(ing.custo_unitario ?? ''));
                                            }}
                                            className="text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                            title="Editar custo unitário"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
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

            {/* Footer */}
            {tipoFicha === 'preparos' ? (
              <div className="mt-6 p-4 rounded-xl border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Fichas de Preparo</strong> produzem ingredientes automaticamente. O custo por unidade é calculado e alimenta o cadastro de ingredientes, propagando para todas as fichas que os utilizam.
                </p>
              </div>
            ) : (
  <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
    {/* Aviso sobre Vendas - COMPACTO */}
    {fichas.filter(f => !f.is_ficha_preparo).length > 0 && (
      <div className="mb-3 pb-3 border-b border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
            <strong>Produtos praticamente prontos para venda!</strong> Disponibilize-os também na loja virtual e totem do assistente.
          </p>
          <button
            onClick={() => router.push(`/dashboard/vendas/${companyId}`)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-md transition-colors"
          >
            <span>Ir para Vendas</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    )}
    
    {/* Texto original */}
    <p className="text-sm text-blue-800 dark:text-blue-200">
      Para criar ou editar um produto, use o <strong>Auxiliar de Produção</strong> ou manualmente em <strong>Nova Guia</strong>. Clique no lápis azul para editar preço de venda e custo dos ingredientes.
    </p>
  </div>
            )}
          </>
        )}
      </div>

      {showConversacional && (
        <FichaConversacionalDisplay
          data={{ companyId: company.id, fichaType: tipoFicha === 'preparos' ? 'preparo' : 'produto' }}
          onClose={() => { stopAudio(); setShowConversacional(false); window.location.reload(); }}
          playText={playText}
          theme={pageTheme}
        />
      )}

      {showNovaFicha && (
        <FichaProducaoDisplay
          data={{ companyId: company.id, fichaType: novaFichaTipo }}
          onClose={() => { stopAudio(); setShowNovaFicha(false); window.location.reload(); }}
          playText={playText}
          theme={pageTheme}
        />
      )}
    </div>
  );
}
