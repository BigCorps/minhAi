'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Plus, Trash2, Search, AlertCircle } from 'lucide-react';
import { ProducaoTag } from '@/lib/types/producao'; // ✅ v2
import TagSelector from '@/components/producao/TagSelector'; // ✅ v2

type TipoIngrediente = 'direto' | 'beneficiado' | 'produzido';

interface Ingrediente {
  id: string;
  nome: string;
  preco_por_unidade: number;
  unidade: string;
  categoria?: string;
  tipo: TipoIngrediente;
  tags: ProducaoTag[]; // ✅ v2
  fichas_usando?: number;
}

interface IngredientesClientProps {
  companyId: string;
  theme?: 'dark' | 'light';
}

// ── Badge de tipo ─────────────────────────────────────────────────────────────
function TipoBadge({ tipo }: { tipo: TipoIngrediente }) {
  const map: Record<TipoIngrediente, { label: string; bg: string; color: string }> = {
    direto:      { label: 'Direto',      bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
    beneficiado: { label: 'Beneficiado', bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
    produzido:   { label: 'Produzido',   bg: 'rgba(37,99,235,0.15)',   color: '#2563eb' },
  };
  const t = map[tipo] ?? map.direto;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      background: t.bg,
      color: t.color,
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
    }}>
      {t.label}
    </span>
  );
}

// ✅ v2: Badge individual de tag
function TagBadge({ tag }: { tag: ProducaoTag }) {
  const group = tag.split(':')[0];
  const colorMap: Record<string, { bg: string; color: string }> = {
    origem:   { bg: 'rgba(22,163,74,0.12)',   color: '#16a34a' },
    função:   { bg: 'rgba(37,99,235,0.12)',   color: '#2563eb' },
    vendável: { bg: 'rgba(234,179,8,0.12)',   color: '#b45309' },
  };
  const c = colorMap[group] ?? { bg: 'rgba(100,116,139,0.1)', color: '#64748b' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 6px',
      background: c.bg,
      color: c.color,
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '600',
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {tag.split(':')[1]}
    </span>
  );
}

// ✅ v2: Opções de filtro por tag para ingredientes
const FILTRO_TAG_OPTIONS_ING = [
  { tag: 'origem:comprado'   as ProducaoTag, label: 'Comprado',   icon: Search, group: 'origem' as const },
  { tag: 'origem:produzido'  as ProducaoTag, label: 'Produzido',  icon: Search, group: 'origem' as const },
  { tag: 'origem:beneficiado'as ProducaoTag, label: 'Beneficiado',icon: Search, group: 'origem' as const },
  { tag: 'função:insumo'     as ProducaoTag, label: 'Insumo',     icon: Search, group: 'função' as const },
];

export default function IngredientesClient({ companyId, theme = 'dark' }: IngredientesClientProps) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoIngrediente | 'todos'>('todos');
  const [filtroTags, setFiltroTags] = useState<ProducaoTag[]>([]); // ✅ v2

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const [novoIngrediente, setNovoIngrediente] = useState({
    nome: '', preco: '', unidade: 'kg', tipo: 'direto' as TipoIngrediente,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const C = {
    bg:          isDark ? '#1e293b' : '#ffffff',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    text:        isDark ? '#f1f5f9' : '#0f172a',
    textMuted:   isDark ? '#94a3b8' : '#64748b',
    border:      isDark ? '#475569' : '#e2e8f0',
    accent:   '#3b82f6',
    success:  '#22c55e',
    danger:   '#ef4444',
    warning:  '#f59e0b',
  };

  // ── Carregar ────────────────────────────────────────────────────────────────
  const carregarIngredientes = async () => {
    try {
      setLoading(true);

      const { data: ings, error } = await supabase
        .from('producao_ingredientes')
        .select('id, nome, preco_por_unidade, unidade, categoria, tipo, tags') // ✅ v2: inclui tags
        .eq('company_id', companyId)
        .order('nome');

      if (error) throw error;

      const comContador = await Promise.all(
        (ings || []).map(async (ing) => {
          const { count } = await supabase
            .from('producao_ficha_itens')
            .select('id', { count: 'exact', head: true })
            .eq('ingrediente_id', ing.id);
          return {
            ...ing,
            tipo: (ing.tipo ?? 'direto') as TipoIngrediente,
            tags: (ing.tags ?? []) as ProducaoTag[], // ✅ v2: fallback para array vazio
            fichas_usando: count || 0,
          };
        })
      );

      setIngredientes(comContador);
    } catch (err) {
      console.error('Erro ao carregar ingredientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarIngredientes(); }, [companyId]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // ── Editar preço ─────────────────────────────────────────────────────────────
  const iniciarEdicao = (ing: Ingrediente) => {
    setEditingId(ing.id);
    setEditValue(ing.preco_por_unidade.toString());
  };

  const salvarPreco = async (id: string) => {
    const novoPreco = parseFloat(editValue);
    if (isNaN(novoPreco) || novoPreco < 0) { setEditingId(null); return; }

    try {
      setUpdatingIds(prev => new Set(prev).add(id));
      const { error } = await supabase
        .from('producao_ingredientes')
        .update({ preco_por_unidade: novoPreco })
        .eq('id', id);
      if (error) throw error;

      setIngredientes(prev =>
        prev.map(ing => ing.id === id ? { ...ing, preco_por_unidade: novoPreco } : ing)
      );
      setTimeout(() => {
        setUpdatingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      }, 1500);
    } catch (err) {
      console.error('Erro ao atualizar preço:', err);
      alert('Erro ao atualizar preço');
    } finally {
      setEditingId(null);
    }
  };

  // ── Editar tipo ──────────────────────────────────────────────────────────────
  const salvarTipo = async (id: string, novoTipo: TipoIngrediente) => {
    try {
      const { error } = await supabase
        .from('producao_ingredientes')
        .update({ tipo: novoTipo })
        .eq('id', id);
      if (error) throw error;

      setIngredientes(prev =>
        prev.map(ing => ing.id === id ? { ...ing, tipo: novoTipo } : ing)
      );
    } catch (err) {
      console.error('Erro ao atualizar tipo:', err);
      alert('Erro ao atualizar tipo');
    }
  };

  // ── Adicionar ────────────────────────────────────────────────────────────────
  const adicionarIngrediente = async () => {
    if (!novoIngrediente.nome.trim() || !novoIngrediente.preco.trim()) {
      alert('Preencha nome e preço');
      return;
    }
    const preco = parseFloat(novoIngrediente.preco);
    if (isNaN(preco) || preco < 0) { alert('Preço inválido'); return; }

    try {
      const { error } = await supabase
        .from('producao_ingredientes')
        .insert({
          company_id: companyId,
          nome: novoIngrediente.nome.trim(),
          preco_por_unidade: preco,
          unidade: novoIngrediente.unidade,
          tipo: novoIngrediente.tipo,
          // ✅ v2: trigger do banco auto-preenche tags com base no tipo,
          // mas não precisamos enviar aqui — o trigger cuida disso
        });
      if (error) throw error;

      setNovoIngrediente({ nome: '', preco: '', unidade: 'kg', tipo: 'direto' });
      setShowAddForm(false);
      await carregarIngredientes();
    } catch (err) {
      console.error('Erro ao adicionar ingrediente:', err);
      alert('Erro ao adicionar ingrediente');
    }
  };

  // ── Deletar ──────────────────────────────────────────────────────────────────
  const deletarIngrediente = async (id: string, nome: string, fichasUsando: number) => {
    if (fichasUsando > 0) {
      alert(`Não é possível deletar "${nome}" pois ele está sendo usado em ${fichasUsando} ficha(s)`);
      return;
    }
    if (!confirm(`Deletar ingrediente "${nome}"?`)) return;

    try {
      const { error } = await supabase.from('producao_ingredientes').delete().eq('id', id);
      if (error) throw error;
      setIngredientes(prev => prev.filter(ing => ing.id !== id));
    } catch (err) {
      console.error('Erro ao deletar:', err);
      alert('Erro ao deletar ingrediente');
    }
  };

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const ingredientesFiltrados = ingredientes.filter(ing => {
    const matchNome = ing.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || ing.tipo === filtroTipo;
    // ✅ v2: filtro de tags combinado
    const matchTags =
      filtroTags.length === 0 ||
      filtroTags.every(tag => (ing.tags ?? []).includes(tag));
    return matchNome && matchTipo && matchTags;
  });

  // ── Contadores por tipo ───────────────────────────────────────────────────────
  const contadores = {
    todos:       ingredientes.length,
    direto:      ingredientes.filter(i => i.tipo === 'direto').length,
    beneficiado: ingredientes.filter(i => i.tipo === 'beneficiado').length,
    produzido:   ingredientes.filter(i => i.tipo === 'produzido').length,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: C.textMuted }}>
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Carregando ingredientes...</span>
      </div>
    );
  }

  const selectStyle: React.CSSProperties = {
    padding: '6px 10px',
    background: C.bgSecondary,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    color: C.text,
    fontSize: '13px',
    cursor: 'pointer',
    width: '100%',
  };

  return (
    <div>

      {/* Toolbar — linha 1: filtros de tipo */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: 'todos',       label: 'Todos' },
            { key: 'direto',      label: 'Direto' },
            { key: 'beneficiado', label: 'Beneficiado' },
            { key: 'produzido',   label: 'Produzido' },
          ] as const).map(({ key, label }) => {
            const active = filtroTipo === key;
            return (
              <button
                key={key}
                onClick={() => setFiltroTipo(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/15'
                }`}
              >
                {label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  active
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/40'
                }`}>
                  {contadores[key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Linha 2: busca + botão */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
            <input
              type="text"
              placeholder="Buscar ingrediente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 border-0 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
            style={{ background: '#2563eb' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Ingrediente
          </button>
        </div>

        {/* ✅ v2: Linha 3 — filtro por tags */}
        <div>
          <TagSelector
            tags={filtroTags}
            onChange={setFiltroTags}
            options={FILTRO_TAG_OPTIONS_ING}
            theme={theme}
          />
          {filtroTags.length > 0 && (
            <button
              onClick={() => setFiltroTags([])}
              className="mt-2 text-xs text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
            >
              Limpar filtros de tag
            </button>
          )}
        </div>
      </div>

      {/* Formulário de adicionar */}
      {showAddForm && (
        <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 mb-4">
          <div className="flex flex-col sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block mb-1.5 text-xs text-gray-500 dark:text-white/50">Nome</label>
              <input
                type="text"
                placeholder="Ex: Farinha de Trigo"
                value={novoIngrediente.nome}
                onChange={(e) => setNovoIngrediente(prev => ({ ...prev, nome: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-xs text-gray-500 dark:text-white/50">Preço</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={novoIngrediente.preco}
                onChange={(e) => setNovoIngrediente(prev => ({ ...prev, preco: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-xs text-gray-500 dark:text-white/50">Unidade</label>
              <select
                value={novoIngrediente.unidade}
                onChange={(e) => setNovoIngrediente(prev => ({ ...prev, unidade: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l (litro)</option>
                <option value="ml">ml</option>
                <option value="un">un (unidade)</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs text-gray-500 dark:text-white/50">Tipo</label>
              <select
                value={novoIngrediente.tipo}
                onChange={(e) => setNovoIngrediente(prev => ({ ...prev, tipo: e.target.value as TipoIngrediente }))}
                style={{ width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }}
              >
                <option value="direto">Direto</option>
                <option value="beneficiado">Beneficiado</option>
                <option value="produzido">Produzido</option>
              </select>
            </div>
            <button
              onClick={adicionarIngrediente}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: C.success }}
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Lista vazia */}
      {ingredientesFiltrados.length === 0 ? (
        <div className="py-16 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-white/20" />
          <p className="text-gray-500 dark:text-white/40 font-medium">
            {searchTerm || filtroTipo !== 'todos' || filtroTags.length > 0
              ? 'Nenhum ingrediente encontrado'
              : 'Nenhum ingrediente cadastrado'}
          </p>
          <p className="text-sm text-gray-400 dark:text-white/30 mt-1">
            {filtroTags.length > 0
              ? 'Tente remover alguns filtros de tag'
              : !searchTerm && filtroTipo === 'todos'
                ? 'Adicione ingredientes para começar a criar fichas de produção'
                : ''
            }
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-white/80 dark:bg-white/5 dark:border dark:border-white/10 backdrop-blur-sm shadow-sm overflow-hidden">

          {/* ✅ v2: cabeçalho desktop agora tem coluna Tags */}
          <div
            className="hidden sm:grid gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/10 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider"
            style={{
              background: C.bgSecondary,
              gridTemplateColumns: '2fr 1fr 80px 130px 140px 120px 60px',
            }}
          >
            <div>Ingrediente</div>
            <div>Preço</div>
            <div>Unidade</div>
            <div>Tipo</div>
            <div>Tags</div>
            <div>Fichas</div>
            <div></div>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {ingredientesFiltrados.map((ing) => {
              const isUpdating = updatingIds.has(ing.id);
              const isEditing  = editingId === ing.id;

              return (
                <div
                  key={ing.id}
                  className="transition-colors"
                  style={{ background: isUpdating ? 'rgba(34,197,94,0.08)' : 'transparent', transition: 'background 0.3s ease' }}
                >
                  {/* Desktop */}
                  <div
                    className="hidden sm:grid gap-3 px-4 py-3.5 items-center"
                    style={{ gridTemplateColumns: '2fr 1fr 80px 130px 140px 120px 60px' }}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{ing.nome}</div>

                    <div>
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => salvarPreco(ing.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') salvarPreco(ing.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={{ width: '100%', padding: '6px 10px', background: C.bg, border: `2px solid ${C.accent}`, borderRadius: '6px', color: C.text, fontSize: '14px' }}
                        />
                      ) : (
                        <div
                          onClick={() => iniciarEdicao(ing)}
                          title="Clique para editar"
                          className="px-2.5 py-1.5 rounded-lg cursor-pointer text-sm font-mono text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                          style={{ background: C.bgSecondary }}
                        >
                          R$ {ing.preco_por_unidade.toFixed(2)}
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 dark:text-white/50">{ing.unidade}</div>

                    <div>
                      {ing.tipo === 'produzido' ? (
                        <TipoBadge tipo={ing.tipo} />
                      ) : (
                        <select
                          value={ing.tipo}
                          onChange={(e) => salvarTipo(ing.id, e.target.value as TipoIngrediente)}
                          style={selectStyle}
                        >
                          <option value="direto">Direto</option>
                          <option value="beneficiado">Beneficiado</option>
                          <option value="produzido">Produzido</option>
                        </select>
                      )}
                    </div>

                    {/* ✅ v2: Coluna Tags — desktop */}
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                      {(ing.tags ?? []).length > 0
                        ? (ing.tags ?? []).map(tag => <TagBadge key={tag} tag={tag} />)
                        : <span style={{ fontSize: '11px', color: C.textMuted }}>—</span>
                      }
                    </div>

                    <div>
                      {isUpdating ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.2)', color: C.success }}>
                          <span className="animate-pulse">●</span> Atualizando
                        </span>
                      ) : (ing.fichas_usando ?? 0) > 0 ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)', color: C.accent }}>
                          {ing.fichas_usando} {ing.fichas_usando === 1 ? 'ficha' : 'fichas'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-white/30">Não usado</span>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => deletarIngrediente(ing.id, ing.nome, ing.fichas_usando ?? 0)}
                        disabled={(ing.fichas_usando ?? 0) > 0}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile: card */}
                  <div className="sm:hidden px-4 py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{ing.nome}</span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <TipoBadge tipo={ing.tipo} />
                          {/* ✅ v2: Tags no card mobile */}
                          {(ing.tags ?? []).map(tag => <TagBadge key={tag} tag={tag} />)}
                          {(ing.fichas_usando ?? 0) > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)', color: C.accent }}>
                              {ing.fichas_usando} {ing.fichas_usando === 1 ? 'ficha' : 'fichas'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deletarIngrediente(ing.id, ing.nome, ing.fichas_usando ?? 0)}
                        disabled={(ing.fichas_usando ?? 0) > 0}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1">
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => salvarPreco(ing.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') salvarPreco(ing.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg text-sm font-mono"
                            style={{ background: C.bg, border: `2px solid ${C.accent}`, color: C.text }}
                          />
                        ) : (
                          <div
                            onClick={() => iniciarEdicao(ing)}
                            title="Toque para editar"
                            className="px-2.5 py-1.5 rounded-lg cursor-pointer text-sm font-mono text-gray-900 dark:text-white"
                            style={{ background: C.bgSecondary }}
                          >
                            R$ {ing.preco_por_unidade.toFixed(2)} <span className="text-xs text-gray-400 dark:text-white/30">/{ing.unidade}</span>
                          </div>
                        )}
                      </div>

                      {ing.tipo !== 'produzido' && (
                        <select
                          value={ing.tipo}
                          onChange={(e) => salvarTipo(ing.id, e.target.value as TipoIngrediente)}
                          className="text-xs rounded-lg px-2 py-1.5"
                          style={{ background: C.bgSecondary, border: `1px solid ${C.border}`, color: C.text }}
                        >
                          <option value="direto">Direto</option>
                          <option value="beneficiado">Beneficiado</option>
                          <option value="produzido">Produzido</option>
                        </select>
                      )}
                    </div>

                    {isUpdating && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.2)', color: C.success }}>
                          <span className="animate-pulse">●</span> Atualizando fichas...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Ao alterar o preço de um ingrediente, todas as fichas que o utilizam são recalculadas automaticamente.{' '}
          Ingredientes <strong>Produzidos</strong> têm preço calculado automaticamente pela sua Ficha de Preparo.
        </p>
      </div>
    </div>
  );
}
