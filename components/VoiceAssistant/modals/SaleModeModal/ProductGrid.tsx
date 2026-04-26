// components/VoiceAssistant/modals/SaleModeModal/ProductGrid.tsx
// v2 — clique em qualquer parte do card adiciona ao carrinho
// Usa <img> nativo (não Next.js Image) pois clientes usam URLs de domínios externos variados

'use client';

import { useState, useMemo } from 'react';
import type { ProdutoVenda } from '@/lib/produtos-venda';
import { formatarPreco } from '@/lib/produtos-venda';
import { useCart } from '@/hooks/useCart';
import { createClient } from '@/lib/supabase-browser';
import OpcionaisProdutoModal, { type OpcaoSelecionada } from './OpcionaisProdutoModal';

interface ProductGridProps {
  produtos: ProdutoVenda[];
  categorias: string[];
  loading: boolean;
  theme: 'dark' | 'light';
  produtoDestaque?: ProdutoVenda | null;
  onProdutoDestaqueClear?: () => void;
  hideBusca?: boolean;
  termoBusca?: string;
  onOpenBarcodeScanner?: () => void;
}

export default function ProductGrid({
  produtos,
  categorias,
  loading,
  theme,
  produtoDestaque,
  onProdutoDestaqueClear,
  hideBusca = false,
  termoBusca = '',
  onOpenBarcodeScanner,
}: ProductGridProps) {
  const { addItem, itens } = useCart();
  const [categoria, setCategoria] = useState<string>('');
  const [feedbacks, setFeedbacks] = useState<Record<string, boolean>>({});
  const [produtoOpcionais, setProdutoOpcionais] = useState<{ produto: ProdutoVenda; quantidade: number } | null>(null);
  const isDark = theme === 'dark';

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchBusca =
        !termoBusca ||
        p.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
        p.descricao?.toLowerCase().includes(termoBusca.toLowerCase()) ||
        p.ean?.includes(termoBusca);
      const matchCat = !categoria || p.categoria === categoria;
      return matchBusca && matchCat;
    });
  }, [produtos, termoBusca, categoria]);

  const getQtdNoCarrinho = (produtoId: string) =>
    itens.find((i) => i.produto.id === produtoId)?.quantidade ?? 0;

  const handleAdd = async (produto: ProdutoVenda) => {
    if (produto.controla_estoque) {
      const qtdAtual = getQtdNoCarrinho(produto.id);
      if (qtdAtual >= produto.estoque_atual) return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from('produto_opcoes_grupos')
      .select('id')
      .eq('produto_id', produto.id)
      .limit(1);

    if (data && data.length > 0) {
      setProdutoOpcionais({ produto, quantidade: 1 });
    } else {
      addItem(produto);
      setFeedbacks((prev) => ({ ...prev, [produto.id]: true }));
      setTimeout(() => setFeedbacks((prev) => ({ ...prev, [produto.id]: false })), 600);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${
            isDark ? 'border-white/30' : 'border-gray-300'
          }`} />
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            Carregando produtos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2">

      {/* Pills de categoria + botão scanner */}
      {(categorias.length > 0 || onOpenBarcodeScanner) && (
        <div className="flex-shrink-0 flex gap-1.5 flex-wrap items-center">

          {/* ── Botão Scanner PDV ── */}
          {onOpenBarcodeScanner && (
            <button
              onClick={onOpenBarcodeScanner}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border flex-shrink-0 ${
                isDark
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-500/50'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5v14M7 5v14M11 5v14M15 5v4M15 15v4M19 5v4M19 15v4M15 11h4"/>
              </svg>
              Cód. Barras
            </button>
          )}

          {/* ── Pill "Todos" ── */}
          {categorias.length > 0 && (
            <button
              onClick={() => setCategoria('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                categoria === ''
                  ? isDark
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : isDark
                    ? 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                    : 'bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              Todos
            </button>
          )}

          {/* ── Pills de categoria ── */}
          {categorias.map((c) => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                categoria === c
                  ? isDark
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : isDark
                    ? 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                    : 'bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Card destaque */}
      {produtoDestaque && (
        <div className={`flex-shrink-0 rounded-xl border-2 p-2.5 flex items-center gap-2.5 ${
          isDark
            ? 'bg-emerald-500/10 border-emerald-500/40'
            : 'bg-emerald-50 border-emerald-300'
        }`}>
          <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
          }`}>
            Sugestão
          </div>
          <span className={`flex-1 text-xs font-medium truncate ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>{produtoDestaque.nome}</span>
          <span className={`text-xs font-bold flex-shrink-0 ${
            isDark ? 'text-emerald-300' : 'text-emerald-700'
          }`}>{formatarPreco(produtoDestaque.preco_venda)}</span>
          <button
            onClick={() => handleAdd(produtoDestaque)}
            className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95"
          >
            + Adicionar
          </button>
          <button
            onClick={onProdutoDestaqueClear}
            className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${
              isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'
            }`}
          >✕</button>
        </div>
      )}

      {/* Grid de produtos */}
      {produtosFiltrados.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center gap-2 ${
          isDark ? 'text-white/25' : 'text-gray-300'
        }`}>
          <svg className="w-9 h-9 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-xs">
            {termoBusca ? `Nenhum resultado para "${termoBusca}"` : 'Nenhum produto encontrado'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 pb-2">
            {produtosFiltrados.map((produto) => {
              const qtdCarrinho = getQtdNoCarrinho(produto.id);
              const semEstoque = produto.controla_estoque && produto.estoque_atual <= 0;
              const feedback = feedbacks[produto.id];

              return (
                // ── Card clicável inteiro ──────────────────────────────────
                <div
                  key={produto.id}
                  onClick={() => !semEstoque && handleAdd(produto)}
                  className={`relative rounded-xl border transition-all duration-200 overflow-hidden select-none ${
                    semEstoque
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer active:scale-95'
                  } ${
                    feedback
                      ? isDark
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : 'border-emerald-400 bg-emerald-50'
                      : isDark
                        ? 'bg-white/4 border-white/8 hover:border-white/20 hover:bg-white/6'
                        : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md shadow-sm'
                  }`}
                >
                  {/* Badge qtd no carrinho */}
                  {qtdCarrinho > 0 && (
                    <div className="absolute top-1 right-1 z-10 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                      {qtdCarrinho}
                    </div>
                  )}

                  {/* Imagem */}
                  <div className={`w-full aspect-[4/3] relative overflow-hidden ${
                    isDark ? 'bg-white/4' : 'bg-gray-50'
                  }`}>
                    {produto.imagem_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={produto.imagem_url}
                        alt={produto.nome}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className={`w-6 h-6 ${isDark ? 'text-white/12' : 'text-gray-300'}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {semEstoque && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-[9px] font-bold bg-red-500/80 px-1.5 py-0.5 rounded-full">
                          Sem estoque
                        </span>
                      </div>
                    )}
                    {/* Flash de feedback no centro da imagem */}
                    {feedback && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-1.5">
                    <p className={`text-[10px] font-semibold truncate mb-0.5 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {produto.nome}
                    </p>
                    {produto.descricao && (
                      <p className={`text-[9px] truncate mb-0.5 ${
                        isDark ? 'text-white/35' : 'text-gray-500'
                      }`}>
                        {produto.descricao}
                      </p>
                    )}
                    {/* Preço em linha própria, sem botão + ao lado */}
                    <span className={`text-[10px] font-bold block ${
                      isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      {formatarPreco(produto.preco_venda)}
                    </span>

                    {produto.controla_estoque && produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo && (
                      <p className="text-[9px] text-amber-500 mt-0.5 font-medium">
                        ⚠ Últimas {produto.estoque_atual} un.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de opcionais */}
      {produtoOpcionais && (
        <OpcionaisProdutoModal
          produto={produtoOpcionais.produto}
          quantidade={produtoOpcionais.quantidade}
          theme={theme}
          onConfirmar={(opcoes: OpcaoSelecionada[], totalAdicional: number) => {
            const produtoComOpcoes = {
              ...produtoOpcionais.produto,
              preco_venda: produtoOpcionais.produto.preco_venda + totalAdicional,
              _opcoes_selecionadas: opcoes,
            };
            addItem(produtoComOpcoes as any);
            setFeedbacks((prev) => ({ ...prev, [produtoOpcionais.produto.id]: true }));
            setTimeout(() => setFeedbacks((prev) => ({ ...prev, [produtoOpcionais.produto.id]: false })), 600);
            setProdutoOpcionais(null);
          }}
          onCancelar={() => setProdutoOpcionais(null)}
        />
      )}
    </div>
  );
}
