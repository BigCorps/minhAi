'use client';

// components/dashboard/vendas/OpcionaisModal.tsx
//
// Modal de configuração de grupos de opcionais/adicionais de um produto.
// Acessado pelo botão "Opcionais" na lista de produtos do dashboard.
//
// Fluxo:
//  1. Lista grupos existentes do produto
//  2. Cria/edita grupo (nome, obrigatório, min/max escolhas)
//  3. Dentro de cada grupo, lista/adiciona/edita/remove itens (com preço adicional)

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  X, Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, AlertCircle, CheckCircle2, GripVertical,
  Settings,
} from 'lucide-react';
import { formatarPreco } from '@/lib/produtos-venda';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Grupo {
  id: string;
  produto_id: string;
  company_id: string;
  nome: string;
  descricao: string | null;
  obrigatorio: boolean;
  min_escolhas: number;
  max_escolhas: number;
  display_order: number;
  itens?: ItemOpcao[];
}

interface ItemOpcao {
  id: string;
  grupo_id: string;
  nome: string;
  descricao: string | null;
  preco_adicional: number;
  disponivel: boolean;
  display_order: number;
}

interface OpcionaisModalProps {
  companyId: string;
  produtoId: string;
  produtoNome: string;
  onClose: () => void;
}

// ── Estado inicial ────────────────────────────────────────────────────────────

const GRUPO_VAZIO = {
  nome: '',
  descricao: '',
  obrigatorio: false,
  min_escolhas: 0,
  max_escolhas: 1,
};

const ITEM_VAZIO = {
  nome: '',
  descricao: '',
  preco_adicional: 0,
  disponivel: true,
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function OpcionaisModal({
  companyId,
  produtoId,
  produtoNome,
  onClose,
}: OpcionaisModalProps) {
  const supabase = createClient();

  const [grupos, setGrupos]         = useState<Grupo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expandido, setExpandido]   = useState<string | null>(null);
  const [erro, setErro]             = useState<string | null>(null);
  const [sucesso, setSucesso]       = useState<string | null>(null);

  // Form novo grupo
  const [showNovoGrupo, setShowNovoGrupo] = useState(false);
  const [novoGrupo, setNovoGrupo]         = useState({ ...GRUPO_VAZIO });
  const [salvandoGrupo, setSalvandoGrupo] = useState(false);

  // Form edição grupo
  const [editandoGrupoId, setEditandoGrupoId]   = useState<string | null>(null);
  const [formEditGrupo, setFormEditGrupo]         = useState({ ...GRUPO_VAZIO });

  // Form novo item
  const [novoItemGrupoId, setNovoItemGrupoId]   = useState<string | null>(null);
  const [novoItem, setNovoItem]                  = useState({ ...ITEM_VAZIO });
  const [salvandoItem, setSalvandoItem]          = useState(false);

  // Form edição item
  const [editandoItemId, setEditandoItemId]     = useState<string | null>(null);
  const [formEditItem, setFormEditItem]          = useState({ ...ITEM_VAZIO });

  // ── Load ───────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    setErro(null);
    try {
      const { data: gruposData, error: gErr } = await supabase
        .from('produto_opcoes_grupos')
        .select('*')
        .eq('produto_id', produtoId)
        .order('display_order', { ascending: true });

      if (gErr) throw gErr;

      if (!gruposData || gruposData.length === 0) {
        setGrupos([]);
        setLoading(false);
        return;
      }

      // Carrega itens de todos os grupos
      const { data: itensData, error: iErr } = await supabase
        .from('produto_opcoes_itens')
        .select('*')
        .in('grupo_id', gruposData.map(g => g.id))
        .order('display_order', { ascending: true });

      if (iErr) throw iErr;

      const gruposComItens = gruposData.map(g => ({
        ...g,
        itens: (itensData ?? []).filter(i => i.grupo_id === g.id),
      }));

      setGrupos(gruposComItens);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [produtoId]);

  // ── Feedback temporário ────────────────────────────────────────────────────

  function showSucesso(msg: string) {
    setSucesso(msg);
    setTimeout(() => setSucesso(null), 2500);
  }

  // ── CRUD Grupos ────────────────────────────────────────────────────────────

  async function criarGrupo() {
    if (!novoGrupo.nome.trim()) { setErro('Nome do grupo é obrigatório'); return; }
    setSalvandoGrupo(true); setErro(null);
    try {
      const { error } = await supabase.from('produto_opcoes_grupos').insert({
        produto_id:    produtoId,
        company_id:    companyId,
        nome:          novoGrupo.nome.trim(),
        descricao:     novoGrupo.descricao?.trim() || null,
        obrigatorio:   novoGrupo.obrigatorio,
        min_escolhas:  novoGrupo.min_escolhas,
        max_escolhas:  novoGrupo.max_escolhas,
        display_order: grupos.length,
      });
      if (error) throw error;
      setNovoGrupo({ ...GRUPO_VAZIO });
      setShowNovoGrupo(false);
      showSucesso('Grupo criado!');
      await load();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvandoGrupo(false);
    }
  }

  async function salvarEdicaoGrupo(id: string) {
    if (!formEditGrupo.nome.trim()) { setErro('Nome é obrigatório'); return; }
    setErro(null);
    try {
      const { error } = await supabase
        .from('produto_opcoes_grupos')
        .update({
          nome:         formEditGrupo.nome.trim(),
          descricao:    formEditGrupo.descricao?.trim() || null,
          obrigatorio:  formEditGrupo.obrigatorio,
          min_escolhas: formEditGrupo.min_escolhas,
          max_escolhas: formEditGrupo.max_escolhas,
        })
        .eq('id', id);
      if (error) throw error;
      setEditandoGrupoId(null);
      showSucesso('Grupo atualizado!');
      await load();
    } catch (e: any) {
      setErro(e.message);
    }
  }

  async function deletarGrupo(id: string) {
    if (!confirm('Excluir este grupo e todos os seus itens?')) return;
    try {
      const { error } = await supabase.from('produto_opcoes_grupos').delete().eq('id', id);
      if (error) throw error;
      showSucesso('Grupo removido!');
      await load();
    } catch (e: any) {
      setErro(e.message);
    }
  }

  // ── CRUD Itens ─────────────────────────────────────────────────────────────

  async function criarItem(grupoId: string) {
    if (!novoItem.nome.trim()) { setErro('Nome do item é obrigatório'); return; }
    setSalvandoItem(true); setErro(null);
    try {
      const grupo = grupos.find(g => g.id === grupoId);
      const order = (grupo?.itens?.length ?? 0);
      const { error } = await supabase.from('produto_opcoes_itens').insert({
        grupo_id:        grupoId,
        nome:            novoItem.nome.trim(),
        descricao:       novoItem.descricao?.trim() || null,
        preco_adicional: Number(novoItem.preco_adicional) || 0,
        disponivel:      novoItem.disponivel,
        display_order:   order,
      });
      if (error) throw error;
      setNovoItem({ ...ITEM_VAZIO });
      setNovoItemGrupoId(null);
      showSucesso('Item adicionado!');
      await load();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvandoItem(false);
    }
  }

  async function salvarEdicaoItem(id: string) {
    if (!formEditItem.nome.trim()) { setErro('Nome é obrigatório'); return; }
    setErro(null);
    try {
      const { error } = await supabase
        .from('produto_opcoes_itens')
        .update({
          nome:            formEditItem.nome.trim(),
          descricao:       formEditItem.descricao?.trim() || null,
          preco_adicional: Number(formEditItem.preco_adicional) || 0,
          disponivel:      formEditItem.disponivel,
        })
        .eq('id', id);
      if (error) throw error;
      setEditandoItemId(null);
      showSucesso('Item atualizado!');
      await load();
    } catch (e: any) {
      setErro(e.message);
    }
  }

  async function deletarItem(id: string) {
    try {
      const { error } = await supabase.from('produto_opcoes_itens').delete().eq('id', id);
      if (error) throw error;
      showSucesso('Item removido!');
      await load();
    } catch (e: any) {
      setErro(e.message);
    }
  }

  async function toggleDisponivel(item: ItemOpcao) {
    await supabase
      .from('produto_opcoes_itens')
      .update({ disponivel: !item.disponivel })
      .eq('id', item.id);
    await load();
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const inputCls = `w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 
    bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white 
    focus:outline-none focus:ring-2 focus:ring-emerald-500`;

  const labelCls = `block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1`;

  function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${
          checked ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-slate-600'
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`} />
      </button>
    );
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Opcionais & Adicionais
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">
                {produtoNome}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Feedback */}
          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erro}
              <button onClick={() => setErro(null)} className="ml-auto text-red-400 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {sucesso && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-500/10 rounded-xl text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {sucesso}
            </div>
          )}

          {/* Explicação */}
          <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20 text-xs text-purple-700 dark:text-purple-300">
            <p className="font-semibold mb-1">Como funciona</p>
            <p>Crie <strong>grupos</strong> (ex: "Borda", "Tamanho", "Adicionais") e adicione <strong>itens</strong> em cada grupo (ex: "Catupiry +R$5"). O cliente escolhe ao adicionar o produto ao carrinho.</p>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : (

            <>
              {/* Lista de grupos */}
              {grupos.length === 0 && !showNovoGrupo && (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                  <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  Nenhum grupo de opcionais configurado.
                </div>
              )}

              {grupos.map(grupo => (
                <div
                  key={grupo.id}
                  className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden"
                >
                  {/* Header do grupo */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/5">
                    <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />

                    {editandoGrupoId === grupo.id ? (
                      // ── Edição inline do grupo ──
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={formEditGrupo.nome}
                          onChange={e => setFormEditGrupo(f => ({ ...f, nome: e.target.value }))}
                          placeholder="Nome do grupo"
                          className={inputCls}
                          autoFocus
                        />
                        <input
                          type="text"
                          value={formEditGrupo.descricao || ''}
                          onChange={e => setFormEditGrupo(f => ({ ...f, descricao: e.target.value }))}
                          placeholder="Instrução (opcional)"
                          className={inputCls}
                        />
                        <div className="flex items-center gap-3 col-span-2 text-xs text-gray-600 dark:text-gray-400">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <ToggleSwitch
                              checked={formEditGrupo.obrigatorio}
                              onChange={() => setFormEditGrupo(f => ({ ...f, obrigatorio: !f.obrigatorio }))}
                            />
                            Obrigatório
                          </label>
                          <label className="flex items-center gap-1.5">
                            Mín
                            <input
                              type="number" min="0" max="20"
                              value={formEditGrupo.min_escolhas}
                              onChange={e => setFormEditGrupo(f => ({ ...f, min_escolhas: parseInt(e.target.value) || 0 }))}
                              className="w-12 px-2 py-1 rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-center text-xs"
                            />
                          </label>
                          <label className="flex items-center gap-1.5">
                            Máx
                            <input
                              type="number" min="1" max="20"
                              value={formEditGrupo.max_escolhas}
                              onChange={e => setFormEditGrupo(f => ({ ...f, max_escolhas: parseInt(e.target.value) || 1 }))}
                              className="w-12 px-2 py-1 rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-center text-xs"
                            />
                          </label>
                          <button
                            onClick={() => salvarEdicaoGrupo(grupo.id)}
                            className="ml-auto px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditandoGrupoId(null)}
                            className="text-gray-400 hover:text-gray-600 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      // ── Visualização do grupo ──
                      <>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setExpandido(expandido === grupo.id ? null : grupo.id)}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white">{grupo.nome}</p>
                            {grupo.obrigatorio && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                                obrigatório
                              </span>
                            )}
                            {grupo.max_escolhas > 1 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                até {grupo.max_escolhas} opções
                              </span>
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {grupo.itens?.length ?? 0} ite{(grupo.itens?.length ?? 0) !== 1 ? 'ns' : 'm'}
                            </span>
                          </div>
                          {grupo.descricao && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{grupo.descricao}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditandoGrupoId(grupo.id);
                              setFormEditGrupo({
                                nome:         grupo.nome,
                                descricao:    grupo.descricao || '',
                                obrigatorio:  grupo.obrigatorio,
                                min_escolhas: grupo.min_escolhas,
                                max_escolhas: grupo.max_escolhas,
                              });
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400 hover:text-gray-600"
                            title="Editar grupo"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deletarGrupo(grupo.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition text-gray-400 hover:text-red-500"
                            title="Excluir grupo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setExpandido(expandido === grupo.id ? null : grupo.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400"
                          >
                            {expandido === grupo.id
                              ? <ChevronUp className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Itens do grupo (expandido) */}
                  {expandido === grupo.id && (
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                      {(grupo.itens ?? []).length === 0 && novoItemGrupoId !== grupo.id && (
                        <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                          Nenhum item ainda. Adicione opções abaixo.
                        </div>
                      )}

                      {(grupo.itens ?? []).map(item => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">

                          {editandoItemId === item.id ? (
                            // ── Edição inline do item ──
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={formEditItem.nome}
                                onChange={e => setFormEditItem(f => ({ ...f, nome: e.target.value }))}
                                placeholder="Nome do item"
                                className={inputCls}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                                  <input
                                    type="number" min="0" step="0.50"
                                    value={formEditItem.preco_adicional}
                                    onChange={e => setFormEditItem(f => ({ ...f, preco_adicional: parseFloat(e.target.value) || 0 }))}
                                    className={`${inputCls} pl-8`}
                                    placeholder="0.00"
                                  />
                                </div>
                                <button
                                  onClick={() => salvarEdicaoItem(item.id)}
                                  className="px-3 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition flex-shrink-0"
                                >
                                  OK
                                </button>
                                <button
                                  onClick={() => setEditandoItemId(null)}
                                  className="px-2 py-2 text-gray-400 hover:text-gray-600 text-xs flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            // ── Visualização do item ──
                            <>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium ${
                                    item.disponivel
                                      ? 'text-gray-900 dark:text-white'
                                      : 'text-gray-400 dark:text-gray-600 line-through'
                                  }`}>
                                    {item.nome}
                                  </p>
                                  {item.preco_adicional > 0 && (
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                      +{formatarPreco(item.preco_adicional)}
                                    </span>
                                  )}
                                  {item.preco_adicional === 0 && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">grátis</span>
                                  )}
                                </div>
                                {item.descricao && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500">{item.descricao}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <ToggleSwitch
                                  checked={item.disponivel}
                                  onChange={() => toggleDisponivel(item)}
                                />
                                <button
                                  onClick={() => {
                                    setEditandoItemId(item.id);
                                    setFormEditItem({
                                      nome:            item.nome,
                                      descricao:       item.descricao || '',
                                      preco_adicional: item.preco_adicional,
                                      disponivel:      item.disponivel,
                                    });
                                  }}
                                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400 hover:text-gray-600"
                                >
                                  <Settings className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => deletarItem(item.id)}
                                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 transition text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Form novo item */}
                      {novoItemGrupoId === grupo.id ? (
                        <div className="px-4 py-3 bg-gray-50 dark:bg-white/3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={labelCls}>Nome da opção *</label>
                              <input
                                type="text"
                                value={novoItem.nome}
                                onChange={e => setNovoItem(f => ({ ...f, nome: e.target.value }))}
                                placeholder="Ex: Catupiry, Grande, Sem cebola..."
                                className={inputCls}
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') criarItem(grupo.id); }}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Preço adicional (R$)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                                <input
                                  type="number" min="0" step="0.50"
                                  value={novoItem.preco_adicional}
                                  onChange={e => setNovoItem(f => ({ ...f, preco_adicional: parseFloat(e.target.value) || 0 }))}
                                  placeholder="0.00"
                                  className={`${inputCls} pl-9`}
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className={labelCls}>Descrição (opcional)</label>
                            <input
                              type="text"
                              value={novoItem.descricao || ''}
                              onChange={e => setNovoItem(f => ({ ...f, descricao: e.target.value }))}
                              placeholder="Ex: Molho cremoso de queijo"
                              className={inputCls}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                              <ToggleSwitch
                                checked={novoItem.disponivel}
                                onChange={() => setNovoItem(f => ({ ...f, disponivel: !f.disponivel }))}
                              />
                              Disponível
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setNovoItemGrupoId(null); setNovoItem({ ...ITEM_VAZIO }); }}
                                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 transition"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => criarItem(grupo.id)}
                                disabled={salvandoItem || !novoItem.nome.trim()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                              >
                                {salvandoItem ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                Adicionar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setNovoItemGrupoId(grupo.id);
                            setNovoItem({ ...ITEM_VAZIO });
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar opção
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Form novo grupo */}
              {showNovoGrupo && (
                <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-500/30 rounded-xl p-4 space-y-3 bg-emerald-50/50 dark:bg-emerald-500/5">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Novo grupo de opcionais</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Nome do grupo *</label>
                      <input
                        type="text"
                        value={novoGrupo.nome}
                        onChange={e => setNovoGrupo(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Ex: Borda, Tamanho, Adicionais"
                        className={inputCls}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Instrução para o cliente</label>
                      <input
                        type="text"
                        value={novoGrupo.descricao}
                        onChange={e => setNovoGrupo(f => ({ ...f, descricao: e.target.value }))}
                        placeholder="Ex: Escolha a borda da sua pizza"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap text-xs text-gray-600 dark:text-gray-400">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <ToggleSwitch
                        checked={novoGrupo.obrigatorio}
                        onChange={() => setNovoGrupo(f => ({ ...f, obrigatorio: !f.obrigatorio }))}
                      />
                      Obrigatório
                    </label>
                    <label className="flex items-center gap-2">
                      Mín escolhas
                      <input
                        type="number" min="0" max="20"
                        value={novoGrupo.min_escolhas}
                        onChange={e => setNovoGrupo(f => ({ ...f, min_escolhas: parseInt(e.target.value) || 0 }))}
                        className="w-14 px-2 py-1 rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-center text-xs"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      Máx escolhas
                      <input
                        type="number" min="1" max="20"
                        value={novoGrupo.max_escolhas}
                        onChange={e => setNovoGrupo(f => ({ ...f, max_escolhas: parseInt(e.target.value) || 1 }))}
                        className="w-14 px-2 py-1 rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-center text-xs"
                      />
                    </label>
                    <p className="text-gray-400 dark:text-gray-500">
                      {novoGrupo.max_escolhas === 1 ? '(seleção única)' : `(múltipla seleção: até ${novoGrupo.max_escolhas})`}
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowNovoGrupo(false); setNovoGrupo({ ...GRUPO_VAZIO }); }}
                      className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={criarGrupo}
                      disabled={salvandoGrupo || !novoGrupo.nome.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                    >
                      {salvandoGrupo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Criar grupo
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-slate-900">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} configurado{grupos.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              Fechar
            </button>
            {!showNovoGrupo && (
              <button
                onClick={() => { setShowNovoGrupo(true); setExpandido(null); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                Novo grupo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
