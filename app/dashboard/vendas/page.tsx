'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAssistant } from '@/contexts/AssistantContext';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  TrendingUp,
  ClipboardList,
  Loader2,
  RefreshCw,
  Plus,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
  Settings,
  Save,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  BarChart2,
  X,
} from 'lucide-react';
import type { ProdutoVenda, Pedido, ProdutoVendaInput } from '@/lib/produtos-venda';
import { formatarPreco } from '@/lib/produtos-venda';
import OpcionaisModal from '@/components/dashboard/vendas/OpcionaisModal';
import ImportarCSVModal from '@/components/dashboard/vendas/ImportarCSVModal';

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type Aba = 'visao_geral' | 'produtos' | 'pedidos' | 'pagamentos';

type StatusPedido = Pedido['status'] | 'todos';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface IngredienteImportavel {
  id: string;
  nome: string;
  unidade: string;
  preco_por_unidade: number;
  categoria: string | null;
}

interface ProdutoModalProps {
  companyId: string;
  produto: ProdutoVenda | null;
  onClose: () => void;
  onSalvo: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1)
    return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString('pt-BR');
}

function StatusBadge({ status }: { status: Pedido['status'] }) {
  const map: Record<Pedido['status'], { label: string; cls: string; Icon: any }> = {
    aberto:               { label: 'Aberto',              cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',             Icon: Clock },
    aguardando_pagamento: { label: 'Aguard. Pagamento',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',   Icon: Clock },
    pago:                 { label: 'Pago',                cls: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',       Icon: CheckCircle2 },
    cancelado:            { label: 'Cancelado',           cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',               Icon: XCircle },
    entregue:             { label: 'Entregue',            cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',           Icon: CheckCircle2 },
  };
  const { label, cls, Icon } = map[status] ?? map.aberto;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ─── ProdutoModal ─────────────────────────────────────────────────────────────

function ProdutoModal({ companyId, produto, onClose, onSalvo }: ProdutoModalProps) {
  const supabase = createClient();

  const [form, setForm] = useState<Partial<ProdutoVendaInput>>({
    company_id: companyId,
    nome: produto?.nome ?? '',
    descricao: produto?.descricao ?? '',
    categoria: produto?.categoria ?? '',
    imagem_url: produto?.imagem_url ?? '',
    ean: produto?.ean ?? '',
    preco_custo: produto?.preco_custo ?? 0,
    preco_venda: produto?.preco_venda ?? 0,
    unidade: produto?.unidade ?? 'un',
    estoque_atual: produto?.estoque_atual ?? 0,
    estoque_minimo: produto?.estoque_minimo ?? 0,
    controla_estoque: produto?.controla_estoque ?? true,
    is_active: produto?.is_active ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [confirmarDelete, setConfirmarDelete] = useState(false);

  function set(key: keyof ProdutoVendaInput, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSalvar() {
    if (!form.nome?.trim()) { setErro('Nome é obrigatório'); return; }
    if ((form.preco_venda ?? 0) <= 0) { setErro('Preço de venda deve ser maior que zero'); return; }

    setSaving(true);
    setErro(null);
    try {
      if (produto) {
        const { error } = await supabase
          .from('produtos_venda')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', produto.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('produtos_venda')
          .insert({ ...form, company_id: companyId });
        if (error) throw error;
      }

      setSucesso(true);
      setSaving(false);

      onSalvo();
      setTimeout(() => onClose(), 600);
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao salvar');
      setSaving(false);
    }
  }

  async function handleDeletar() {
    setDeletando(true);
    try {
      const { error } = await supabase.from('produtos_venda').delete().eq('id', produto!.id);
      if (error) throw error;
      onSalvo();
      onClose();
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao excluir');
      setDeletando(false);
      setConfirmarDelete(false);
    }
  }

  const unidades = ['un', 'kg', 'g', 'l', 'ml'];
  const markup = form.preco_custo && form.preco_custo > 0 && form.preco_venda
    ? ((form.preco_venda / form.preco_custo - 1) * 100).toFixed(0)
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {produto ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-5">
          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-500/10 rounded-xl text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Salvo com sucesso!
            </div>
          )}

          {/* Imagem */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center flex-shrink-0">
              {form.imagem_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imagem_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL da imagem
              </label>
              <input
                type="url"
                placeholder="https://exemplo.com/imagem.jpg"
                value={form.imagem_url ?? ''}
                onChange={(e) => set('imagem_url', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Cole o link de qualquer imagem pública (Google, site próprio, etc.)
              </p>
              {form.imagem_url && (
                <button
                  type="button"
                  onClick={() => set('imagem_url', '')}
                  className="text-xs text-red-400 hover:text-red-500 mt-1 transition"
                >
                  Remover imagem
                </button>
              )}
            </div>
          </div>

          {/* Nome + Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nome ?? ''}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Ex: Suco de laranja 500ml"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoria
              </label>
              <input
                type="text"
                value={form.categoria ?? ''}
                onChange={(e) => set('categoria', e.target.value)}
                placeholder="Ex: Bebidas, Salgados..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descrição
            </label>
            <textarea
              rows={2}
              value={form.descricao ?? ''}
              onChange={(e) => set('descricao', e.target.value)}
              placeholder="Descrição curta exibida no kiosk"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* EAN + Unidade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Código EAN / Código de Barras
              </label>
              <input
                type="text"
                value={form.ean ?? ''}
                onChange={(e) => set('ean', e.target.value)}
                placeholder="7891234567890"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unidade
              </label>
              <select
                value={form.unidade ?? 'un'}
                onChange={(e) => set('unidade', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {unidades.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.preco_custo ?? ''}
                onChange={(e) => set('preco_custo', parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preço de Venda (R$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.preco_venda ?? ''}
                onChange={(e) => set('preco_venda', parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {markup !== null && (
            <p className={`text-xs font-medium ${
              Number(markup) >= 30
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              Markup: {markup}% sobre o custo
            </p>
          )}

          {/* Controle de Estoque */}
          <div className="p-4 bg-gray-50 dark:bg-white/3 rounded-xl border border-gray-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Controle de Estoque
              </label>
              <button
                type="button"
                onClick={() => set('controla_estoque', !form.controla_estoque)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  form.controla_estoque ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-slate-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.controla_estoque ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {form.controla_estoque && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Estoque atual
                  </label>
                  <input
                    type="number" min="0" step="1"
                    value={form.estoque_atual ?? 0}
                    onChange={(e) => set('estoque_atual', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Estoque mínimo (alerta)
                  </label>
                  <input
                    type="number" min="0" step="1"
                    value={form.estoque_minimo ?? 0}
                    onChange={(e) => set('estoque_minimo', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Produto ativo</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Produtos inativos não aparecem na loja do kiosk
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                form.is_active ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-slate-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.is_active ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between sticky bottom-0 bg-white dark:bg-slate-900">
          {produto && (
            <div>
              {confirmarDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Confirmar exclusão?</span>
                  <button
                    onClick={handleDeletar}
                    disabled={deletando}
                    className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
                  >
                    {deletando ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sim, excluir'}
                  </button>
                  <button
                    onClick={() => setConfirmarDelete(false)}
                    className="text-xs px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmarDelete(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={saving || sucesso}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition shadow-sm disabled:opacity-60"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : sucesso ? (
                <><CheckCircle2 className="w-4 h-4" /> Salvo!</>
              ) : (
                <><Save className="w-4 h-4" /> Salvar</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ImportarModal ────────────────────────────────────────────────────────────

function ImportarModal({
  companyId,
  onClose,
  onImportado,
}: {
  companyId: string;
  onClose: () => void;
  onImportado: () => void;
}) {
  const supabase = createClient();
  const [ingredientes, setIngredientes] = useState<IngredienteImportavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: jaImportados } = await supabase
        .from('produtos_venda')
        .select('ingrediente_id')
        .eq('company_id', companyId)
        .not('ingrediente_id', 'is', null);

      const idsJaImportados = new Set((jaImportados ?? []).map((p: any) => p.ingrediente_id));

      const { data } = await supabase
        .from('producao_ingredientes')
        .select('id, nome, unidade, preco_por_unidade, categoria')
        .eq('company_id', companyId)
        .order('nome');

      setIngredientes(
        (data ?? []).filter((i: IngredienteImportavel) => !idsJaImportados.has(i.id)),
      );
      setLoading(false);
    }
    load();
  }, [companyId]);

  function toggleItem(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleImportar() {
    if (selecionados.size === 0) return;
    setImportando(true);
    try {
      const itens = ingredientes
        .filter((i) => selecionados.has(i.id))
        .map((i) => ({
          company_id: companyId,
          ingrediente_id: i.id,
          nome: i.nome,
          unidade: i.unidade,
          preco_custo: i.preco_por_unidade,
          preco_venda: i.preco_por_unidade * 2,
          categoria: i.categoria ?? undefined,
          estoque_atual: 0,
          controla_estoque: true,
          is_active: true,
        }));
      const { error } = await supabase.from('produtos_venda').insert(itens);
      if (error) throw error;
      onImportado();
      onClose();
    } catch (e: any) {
      alert('Erro ao importar: ' + e.message);
    } finally {
      setImportando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Importar da Linha de Produção
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Preço de venda sugerido: custo × 2
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
          ) : ingredientes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              Todos os ingredientes já foram importados ou não há ingredientes cadastrados.
            </div>
          ) : (
            <div className="space-y-1">
              {ingredientes.map((i) => (
                <label
                  key={i.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={selecionados.has(i.id)}
                    onChange={() => toggleItem(i.id)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {i.nome}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {i.unidade} · Custo: {formatarPreco(i.preco_por_unidade)} · Venda sugerida: {formatarPreco(i.preco_por_unidade * 2)}
                    </p>
                  </div>
                  {i.categoria && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {i.categoria}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleImportar}
              disabled={selecionados.size === 0 || importando}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
            >
              {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Importar {selecionados.size > 0 ? `(${selecionados.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Aba: Visão Geral ─────────────────────────────────────────────────────────

function VisaoGeral({
  companyId,
  onIrParaProdutos,
  onIrParaPedidos,
}: {
  companyId: string;
  onIrParaProdutos: () => void;
  onIrParaPedidos: () => void;
}) {
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalProdutos: 0,
    produtosAtivos: 0,
    produtosEstoqueBaixo: 0,
    totalPedidos: 0,
    pedidosPagos: 0,
    receitaTotal: 0,
    receitaHoje: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [{ data: prods }, { data: pedidos }] = await Promise.all([
          supabase.from('produtos_venda').select('*').eq('company_id', companyId),
          supabase.from('pedidos').select('*').eq('company_id', companyId),
        ]);

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const pedidosPagos = (pedidos ?? []).filter((p: any) => p.status === 'pago');
        const receitaTotal = pedidosPagos.reduce((acc: number, p: any) => acc + Number(p.total), 0);
        const receitaHoje = pedidosPagos
          .filter((p: any) => new Date(p.paid_at) >= hoje)
          .reduce((acc: number, p: any) => acc + Number(p.total), 0);

        setStats({
          totalProdutos: (prods ?? []).length,
          produtosAtivos: (prods ?? []).filter((p: any) => p.is_active).length,
          produtosEstoqueBaixo: (prods ?? []).filter(
            (p: any) => p.controla_estoque && p.estoque_atual <= p.estoque_minimo,
          ).length,
          totalPedidos: (pedidos ?? []).length,
          pedidosPagos: pedidosPagos.length,
          receitaTotal,
          receitaHoje,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Receita hoje',
      value: formatarPreco(stats.receitaHoje),
      sub: `Total: ${formatarPreco(stats.receitaTotal)}`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'Pedidos pagos',
      value: stats.pedidosPagos.toString(),
      sub: `${stats.totalPedidos} no total`,
      icon: ClipboardList,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      onClick: onIrParaPedidos,
    },
    {
      label: 'Produtos ativos',
      value: stats.produtosAtivos.toString(),
      sub: `${stats.totalProdutos} cadastrados`,
      icon: Package,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      onClick: onIrParaProdutos,
    },
    {
      label: 'Estoque baixo',
      value: stats.produtosEstoqueBaixo.toString(),
      sub: stats.produtosEstoqueBaixo > 0 ? 'Produtos precisam de reposição' : 'Tudo em ordem',
      icon: AlertCircle,
      color:
        stats.produtosEstoqueBaixo > 0
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-gray-400 dark:text-gray-500',
      bg:
        stats.produtosEstoqueBaixo > 0
          ? 'bg-amber-50 dark:bg-amber-500/10'
          : 'bg-gray-50 dark:bg-white/5',
      onClick: stats.produtosEstoqueBaixo > 0 ? onIrParaProdutos : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              onClick={card.onClick}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm ${
                card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onIrParaProdutos}
          className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
            <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Gerenciar Produtos</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Cadastrar, editar preços e controlar estoque
            </p>
          </div>
        </button>

        <button
          onClick={onIrParaPedidos}
          className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
            <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Ver Pedidos</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Histórico, status e detalhes de cada venda
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Aba: Produtos ────────────────────────────────────────────────────────────

function AbaProducts({ companyId }: { companyId: string }) {
  const supabase = createClient();
  const [produtos, setProdutos] = useState<ProdutoVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [apenasAtivos, setApenasAtivos] = useState(false);
  const [sortField, setSortField] = useState<'nome' | 'preco_venda' | 'estoque_atual'>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [view, setView] = useState<'list' | 'grid'>('list');

  const [modalAberto, setModalAberto] = useState<'novo' | 'editar' | null>(null);
  const [produtoEditando, setProdutoEditando] = useState<ProdutoVenda | null>(null);
  const [importarAberto, setImportarAberto] = useState(false);
  const [opcionaisProduto, setOpcionaisProduto] = useState<ProdutoVenda | null>(null);
  const [csvAberto, setCsvAberto] = useState(false);

  useEffect(() => { load(); }, [companyId]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('produtos_venda')
        .select('*')
        .eq('company_id', companyId)
        .order('display_order', { ascending: true });
      setProdutos(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAtivo(id: string, atual: boolean) {
    await supabase.from('produtos_venda')
      .update({ is_active: !atual, updated_at: new Date().toISOString() })
      .eq('id', id);
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, is_active: !atual } : p));
  }

  const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))] as string[];

  const filtered = produtos
    .filter(p => {
      if (apenasAtivos && !p.is_active) return false;
      if (categoriaFiltro && p.categoria !== categoriaFiltro) return false;
      if (search) {
        const hay = `${p.nome} ${p.descricao ?? ''} ${p.ean ?? ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      if (sortDir === 'asc') return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });

  function exportCSV() {
    const headers = ['Nome', 'Categoria', 'Preço Custo', 'Preço Venda', 'Estoque', 'Ativo'];
    const rows = filtered.map(p => [
      p.nome, p.categoria ?? '',
      p.preco_custo.toFixed(2), p.preco_venda.toFixed(2),
      p.estoque_atual, p.is_active ? 'Sim' : 'Não',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `produtos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />;
  }

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto, EAN..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Categoria */}
          {categorias.length > 0 && (
            <select
              value={categoriaFiltro}
              onChange={e => setCategoriaFiltro(e.target.value)}
              className="py-2 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas categorias</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* Só ativos */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-400">
            <div
              onClick={() => setApenasAtivos(v => !v)}
              className={`w-9 h-5 rounded-full transition-colors ${apenasAtivos ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-all`}
                style={{ marginLeft: apenasAtivos ? '18px' : '2px' }} />
            </div>
            Só ativos
          </label>

          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {filtered.length} produto{filtered.length !== 1 ? 's' : ''}
          </span>

          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button onClick={exportCSV} disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition disabled:opacity-40">
            <Download className="w-4 h-4" />
            CSV
          </button>

          {/* Importar CSV */}
          <button onClick={() => setCsvAberto(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>

          {/* Importar da Produção */}
          <button onClick={() => setImportarAberto(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition">
            <Package className="w-4 h-4" />
            Produção
          </button>

          {/* Toggle lista/grid */}
          <div className="flex rounded-lg border overflow-hidden border-gray-200 dark:border-white/10">
            <button onClick={() => setView('list')}
              className={`p-2 transition-colors ${view === 'list' ? 'bg-gray-900 dark:bg-white/15 text-white' : 'bg-white dark:bg-transparent text-gray-400 hover:text-gray-600'}`}
              title="Lista">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => setView('grid')}
              className={`p-2 transition-colors ${view === 'grid' ? 'bg-gray-900 dark:bg-white/15 text-white' : 'bg-white dark:bg-transparent text-gray-400 hover:text-gray-600'}`}
              title="Grade">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>

          {/* Novo produto */}
          <button onClick={() => { setProdutoEditando(null); setModalAberto('novo'); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition shadow-sm">
            <Plus className="w-4 h-4" />
            Novo produto
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      )}

      {/* Vazio */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
          <Package className="w-14 h-14 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {search || categoriaFiltro ? 'Nenhum resultado' : 'Nenhum produto cadastrado'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {search || categoriaFiltro ? 'Tente outros filtros' : 'Cadastre seu primeiro produto para começar a vender'}
          </p>
          {!search && !categoriaFiltro && (
            <button onClick={() => { setProdutoEditando(null); setModalAberto('novo'); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition">
              <Plus className="w-4 h-4" />
              Cadastrar produto
            </button>
          )}
        </div>
      )}

      {/* LISTA */}
      {!loading && filtered.length > 0 && view === 'list' && (
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-14">Foto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none" onClick={() => toggleSort('nome')}>
                    <span className="flex items-center gap-1">Nome <SortIcon field="nome" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Categoria</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none" onClick={() => toggleSort('preco_venda')}>
                    <span className="flex items-center gap-1">Preço <SortIcon field="preco_venda" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none" onClick={() => toggleSort('estoque_atual')}>
                    <span className="flex items-center gap-1">Estoque <SortIcon field="estoque_atual" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                        {p.imagem_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                          : <Package className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{p.nome}</p>
                      {p.ean && <p className="text-xs text-gray-400 font-mono">{p.ean}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {p.categoria ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatarPreco(p.preco_venda)}</p>
                      {p.preco_custo > 0 && <p className="text-xs text-gray-400">Custo: {formatarPreco(p.preco_custo)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {p.controla_estoque ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.estoque_atual <= 0 ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                          : p.estoque_atual <= p.estoque_minimo ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                        }`}>
                          {p.estoque_atual <= 0 ? '⚠ Sem estoque' : `${p.estoque_atual} ${p.unidade}`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Não controlado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleAtivo(p.id, p.is_active)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-colors ${
                          p.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400 hover:bg-gray-200'
                        }`}>
                        {p.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); setOpcionaisProduto(p); }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition">
                          Opcionais
                        </button>
                        <button
                          onClick={() => { setProdutoEditando(p); setModalAberto('editar'); }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {filtered.length} de {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* GRID */}
      {!loading && filtered.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer ${
                p.is_active ? 'border-gray-100 dark:border-white/5' : 'border-gray-200 dark:border-white/10 opacity-60'
              }`}
              onClick={() => { setProdutoEditando(p); setModalAberto('editar'); }}>
              <div className="aspect-square bg-gray-50 dark:bg-white/5 relative overflow-hidden">
                {p.imagem_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                  : <div className="absolute inset-0 flex items-center justify-center"><Package className="w-10 h-10 text-gray-200 dark:text-gray-700" /></div>}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                  }`}>{p.is_active ? 'Ativo' : 'Inativo'}</span>
                </div>
                {p.controla_estoque && p.estoque_atual <= p.estoque_minimo && p.estoque_atual >= 0 && (
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                      {p.estoque_atual <= 0 ? 'Sem estoque' : 'Estoque baixo'}
                    </span>
                  </div>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setOpcionaisProduto(p); }}
                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/10 text-purple-500 hover:bg-purple-200 transition"
                  title="Opcionais">
                  <Settings className="w-3 h-3" />
                </button>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{p.nome}</p>
                {p.categoria && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.categoria}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatarPreco(p.preco_venda)}</span>
                  {p.controla_estoque && <span className="text-xs text-gray-400 dark:text-gray-500">{p.estoque_atual} {p.unidade}</span>}
                </div>
              </div>
            </div>
          ))}
          <div onClick={() => { setProdutoEditando(null); setModalAberto('novo'); }}
            className="bg-white/50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 p-8 min-h-[180px]">
            <Plus className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            <span className="text-sm text-gray-400 dark:text-gray-500">Novo produto</span>
          </div>
        </div>
      )}

      {/* Modais */}
      {(modalAberto === 'novo' || modalAberto === 'editar') && (
        <ProdutoModal
          companyId={companyId}
          produto={modalAberto === 'editar' ? produtoEditando : null}
          onClose={() => { setModalAberto(null); setProdutoEditando(null); }}
          onSalvo={load}
        />
      )}
      {importarAberto && (
        <ImportarModal
          companyId={companyId}
          onClose={() => setImportarAberto(false)}
          onImportado={load}
        />
      )}
      {opcionaisProduto && (
        <OpcionaisModal
          companyId={companyId}
          produtoId={opcionaisProduto.id}
          produtoNome={opcionaisProduto.nome}
          onClose={() => setOpcionaisProduto(null)}
        />
      )}
      {csvAberto && (
        <ImportarCSVModal
          companyId={companyId}
          onClose={() => setCsvAberto(false)}
          onImportado={(qty) => { load(); setCsvAberto(false); }}
        />
      )}
    </div>
  );
}

// ─── Aba: Pedidos ─────────────────────────────────────────────────────────────

function AbaPedidos({ companyId }: { companyId: string }) {
  const supabase = createClient();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusPedido>('todos');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    load();
  }, [companyId]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('pedidos')
        .select('*, pedido_itens(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: sortOrder === 'asc' });
      setPedidos(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  const statusCounts = {
    todos: pedidos.length,
    pago: pedidos.filter((p) => p.status === 'pago').length,
    aguardando_pagamento: pedidos.filter((p) => p.status === 'aguardando_pagamento').length,
    cancelado: pedidos.filter((p) => p.status === 'cancelado').length,
    aberto: pedidos.filter((p) => p.status === 'aberto').length,
    entregue: pedidos.filter((p) => p.status === 'entregue').length,
  };

  const filtered = pedidos
    .filter((p) => {
      if (statusFiltro !== 'todos' && p.status !== statusFiltro) return false;
      if (search) {
        const hay =
          `${p.cliente_nome ?? ''} ${p.cliente_telefone ?? ''} ${p.id}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });

  function exportCSV() {
    const headers = ['Data', 'Cliente', 'Total', 'Método', 'Status'];
    const rows = filtered.map((p) => [
      new Date(p.created_at).toLocaleString('pt-BR'),
      p.cliente_nome ?? '—',
      formatarPreco(p.total),
      p.metodo_pagamento ?? '—',
      p.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusFilterButtons: { key: StatusPedido; label: string; cls: string }[] = [
    { key: 'todos', label: 'Todos', cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' },
    { key: 'pago', label: 'Pagos', cls: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
    { key: 'aguardando_pagamento', label: 'Aguardando', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' },
    { key: 'cancelado', label: 'Cancelados', cls: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''}
          </span>

          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>

        {/* Filtros de status */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {statusFilterButtons.map(({ key, label, cls }) => (
            <button
              key={key}
              onClick={() => setStatusFiltro(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFiltro === key
                  ? `${cls} ring-2 ring-current ring-offset-1`
                  : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {label} ({statusCounts[key]})
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      )}

      {/* Vazio */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
          <ClipboardList className="w-14 h-14 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {search || statusFiltro !== 'todos' ? 'Nenhum resultado' : 'Nenhum pedido ainda'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {search || statusFiltro !== 'todos'
              ? 'Tente outros filtros'
              : 'Os pedidos feitos no kiosk aparecerão aqui'}
          </p>
        </div>
      )}

      {/* Tabela */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                  <th
                    className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                    onClick={() => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))}
                  >
                    <span className="flex items-center gap-1">
                      Data
                      {sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Itens</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Método</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)}
                      className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {p.cliente_nome ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                        {p.cliente_telefone && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{p.cliente_telefone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {(p.pedido_itens ?? []).length} iten{(p.pedido_itens ?? []).length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatarPreco(p.total)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize">
                        {p.metodo_pagamento ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>

                    {/* Detalhe expandido */}
                    {expandedRow === p.id && (
                      <tr key={`${p.id}-detail`} className="bg-gray-50 dark:bg-white/3">
                        <td colSpan={6} className="px-6 py-4">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                            Itens do pedido
                          </p>
                          <div className="space-y-1">
                            {(p.pedido_itens ?? []).map((item: any) => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700 dark:text-gray-300">
                                  {item.quantidade}× {item.nome_snapshot}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {formatarPreco(item.subtotal)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {p.desconto > 0 && (
                            <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
                              <span className="text-amber-600 dark:text-amber-400">Desconto</span>
                              <span className="text-amber-600 dark:text-amber-400">
                                − {formatarPreco(p.desconto)}
                              </span>
                            </div>
                          )}
                          {p.observacoes && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              Obs: {p.observacoes}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {filtered.length} de {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Aba: Pagamentos ──────────────────────────────────────────────────────────

function AbaPagamentos({ companyId }: { companyId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('companies')
        .select('receiving_pix_key, infinitepay_handle, mp_access_token, mp_terminal_id')
        .eq('id', companyId)
        .single();
      setConfig(data ?? {});
      setLoading(false);
    }
    load();
  }, [companyId]);

  const [ativados, setAtivados] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadAtivados() {
      const metodos = ['pix_generate', 'nfc_debito', 'nfc_credito', 'tef_debito', 'tef_credito', 'dinheiro'];
      const { data } = await supabase
        .from('company_function_settings')
        .select('function_key, is_enabled')
        .eq('company_id', companyId)
        .in('function_key', metodos);
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((r: any) => { map[r.function_key] = r.is_enabled; });
      setAtivados(map);
    }
    loadAtivados();
  }, [companyId]);

  async function toggleAtivado(functionKey: string, atual: boolean) {
    setSalvando(functionKey);
    await supabase
      .from('company_function_settings')
      .update({ is_enabled: !atual })
      .eq('company_id', companyId)
      .eq('function_key', functionKey);
    setAtivados(prev => ({ ...prev, [functionKey]: !atual }));
    setSalvando(null);
  }

  const metodos = [
    {
      grupo: 'PIX (Recebimentos)',
      cor: 'emerald',
      corHex: '#00b894',
      icone: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <path d="M6.5 3.5L12 9l5.5-5.5M12 9V15M6.5 20.5L12 15l5.5 5.5"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      funcoes: [
        {
          key: 'pix_generate',
          label: 'PIX',
          descricao: 'QR Code PIX gerado automaticamente',
          configurado: !!config.receiving_pix_key,
          pendencia: !config.receiving_pix_key ? 'Configure a Chave PIX nas funções' : null,
          destino: '/dashboard/functions',
        },
      ],
    },
    {
      grupo: 'InfinitePay (NFC/TAP)',
      cor: 'violet',
      corHex: '#7c3aed',
      icone: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 18.5A6.5 6.5 0 1 0 12 5.5a6.5 6.5 0 0 0 0 13zm0-4a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        </svg>
      ),
      funcoes: [
{
  key: 'link_pagamento',
  label: 'Link de Pagamento',
  descricao: 'Cliente paga pelo celular sem maquininha',
  configurado: !!config.infinitepay_handle,
  pendencia: !config.infinitepay_handle ? 'Configure o Token InfinitePay nas funções' : null,
  destino: '/dashboard/functions',
},
        {
          key: 'nfc_debito',
          label: 'NFC Débito',
          descricao: 'Cartão de débito por aproximação',
          configurado: !!config.infinitepay_handle,
          pendencia: !config.infinitepay_handle ? 'Configure o Token InfinitePay nas funções' : null,
          destino: '/dashboard/functions',
        },
        {
          key: 'nfc_credito',
          label: 'NFC Crédito',
          descricao: 'Cartão de crédito por aproximação',
          configurado: !!config.infinitepay_handle,
          pendencia: !config.infinitepay_handle ? 'Configure o Token InfinitePay nas funções' : null,
          destino: '/dashboard/functions',
        },
      ],
    },
    {
      grupo: 'Mercado Pago Point (TEF/POS)',
      cor: 'blue',
      corHex: '#2563eb',
      icone: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      funcoes: [
        {
          key: 'tef_debito',
          label: 'TEF Débito',
          descricao: 'Maquininha Mercado Pago Point — débito',
          configurado: !!(config.mp_access_token && config.mp_terminal_id),
          pendencia: !config.mp_access_token
            ? 'Configure o Access Token do Mercado Pago nas funções'
            : !config.mp_terminal_id
              ? 'Configure o Terminal ID da maquininha nas funções'
              : null,
          destino: '/dashboard/functions',
        },
        {
          key: 'tef_credito',
          label: 'TEF Crédito',
          descricao: 'Maquininha Mercado Pago Point — crédito e parcelado',
          configurado: !!(config.mp_access_token && config.mp_terminal_id),
          pendencia: !config.mp_access_token
            ? 'Configure o Access Token do Mercado Pago nas funções'
            : !config.mp_terminal_id
              ? 'Configure o Terminal ID da maquininha nas funções'
              : null,
          destino: '/dashboard/functions',
        },
      ],
    },
    {
      grupo: 'Dinheiro (Físico)',
      cor: 'gray',
      corHex: '#6b7280',
      icone: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      funcoes: [
        {
          key: 'dinheiro',
          label: 'Dinheiro',
          descricao: 'Pagamento em espécie',
          configurado: true,
          pendencia: null,
          destino: null,
        },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const totalConfigurados = metodos
    .flatMap(g => g.funcoes)
    .filter(f => f.configurado).length;
  const totalFuncoes = metodos.flatMap(g => g.funcoes).length;

  return (
    <div className="space-y-6">

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Métodos disponíveis', valor: totalFuncoes, cor: 'text-gray-900 dark:text-white' },
          { label: 'Configurados', valor: totalConfigurados, cor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Pendentes', valor: totalFuncoes - totalConfigurados, cor: 'text-amber-600 dark:text-amber-400' },
          {
            label: 'Ativos no modo venda',
            valor: Object.values(ativados).filter(Boolean).length,
            cor: 'text-blue-600 dark:text-blue-400',
          },
        ].map(card => (
          <div key={card.label}
            className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
            <p className={`text-2xl font-bold ${card.cor}`}>{card.valor}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Nota explicativa */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          O toggle <strong>Ativo no modo venda</strong> controla se o método aparece como opção de pagamento
          quando o cliente finaliza o pedido. Um método só pode ser ativado se estiver configurado na seção Funções.
        </p>
      </div>

      {/* Grupos de métodos */}
      {metodos.map(grupo => (
        <div key={grupo.grupo}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">

          {/* Header do grupo */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-slate-800/60">
            <div style={{ color: grupo.corHex }}>
              {grupo.icone}
            </div>
            <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{grupo.grupo}</h3>
          </div>

          {/* Funções do grupo */}
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {grupo.funcoes.map(funcao => {
              const ativo = ativados[funcao.key] ?? false;
              const podeAtivar = funcao.configurado;
              const isToggling = salvando === funcao.key;

              return (
                <div key={funcao.key} className="flex items-center gap-4 px-5 py-4">

                  {/* Status configurado */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    funcao.configurado
                      ? 'bg-emerald-100 dark:bg-emerald-500/10'
                      : 'bg-amber-100 dark:bg-amber-500/10'
                  }`}>
                    {funcao.configurado ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {funcao.label}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        funcao.configurado
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                      }`}>
                        {funcao.configurado ? 'configurado' : 'pendente'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {funcao.descricao}
                    </p>
                    {funcao.pendencia && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <span>⚠</span>
                        {funcao.pendencia}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-3 flex-shrink-0">

                    {/* Botão configurar (se pendente e tiver destino) */}
                    {!funcao.configurado && funcao.destino && (
                      <button
                        onClick={() => router.push(funcao.destino!)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition whitespace-nowrap"
                      >
                        Configurar
                      </button>
                    )}

                    {/* Toggle ativo — métodos normais (precisam estar configurados) */}
                    {funcao.key !== 'dinheiro' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                          {ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        <button
                          type="button"
                          disabled={!podeAtivar || isToggling}
                          onClick={() => toggleAtivado(funcao.key, ativo)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                            disabled:opacity-40 disabled:cursor-not-allowed ${
                            ativo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
                          ) : (
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              ativo ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Toggle ativo — dinheiro (sempre configurado, sem restrição) */}
                    {funcao.key === 'dinheiro' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                          {ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => toggleAtivado(funcao.key, ativo)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                            disabled:opacity-40 disabled:cursor-not-allowed ${
                            ativo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
                          ) : (
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              ativo ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

function VendasPageContent() {
  const { selectedAssistantId: companyId, selectedAssistantName } = useAssistant();
  const [aba, setAba] = useState<Aba>('visao_geral');

  const abas: { key: Aba; label: string; icon: any }[] = [
    { key: 'visao_geral', label: 'Visão Geral', icon: BarChart2 },
    { key: 'produtos',    label: 'Produtos',    icon: Package },
    { key: 'pedidos',     label: 'Pedidos',     icon: ClipboardList },
    { key: 'pagamentos',  label: 'Pagamentos',  icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vendas e Produtos</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gerencie a loja virtual do assistente
                {selectedAssistantName && (
                  <span className="font-medium text-gray-900 dark:text-white"> {selectedAssistantName}</span>
                )}
              </p>
            </div>
          </div>

          {/* Sem assistente */}
          {!companyId && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Selecione um Assistente
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Escolha um assistente no topo da página para ver a seção de vendas
              </p>
            </div>
          )}

          {/* Conteúdo principal */}
          {companyId && (
            <>
              {/* Tabs */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="grid grid-cols-2 sm:flex border-b border-gray-200 dark:border-white/10">
                  {abas.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setAba(key)}
                      className={`sm:flex-1 px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2
                        first:rounded-tl-2xl [&:nth-child(2)]:rounded-tr-2xl sm:[&:nth-child(2)]:rounded-none
                        border-b sm:border-b-0
                        ${aba === key
                          ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-b-transparent'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {aba === 'visao_geral' && (
                    <VisaoGeral
                      companyId={companyId}
                      onIrParaProdutos={() => setAba('produtos')}
                      onIrParaPedidos={() => setAba('pedidos')}
                    />
                  )}
                  {aba === 'produtos' && <AbaProducts companyId={companyId} />}
                  {aba === 'pedidos' && <AbaPedidos companyId={companyId} />}
                  {aba === 'pagamentos' && <AbaPagamentos companyId={companyId} />}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <VendasPageContent />
    </Suspense>
  );
}
