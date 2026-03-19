// components/VoiceAssistant/modals/SaleModeModal.tsx
// Modal principal do Modo Venda
// Abre via createPortal sobre o conteúdo inteiro (igual ao padrão existente)
// Layout: header fixo + carrossel visível + área principal (70/30)

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CartProvider, useCart } from '@/hooks/useCart';
import ProductGrid from './SaleModeModal/ProductGrid';
import CartPanel from './SaleModeModal/CartPanel';
import CheckoutFlow from './SaleModeModal/CheckoutFlow';
import { listarProdutos, listarCategorias } from '@/lib/produtos-venda';
import type { ProdutoVenda } from '@/lib/produtos-venda';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SaleModeModalProps {
  companyId: string;
  theme: 'dark' | 'light';
  onClose: () => void;
  playText?: (text: string) => Promise<void>;
  /** Produto pré-selecionado pelo voice assistant */
  produtoDestaque?: ProdutoVenda | null;
}

// ─── Inner (precisa do CartProvider acima) ────────────────────────────────────

function SaleModeInner({
  companyId,
  theme,
  onClose,
  playText,
  produtoDestaque: produtoDestaqueInicial,
}: SaleModeModalProps) {
  const isDark = theme === 'dark';
  const { totalItens } = useCart();

  const [produtos, setProdutos] = useState<ProdutoVenda[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [produtoDestaque, setProdutoDestaque] = useState<ProdutoVenda | null>(
    produtoDestaqueInicial ?? null,
  );
  const [showCheckout, setShowCheckout] = useState(false);

  // Carrega produtos
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoadingProdutos(true);
      try {
        const [prods, cats] = await Promise.all([
          listarProdutos(companyId),
          listarCategorias(companyId),
        ]);
        if (!mounted) return;
        setProdutos(prods);
        setCategorias(cats);
      } catch (err) {
        console.error('Erro ao carregar produtos:', err);
      } finally {
        if (mounted) setLoadingProdutos(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [companyId]);

  // ESC fecha o modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showCheckout) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, showCheckout]);

  const handleCheckout = useCallback(() => {
    if (totalItens === 0) return;
    setShowCheckout(true);
  }, [totalItens]);

  return (
    <div
      className={`
        fixed inset-0 z-[150] flex flex-col
        transition-colors duration-300
        ${isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100'}
      `}
    >
      {/* ── Barra de título do Modo Venda ────────────────────────── */}
      <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b ${
        isDark
          ? 'bg-slate-900/70 border-white/8 backdrop-blur-xl'
          : 'bg-white/80 border-gray-200 backdrop-blur-xl'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
          }`}>
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Modo Venda
          </span>
          {produtos.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isDark ? 'bg-white/8 text-white/50' : 'bg-gray-100 text-gray-500'
            }`}>
              {produtos.length} produtos
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isDark
              ? 'text-white/40 hover:text-white hover:bg-white/10'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
          aria-label="Fechar modo venda"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Área principal ──────────────────────────────────────────── */}
      <div className="flex-1 flex gap-3 overflow-hidden px-3 py-3 min-h-0">

        {/* ── CHECKOUT OVERLAY ──────────────────────────────────────── */}
        {showCheckout ? (
          <div className="flex-1 flex items-start justify-center overflow-y-auto pt-6">
            <div className={`w-full max-w-sm rounded-2xl border p-5 ${
              isDark
                ? 'bg-slate-900/80 border-white/10 backdrop-blur-xl'
                : 'bg-white border-gray-200 shadow-xl'
            }`}>
              <CheckoutFlow
                companyId={companyId}
                theme={theme}
                onClose={() => { setShowCheckout(false); onClose(); }}
                playText={playText}
              />
              <button
                onClick={() => setShowCheckout(false)}
                className={`w-full mt-3 py-2 rounded-xl text-xs transition-colors ${
                  isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                ← Voltar ao carrinho
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── PAINEL ESQUERDO: Produtos (70%) ──────────────────── */}
            <div className="flex-[7] flex flex-col min-w-0 overflow-hidden">
              <ProductGrid
                produtos={produtos}
                categorias={categorias}
                loading={loadingProdutos}
                theme={theme}
                produtoDestaque={produtoDestaque}
                onProdutoDestaqueClear={() => setProdutoDestaque(null)}
              />
            </div>

            {/* ── PAINEL DIREITO (30%) ──────────────────────────────── */}
            <div className="flex-[3] flex flex-col gap-3 min-w-0">

              {/* Card avatar mini — micro-assistente de voz */}
              <div className={`flex-shrink-0 rounded-2xl border p-3 flex flex-col items-center gap-2 ${
                isDark
                  ? 'bg-white/3 border-white/8'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                {/* Avatar simplificado (ícone verde animado) */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
                }`}>
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <p className={`text-[10px] text-center ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  Diga o produto ou clique para adicionar
                </p>
              </div>

              {/* CartPanel (resto do espaço) */}
              <div className="flex-1 min-h-0">
                <CartPanel theme={theme} onCheckout={handleCheckout} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Export (com CartProvider) ────────────────────────────────────────────────

export default function SaleModeModal(props: SaleModeModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof window === 'undefined') return null;

  return createPortal(
    <CartProvider>
      <SaleModeInner {...props} />
    </CartProvider>,
    document.body,
  );
}
