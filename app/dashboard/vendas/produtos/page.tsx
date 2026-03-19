'use client';

// app/dashboard/vendas/produtos/page.tsx
// CRUD completo de produtos_venda
// Acessível via /dashboard/vendas → botão "Novo produto" ou "Editar"
// Também pode abrir direto com ?edit=<id> para edição rápida

import { useState, useEffect, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAssistant } from '@/contexts/AssistantContext';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  X,
  Save,
  Loader2,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import type { ProdutoVenda, ProdutoVendaInput } from '@/lib/produtos-venda';
import { formatarPreco } from '@/lib/produtos-venda';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface IngredienteImportavel {
  id: string;
  nome: string;
  unidade: string;
  preco_por_unidade: number;
  categoria: string | null;
}

// ─── Modal de criar/editar produto ───────────────────────────────────────────

interface ProdutoModalProps {
  companyId: string;
  produto: ProdutoVenda | null; // null = criar novo
  onClose: () => void;
  onSalvo: () => void;
}

function ProdutoModal({ companyId, produto, onClose, onSalvo }: ProdutoModalProps) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

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
  const [uploadingImg, setUploadingImg] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [confirmarDelete, setConfirmarDelete] = useState(false);

  function set(key: keyof ProdutoVendaInput, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadImagem(file: File) {
    setUploadingImg(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `produtos/${companyId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('company-assets')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('company-assets').getPublicUrl(path);
      set('imagem_url', data.publicUrl);
    } catch (e: any) {
      setErro('Erro ao enviar imagem: ' + e.message);
    } finally {
      setUploadingImg(false);
    }
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
        const { error } = await supabase.from('produtos_venda').insert({ ...form, company_id: companyId });
        if (error) throw error;
      }
      setSucesso(true);
      setTimeout(() => { onSalvo(); onClose(); }, 800);
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao salvar');
    } finally {
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
          {/* Feedback */}
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
            <div
              className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition"
              onClick={() => fileRef.current?.click()}
            >
              {uploadingImg ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : form.imagem_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imagem_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagem do produto</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  {form.imagem_url ? 'Trocar imagem' : 'Enviar imagem'}
                </button>
                {form.imagem_url && (
                  <button
                    type="button"
                    onClick={() => set('imagem_url', '')}
                    className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                  >
                    Remover
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Ou cole uma URL:
              </p>
              <input
                type="url"
                placeholder="https://..."
                value={form.imagem_url ?? ''}
                onChange={(e) => set('imagem_url', e.target.value)}
                className="mt-1 w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImagem(f);
              }}
            />
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

          {/* Markup info */}
          {markup !== null && (
            <p className={`text-xs font-medium ${
              Number(markup) >= 30
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              Markup: {markup}% sobre o custo
            </p>
          )}

          {/* Estoque */}
          <div className="p-4 bg-gray-50 dark:bg-white/3 rounded-xl border border-gray-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Controle de Estoque
              </label>
              <div
                onClick={() => set('controla_estoque', !form.controla_estoque)}
                className={`w-10 h-5.5 rounded-full cursor-pointer transition-colors flex items-center ${
                  form.controla_estoque ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/20'
                }`}
                style={{ height: '22px' }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ marginLeft: form.controla_estoque ? '22px' : '2px' }}
                />
              </div>
            </div>

            {form.controla_estoque && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Estoque atual
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
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
                    type="number"
                    min="0"
                    step="1"
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
            <div
              onClick={() => set('is_active', !form.is_active)}
              className={`w-10 rounded-full cursor-pointer transition-colors flex items-center ${
                form.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/20'
              }`}
              style={{ height: '22px' }}
            >
              <div
                className="w-4 h-4 rounded-full bg-white shadow transition-all"
                style={{ marginLeft: form.is_active ? '22px' : '2px' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between sticky bottom-0 bg-white dark:bg-slate-900">
          {/* Excluir */}
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

// ─── Modal de importar da Linha de Produção ───────────────────────────────────

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
      // Ingredientes que ainda não foram importados
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
          preco_venda: i.preco_por_unidade * 2, // markup 2x sugerido
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

// ─── Página ───────────────────────────────────────────────────────────────────

function ProdutosPageContent() {
  const { selectedAssistantId: companyId } = useAssistant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const supabase = createClient();
  const [produtos, setProdutos] = useState<ProdutoVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState<'novo' | 'editar' | null>(null);
  const [produtoEditando, setProdutoEditando] = useState<ProdutoVenda | null>(null);
  const [importarAberto, setImportarAberto] = useState(false);

  useEffect(() => {
    if (companyId) load();
  }, [companyId]);

  // Abrir edição direto via ?edit=id
  useEffect(() => {
    if (editId && produtos.length > 0) {
      const p = produtos.find((pr) => pr.id === editId);
      if (p) { setProdutoEditando(p); setModalAberto('editar'); }
    }
  }, [editId, produtos]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('produtos_venda')
      .select('*')
      .eq('company_id', companyId!)
      .order('display_order', { ascending: true });
    setProdutos(data ?? []);
    setLoading(false);
  }

  function abrirNovo() {
    setProdutoEditando(null);
    setModalAberto('novo');
  }

  function abrirEditar(p: ProdutoVenda) {
    setProdutoEditando(p);
    setModalAberto('editar');
  }

  function fecharModal() {
    setModalAberto(null);
    setProdutoEditando(null);
  }

  if (!companyId) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <Package className="w-14 h-14 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">Selecione um assistente para gerenciar produtos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/vendas')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-500 dark:text-gray-400"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produtos</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Catálogo da loja virtual do kiosk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportarAberto(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition"
            >
              <Package className="w-4 h-4" />
              Importar da Produção
            </button>
            <button
              onClick={abrirNovo}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo produto
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : produtos.length === 0 ? (
          <div className="bg-white/50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 p-16 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Nenhum produto cadastrado
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Cadastre produtos manualmente ou importe da Linha de Produção
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setImportarAberto(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition"
              >
                <Package className="w-4 h-4" />
                Importar da Produção
              </button>
              <button
                onClick={abrirNovo}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                Cadastrar manualmente
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {produtos.map((p) => (
              <div
                key={p.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  p.is_active
                    ? 'border-gray-100 dark:border-white/5'
                    : 'border-gray-200 dark:border-white/10 opacity-60'
                }`}
                onClick={() => abrirEditar(p)}
              >
                {/* Imagem */}
                <div className="aspect-square bg-gray-50 dark:bg-white/5 relative overflow-hidden">
                  {p.imagem_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                    </div>
                  )}

                  {/* Badge ativo/inativo */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      p.is_active
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                    }`}>
                      {p.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Estoque baixo */}
                  {p.controla_estoque && p.estoque_atual <= p.estoque_minimo && p.estoque_atual >= 0 && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                        {p.estoque_atual <= 0 ? 'Sem estoque' : 'Estoque baixo'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{p.nome}</p>
                  {p.categoria && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.categoria}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatarPreco(p.preco_venda)}
                    </span>
                    {p.controla_estoque && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {p.estoque_atual} {p.unidade}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Card + novo */}
            <div
              onClick={abrirNovo}
              className="bg-white/50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 p-8 min-h-[180px]"
            >
              <Plus className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              <span className="text-sm text-gray-400 dark:text-gray-500">Novo produto</span>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {(modalAberto === 'novo' || modalAberto === 'editar') && companyId && (
        <ProdutoModal
          companyId={companyId}
          produto={modalAberto === 'editar' ? produtoEditando : null}
          onClose={fecharModal}
          onSalvo={load}
        />
      )}

      {importarAberto && companyId && (
        <ImportarModal
          companyId={companyId}
          onClose={() => setImportarAberto(false)}
          onImportado={load}
        />
      )}
    </div>
  );
}

export default function ProdutosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    }>
      <ProdutosPageContent />
    </Suspense>
  );
}
