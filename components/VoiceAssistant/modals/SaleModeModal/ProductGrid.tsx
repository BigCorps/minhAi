// components/VoiceAssistant/modals/SaleModeModal/ProductGrid.tsx
// Painel esquerdo do Modo Venda (70%)
// Grid de cards de produto com busca e filtro por categoria

'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import type { ProdutoVenda } from '@/lib/produtos-venda';
import { formatarPreco } from '@/lib/produtos-venda';
import { useCart } from '@/hooks/useCart';

interface ProductGridProps {
  produtos: ProdutoVenda[];
  categorias: string[];
  loading: boolean;
  theme: 'dark' | 'light';
  /** Produto destacado pelo voice assistant */
  produtoDestaque?: ProdutoVenda | null;
  onProdutoDestaqueClear?: () => void;
}

export default function ProductGrid({
  produtos,
  categorias,
  loading,
  theme,
  produtoDestaque,
  onProdutoDestaqueClear,
}: ProductGridProps) {
  const { addItem, itens } = useCart();
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<string>('');
  const [feedbacks, setFeedbacks] = useState<Record<string, boolean>>({});

  const isDark = theme === 'dark';

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchBusca =
        !busca ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
        p.ean?.includes(busca);
      const matchCat = !categoria || p.categoria === categoria;
      return matchBusca && matchCat;
    });
  }, [produtos, busca, categoria]);

  const getQtdNoCarrinho = (produtoId: string) =>
    itens.find((i) => i.produto.id === produtoId)?.quantidade ?? 0;

  const handleAdd = (produto: ProdutoVenda) => {
    // Verifica estoque se controla_estoque ativo
    if (produto.controla_estoque) {
      const qtdAtual = getQtdNoCarrinho(produto.id);
      if (qtdAtual >= produto.estoque_atual) return; // sem estoque
    }
    addItem(produto);
    // Feedback visual momentâneo
    setFeedbacks((prev) => ({ ...prev, [produto.id]: true }));
    setTimeout(() => setFeedbacks((prev) => ({ ...prev, [produto.id]: false })), 600);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className={`w-10 h-10 border-2 border-t-transparent rounded-full animate-spin ${
            isDark ? 'border-white/30' : 'border-gray-300'
          }`} />
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Carregando produtos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── Barra de busca + filtro de categoria ── */}
      <div className="flex gap-2 flex-shrink-0">
        {/* Busca */}
        <div className="relative flex-1">
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDark ? 'text-white/30' : 'text-gray-400'
            }`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-colors ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'
            }`}
          />
        </div>

        {/* Categoria */}
        {categorias.length > 0 && (
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className={`px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors min-w-[120px] ${
              isDark
                ? 'bg-white/5 border-white/10 text-white focus:border-white/30'
                : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400'
            }`}
          >
            <option value="">Todos</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Card destaque (produto sugerido pelo voice assistant) ── */}
      {produtoDestaque && (
        <div className={`flex-shrink-0 rounded-2xl border-2 p-3 flex items-center gap-3 ${
          isDark
            ? 'bg-emerald-500/10 border-emerald-500/40'
            : 'bg-emerald-50 border-emerald-300'
        }`}>
          <div className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
            isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
          }`}>
            Assistente sugere
          </div>
          <span className={`flex-1 text-sm font-medium truncate ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>{produtoDestaque.nome}</span>
          <span className={`text-sm font-bold flex-shrink-0 ${
            isDark ? 'text-emerald-300' : 'text-emerald-700'
          }`}>{formatarPreco(produtoDestaque.preco_venda)}</span>
          <button
            onClick={() => handleAdd(produtoDestaque)}
            className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
          >
            Adicionar
          </button>
          <button
            onClick={onProdutoDestaqueClear}
            className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors ${
              isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'
            }`}
          >✕</button>
        </div>
      )}

      {/* ── Grid de produtos ── */}
      {produtosFiltrados.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center gap-2 ${
          isDark ? 'text-white/30' : 'text-gray-400'
        }`}>
          <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm">Nenhum produto encontrado</p>
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="text-xs underline opacity-60"
            >limpar busca</button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
            {produtosFiltrados.map((produto) => {
              const qtdCarrinho = getQtdNoCarrinho(produto.id);
              const semEstoque =
                produto.controla_estoque && produto.estoque_atual <= 0;
              const feedback = feedbacks[produto.id];

              return (
                <div
                  key={produto.id}
                  className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${
                    semEstoque ? 'opacity-40' : ''
                  } ${
                    isDark
                      ? 'bg-white/5 border-white/8 hover:border-white/20'
                      : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  {/* Badge quantidade no carrinho */}
                  {qtdCarrinho > 0 && (
                    <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                      {qtdCarrinho}
                    </div>
                  )}

                  {/* Imagem */}
                  <div className={`w-full aspect-square relative overflow-hidden ${
                    isDark ? 'bg-white/5' : 'bg-gray-50'
                  }`}>
                    {produto.imagem_url ? (
                      <Image
                        src={produto.imagem_url}
                        alt={produto.nome}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          className={`w-10 h-10 ${isDark ? 'text-white/15' : 'text-gray-300'}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Overlay sem estoque */}
                    {semEstoque && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold bg-red-500/80 px-2 py-0.5 rounded-full">
                          Sem estoque
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p className={`text-xs font-semibold truncate mb-0.5 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {produto.nome}
                    </p>
                    {produto.descricao && (
                      <p className={`text-[10px] truncate mb-1 ${
                        isDark ? 'text-white/40' : 'text-gray-500'
                      }`}>
                        {produto.descricao}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm font-bold ${
                        isDark ? 'text-emerald-400' : 'text-emerald-600'
                      }`}>
                        {formatarPreco(produto.preco_venda)}
                      </span>
                      <button
                        onClick={() => handleAdd(produto)}
                        disabled={semEstoque}
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                          feedback
                            ? 'bg-emerald-500 scale-110'
                            : semEstoque
                              ? 'bg-gray-400/30 cursor-not-allowed'
                              : isDark
                                ? 'bg-white/10 hover:bg-emerald-500 text-white'
                                : 'bg-gray-100 hover:bg-emerald-500 hover:text-white text-gray-700'
                        }`}
                      >
                        {feedback ? (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Estoque baixo */}
                    {produto.controla_estoque && produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo && (
                      <p className="text-[9px] text-amber-500 mt-1 font-medium">
                        ⚠ Últimas {produto.estoque_atual} unidades
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
