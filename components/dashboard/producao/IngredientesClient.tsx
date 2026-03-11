'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Plus, Trash2, Search, AlertCircle } from 'lucide-react';

type TipoIngrediente = 'direto' | 'beneficiado' | 'produzido';

interface Ingrediente {
  id: string;
  nome: string;
  preco_por_unidade: number;
  unidade: string;
  categoria?: string;
  tipo: TipoIngrediente;
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
    produzido:   { label: 'Produzido',   bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
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

export default function IngredientesClient({ companyId, theme = 'dark' }: IngredientesClientProps) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoIngrediente | 'todos'>('todos');

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
        .select('id, nome, preco_por_unidade, unidade, categoria, tipo')
        .eq('company_id', companyId)
        .order('nome');

      if (error) throw error;

      const comContador = await Promise.all(
        (ings || []).map(async (ing) => {
          const { count } = await supabase
            .from('producao_ficha_itens')
            .select('id', { count: 'exact', head: true })
            .eq('ingrediente_id', ing.id);
          return { ...ing, tipo: (ing.tipo ?? 'direto') as TipoIngrediente, fichas_usando: count || 0 };
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
    return matchNome && matchTipo;
  });

  // ── Contadores por tipo ───────────────────────────────────────────────────────
  const contadores = {
    todos:      ingredientes.length,
    direto:     ingredientes.filter(i => i.tipo === 'direto').length,
    beneficiado:ingredientes.filter(i => i.tipo === 'beneficiado').length,
    produzido:  ingredientes.filter(i => i.tipo === 'produzido').length,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: C.textMuted }}>
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Carregando ingredientes...</span>
      </div>
    );
  }

  // ── Estilos compartilhados ────────────────────────────────────────────────────
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
    <div style={{ padding: '20px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: C.text, marginBottom: '8px' }}>
          Ingredientes Base
        </h2>
        <p style={{ color: C.textMuted, fontSize: '14px' }}>
          Gerencie os preços e tipos dos ingredientes. As fichas são recalculadas automaticamente.
        </p>
      </div>

      {/* Filtros de tipo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {([
          { key: 'todos',       label: 'Todos' },
          { key: 'direto',      label: 'Direto' },
          { key: 'beneficiado', label: 'Beneficiado' },
          { key: 'produzido',   label: 'Produzido' },
        ] as const).map(({ key, label }) => {
          const active = filtroTipo === key;
          const colorMap: Record<string, string> = {
            todos: C.accent, direto: '#3b82f6', beneficiado: '#f59e0b', produzido: '#a855f7',
          };
          return (
            <button
              key={key}
              onClick={() => setFiltroTipo(key)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: `1px solid ${active ? colorMap[key] : C.border}`,
                background: active ? colorMap[key] : 'transparent',
                color: active ? '#fff' : C.textMuted,
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
              <span style={{
                marginLeft: '6px',
                padding: '1px 6px',
                borderRadius: '10px',
                background: active ? 'rgba(255,255,255,0.25)' : C.bgSecondary,
                fontSize: '11px',
              }}>
                {contadores[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barra de busca + botão adicionar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
            style={{ color: C.textMuted }}
          />
          <input
            type="text"
            placeholder="Buscar ingrediente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              background: C.bgSecondary,
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              color: C.text,
              fontSize: '14px',
            }}
          />
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '10px 20px',
            background: C.accent,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <Plus className="w-4 h-4" />
          Novo Ingrediente
        </button>
      </div>

      {/* Formulário de adicionar */}
      {showAddForm && (
        <div style={{
          background: C.bgSecondary,
          border: `1px solid ${C.border}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: C.textMuted }}>Nome</label>
              <input
                type="text"
                placeholder="Ex: Farinha de Trigo"
                value={novoIngrediente.nome}
                onChange={(e) => setNovoIngrediente(prev => ({ ...prev, nome: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: C.textMuted }}>Preço</label>
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
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: C.textMuted }}>Unidade</label>
              <select
                value={novoIngrediente.unidade}
                onChange={(e) => setNovoIngrediente(prev => ({ ...prev, unidade: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }}
              >
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="unidade">unidade</option>
                <option value="dúzia">dúzia</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: C.textMuted }}>Tipo</label>
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
              style={{ padding: '8px 16px', background: C.success, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      {ingredientesFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>
            {searchTerm || filtroTipo !== 'todos' ? 'Nenhum ingrediente encontrado' : 'Nenhum ingrediente cadastrado'}
          </p>
          <p style={{ fontSize: '14px' }}>
            {!searchTerm && filtroTipo === 'todos' && 'Adicione ingredientes para começar a criar fichas de produção'}
          </p>
        </div>
      ) : (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>

          {/* Header da tabela */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 80px 130px 120px 60px',
            gap: '12px',
            padding: '12px 16px',
            background: C.bgSecondary,
            borderBottom: `1px solid ${C.border}`,
            fontSize: '13px',
            fontWeight: '600',
            color: C.textMuted,
          }}>
            <div>INGREDIENTE</div>
            <div>PREÇO</div>
            <div>UNIDADE</div>
            <div>TIPO</div>
            <div>FICHAS</div>
            <div></div>
          </div>

          {/* Linhas */}
          {ingredientesFiltrados.map((ing) => {
            const isUpdating = updatingIds.has(ing.id);
            const isEditing  = editingId === ing.id;

            return (
              <div
                key={ing.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 80px 130px 120px 60px',
                  gap: '12px',
                  padding: '14px 16px',
                  borderBottom: `1px solid ${C.border}`,
                  alignItems: 'center',
                  background: isUpdating ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                  transition: 'background 0.3s ease',
                }}
              >
                {/* Nome */}
                <div style={{ fontSize: '14px', fontWeight: '500', color: C.text }}>
                  {ing.nome}
                </div>

                {/* Preço editável */}
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
                      style={{ padding: '6px 10px', background: C.bgSecondary, borderRadius: '6px', cursor: 'pointer', fontSize: '14px', color: C.text, fontFamily: 'monospace' }}
                    >
                      R$ {ing.preco_por_unidade.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Unidade */}
                <div style={{ fontSize: '14px', color: C.textMuted }}>
                  {ing.unidade}
                </div>

                {/* Tipo — select inline */}
                <div>
                  {ing.tipo === 'produzido' ? (
                    // Produzido mostra badge sem select (controlado por ficha de preparo)
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

                {/* Badge fichas */}
                <div>
                  {isUpdating ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '4px 10px', background: 'rgba(34,197,94,0.2)', color: C.success,
                      borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                    }}>
                      <span className="animate-pulse">●</span>
                      Atualizando {ing.fichas_usando}
                    </span>
                  ) : (ing.fichas_usando ?? 0) > 0 ? (
                    <span style={{
                      display: 'inline-block', padding: '4px 10px',
                      background: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
                      color: C.accent, borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                    }}>
                      {ing.fichas_usando} {ing.fichas_usando === 1 ? 'ficha' : 'fichas'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: C.textMuted }}>Não usado</span>
                  )}
                </div>

                {/* Deletar */}
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => deletarIngrediente(ing.id, ing.nome, ing.fichas_usando ?? 0)}
                    disabled={(ing.fichas_usando ?? 0) > 0}
                    style={{
                      padding: '6px', background: 'transparent', border: 'none',
                      cursor: (ing.fichas_usando ?? 0) > 0 ? 'not-allowed' : 'pointer',
                      opacity: (ing.fichas_usando ?? 0) > 0 ? 0.3 : 0.6,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => { if ((ing.fichas_usando ?? 0) === 0) e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = (ing.fichas_usando ?? 0) > 0 ? '0.3' : '0.6'; }}
                  >
                    <Trash2 className="w-4 h-4" style={{ color: C.danger }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '16px', padding: '12px 16px',
        background: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
        border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)'}`,
        borderRadius: '8px', fontSize: '13px', color: C.textMuted,
      }}>
        <strong style={{ color: C.text }}>Dica:</strong> Ao alterar o preço de um ingrediente,
        todas as fichas que o utilizam são recalculadas automaticamente.{' '}
        Ingredientes <strong style={{ color: '#a855f7' }}>Produzidos</strong> têm preço calculado automaticamente pela sua Ficha de Preparo (Fase C).
      </div>
    </div>
  );
}
