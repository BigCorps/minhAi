// components/dashboard/vendas/CampoItemComAutocomplete.tsx
// Campo de item com autocomplete de produtos e dados fiscais

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Search, Package, Loader2, Plus, Trash2, Hash } from 'lucide-react';

interface ItemNota {
  nome: string;
  quantidade: number;
  valor_unitario: number;
  unidade: string;
  ncm?: string;
  cfop?: number;
  origem_produto?: number;
  produto_id?: string;
  ean?: string;
}

interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  unidade: string;
  ean?: string;
  produtos_fiscal?: Array<{
    ncm: string;
    cfop: number;
    origem_produto: number;
  }>;
}

interface CampoItemComAutocompleteProps {
  companyId: string;
  item: ItemNota;
  index: number;
  onUpdate: (index: number, item: ItemNota) => void;
  onRemove: (index: number) => void;
  theme?: 'dark' | 'light';
  mostrarDadosFiscais?: boolean;
}

export default function CampoItemComAutocomplete({
  companyId,
  item,
  index,
  onUpdate,
  onRemove,
  theme = 'dark',
  mostrarDadosFiscais = false,
}: CampoItemComAutocompleteProps) {
  const isDark = theme === 'dark';
  const supabase = createClient();

  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [sugestoes, setSugestoes] = useState<Produto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const C = {
    bg: isDark ? '#1e293b' : '#ffffff',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    accent: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
  };

  // Fechar autocomplete ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar produtos ao digitar
  useEffect(() => {
    const buscarProdutos = async () => {
      if (!item.nome || item.nome.length < 2) {
        setSugestoes([]);
        return;
      }

      setBuscando(true);

      try {
        const { data, error } = await supabase
          .from('produtos_venda')
          .select(`
            id,
            nome,
            preco_venda,
            unidade,
            ean,
            produtos_fiscal (
              ncm,
              cfop,
              origem_produto
            )
          `)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .ilike('nome', `%${item.nome}%`)
          .order('is_favorito', { ascending: false })
          .order('nome')
          .limit(8);

        if (error) {
          console.error('Erro ao buscar produtos:', error);
          setSugestoes([]);
          return;
        }

        setSugestoes(data || []);
        if ((data || []).length > 0) {
          setShowAutocomplete(true);
        }
      } catch (err) {
        console.error('Erro ao buscar produtos:', err);
        setSugestoes([]);
      } finally {
        setBuscando(false);
      }
    };

    const timer = setTimeout(buscarProdutos, 300);
    return () => clearTimeout(timer);
  }, [item.nome, companyId, supabase]);

  // Selecionar produto do autocomplete
  const handleSelecionarProduto = useCallback((produto: Produto) => {
    const fiscal = produto.produtos_fiscal?.[0];

    onUpdate(index, {
      nome: produto.nome,
      quantidade: item.quantidade || 1,
      valor_unitario: produto.preco_venda,
      unidade: produto.unidade,
      produto_id: produto.id,
      ean: produto.ean || undefined,
      ncm: fiscal?.ncm || '00000000',
      cfop: fiscal?.cfop || 5102,
      origem_produto: fiscal?.origem_produto ?? 0,
    });

    setShowAutocomplete(false);
  }, [index, item.quantidade, onUpdate]);

  // Calcular valor total
  const valorTotal = item.quantidade * item.valor_unitario;

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
    >
      {/* Header do item */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" style={{ color: C.accent }} />
          <span className="text-sm font-bold" style={{ color: C.text }}>
            Item {index + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
          style={{ color: '#ef4444' }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Nome do produto (com autocomplete) */}
      <div className="relative mb-3" ref={autocompleteRef}>
        <label className="block mb-1.5">
          <span className="text-sm font-medium" style={{ color: C.text }}>
            Produto <span className="text-red-500">*</span>
          </span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={item.nome}
            onChange={(e) => onUpdate(index, { ...item, nome: e.target.value })}
            placeholder="Digite o nome do produto"
            className="w-full px-3 py-2 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: C.bg,
              borderColor: C.border,
              color: C.text,
            }}
          />
          {buscando && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: C.textMuted }} />
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showAutocomplete && sugestoes.length > 0 && (
          <div
            className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto"
            style={{ backgroundColor: C.bg, borderColor: C.border }}
          >
            {sugestoes.map((produto) => {
              const fiscal = produto.produtos_fiscal?.[0];
              return (
                <button
                  key={produto.id}
                  type="button"
                  onClick={() => handleSelecionarProduto(produto)}
                  className="w-full px-3 py-2 text-left hover:bg-opacity-50 transition-colors border-b last:border-b-0"
                  style={{ borderColor: C.border }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
                        {produto.nome}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-semibold" style={{ color: C.accent }}>
                          R$ {produto.preco_venda.toFixed(2)}
                        </span>
                        {fiscal?.ncm && fiscal.ncm !== '00000000' && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${C.success}20`, color: C.success }}>
                            NCM: {fiscal.ncm}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid de quantidade, unidade e valor */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block mb-1.5">
            <span className="text-sm font-medium" style={{ color: C.text }}>
              Qtd <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="number"
            value={item.quantidade}
            onChange={(e) => onUpdate(index, { ...item, quantidade: Number(e.target.value) })}
            min="0.01"
            step="0.01"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: C.bg,
              borderColor: C.border,
              color: C.text,
            }}
          />
        </div>

        <div>
          <label className="block mb-1.5">
            <span className="text-sm font-medium" style={{ color: C.text }}>
              Unidade
            </span>
          </label>
          <select
            value={item.unidade}
            onChange={(e) => onUpdate(index, { ...item, unidade: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: C.bg,
              borderColor: C.border,
              color: C.text,
            }}
          >
            <option value="un">UN</option>
            <option value="kg">KG</option>
            <option value="g">G</option>
            <option value="l">L</option>
            <option value="ml">ML</option>
            <option value="m">M</option>
            <option value="m²">M²</option>
            <option value="m³">M³</option>
          </select>
        </div>

        <div>
          <label className="block mb-1.5">
            <span className="text-sm font-medium" style={{ color: C.text }}>
              Valor Unit. <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="number"
            value={item.valor_unitario}
            onChange={(e) => onUpdate(index, { ...item, valor_unitario: Number(e.target.value) })}
            min="0.01"
            step="0.01"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: C.bg,
              borderColor: C.border,
              color: C.text,
            }}
          />
        </div>
      </div>

      {/* Valor total */}
      <div
        className="rounded-lg p-3 flex items-center justify-between"
        style={{ backgroundColor: C.bg }}
      >
        <span className="text-sm font-medium" style={{ color: C.textMuted }}>
          Valor Total
        </span>
        <span className="text-lg font-bold" style={{ color: C.accent }}>
          R$ {valorTotal.toFixed(2)}
        </span>
      </div>

      {/* Dados fiscais (se habilitado) */}
      {mostrarDadosFiscais && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4" style={{ color: C.textMuted }} />
            <span className="text-xs font-bold uppercase" style={{ color: C.textMuted }}>
              Dados Fiscais
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block mb-1">
                <span className="text-xs font-medium" style={{ color: C.textMuted }}>
                  NCM
                </span>
              </label>
              <input
                type="text"
                value={item.ncm || ''}
                onChange={(e) => {
                  const valor = e.target.value.replace(/\D/g, '').slice(0, 8);
                  onUpdate(index, { ...item, ncm: valor });
                }}
                placeholder="00000000"
                maxLength={8}
                className="w-full px-2 py-1.5 rounded-lg border text-xs font-mono focus:outline-none focus:ring-1 transition-colors"
                style={{
                  backgroundColor: C.bg,
                  borderColor: item.ncm && item.ncm !== '00000000' ? C.success : C.border,
                  color: C.text,
                }}
              />
            </div>

            <div>
              <label className="block mb-1">
                <span className="text-xs font-medium" style={{ color: C.textMuted }}>
                  CFOP
                </span>
              </label>
              <input
                type="number"
                value={item.cfop || 5102}
                onChange={(e) => onUpdate(index, { ...item, cfop: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border text-xs font-mono focus:outline-none focus:ring-1 transition-colors"
                style={{
                  backgroundColor: C.bg,
                  borderColor: C.border,
                  color: C.text,
                }}
              />
            </div>

            <div>
              <label className="block mb-1">
                <span className="text-xs font-medium" style={{ color: C.textMuted }}>
                  Origem
                </span>
              </label>
              <select
                value={item.origem_produto ?? 0}
                onChange={(e) => onUpdate(index, { ...item, origem_produto: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-colors"
                style={{
                  backgroundColor: C.bg,
                  borderColor: C.border,
                  color: C.text,
                }}
              >
                <option value={0}>0 - Nacional</option>
                <option value={1}>1 - Estrangeira</option>
                <option value={2}>2 - Estrangeira (BR)</option>
              </select>
            </div>
          </div>

          {item.ncm === '00000000' && (
            <p className="text-xs mt-2" style={{ color: C.warning }}>
              ⚠️ NCM 00000000 é inválido para NF-e modelo 55
            </p>
          )}
        </div>
      )}
    </div>
  );
}
