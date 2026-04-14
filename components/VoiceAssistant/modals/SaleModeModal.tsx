// components/VoiceAssistant/modals/SaleModeModal.tsx — v10
//
// VERSÃO HÍBRIDA: Suporta dois modos de renderização
//
// isFullscreen=false (padrão) → Modal normal dentro do VoiceAssistant
//   - absolute inset-0 z-40 rounded-2xl
//   - Sem header/footer
//   - Usado quando chamado via função (carrossel/voz)
//
// isFullscreen=true → Tela cheia via portal
//   - fixed inset-0 z-[200] via createPortal
//   - Com SlugHeader completo (pageType='vendas')
//   - Com footer (contador)
//   - Usado na página /vendas/[slug]
//
// Cards da sidebar (landscape) e da barra inferior (portrait) são
// colapsáveis da mesma forma: clique no cabeçalho expande/recolhe.
// Estado compartilhado: expandedCard ('avatar' | 'cart' | null)

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase-browser';
import { CartProvider, useCart } from '@/hooks/useCart';
import ProductGrid from './SaleModeModal/ProductGrid';
import CartPanel from './SaleModeModal/CartPanel';
import CheckoutFlow from './SaleModeModal/CheckoutFlow';
import BarcodePdvModal from '@/components/assistant/BarcodePdvModal';
import { AvatarFace } from '@/components/AvatarFace';
import TextInputChat from '@/components/VoiceAssistant/TextInputChat';
import { listarProdutos, listarCategorias } from '@/lib/produtos-venda';
import type { ProdutoVenda } from '@/lib/produtos-venda';
import SlugHeader from '@/components/slug/SlugHeader';

export interface SaleModeModalProps {
  companyId: string;
  slug?: string;
  companyName?: string;
  companyLogo?: string | null;
  assistantRole?: string;
  modo_vendas_enabled?: boolean;
  modo_fila_enabled?: boolean;
  theme: 'dark' | 'light';
  onClose: () => void;
  playText?: (text: string) => Promise<void>;
  produtoDestaque?: ProdutoVenda | null;
  isListening?: boolean;
  isProcessing?: boolean;
  isPlayingAudio?: boolean;
  isTranscribing?: boolean;
  onMicDown?: () => void;
  onMicUp?: () => void;
  onTextMessage?: (msg: string) => Promise<void>;
  isFullscreen?: boolean;
  produtoInicial?: ProdutoVenda & { _opcoes_selecionadas?: any[]; _quantidade?: number };
  quantidadeInicial?: number;
  opcoesIniciais?: any[];
  profile?: { nome: string; email?: string | null; identificador?: string | null } | null;
}

function getIsPortrait() {
  if (typeof screen !== 'undefined' && screen.orientation?.type) {
    return screen.orientation.type.startsWith('portrait');
  }
  return window.innerHeight > window.innerWidth;
}

function SaleModeInner({
  companyId,
  slug,
  companyName = 'Modo Vendas',
  companyLogo,
  assistantRole,
  modo_vendas_enabled = true,
  modo_fila_enabled = false,
  theme,
  onClose,
  playText,
  produtoDestaque: produtoDestaqueInicial,
  isListening = false,
  isProcessing = false,
  isPlayingAudio = false,
  isTranscribing = false,
  onMicDown,
  onMicUp,
  onTextMessage,
  isFullscreen = false,
  produtoInicial,
  quantidadeInicial,
  profile,
}: SaleModeModalProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const effectiveTheme = (resolvedTheme ?? theme) as 'dark' | 'light';
  const isDark = effectiveTheme === 'dark';

  const handleToggleTheme = useCallback(() => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  }, [effectiveTheme, setTheme]);

  const { totalItens, addItem } = useCart();

  const [produtos, setProdutos] = useState<ProdutoVenda[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [produtoDestaque, setProdutoDestaque] = useState<ProdutoVenda | null>(
    produtoDestaqueInicial ?? null,
  );
  const [showCheckout, setShowCheckout] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [metodosAtivos, setMetodosAtivos] = useState<string[]>([]);

  // ── Scanner PDV ──────────────────────────────────────────────────────────
  const [showPdvScanner, setShowPdvScanner] = useState(false);

  const handleProductScanned = useCallback((produto: ProdutoVenda) => {
    addItem(produto as any);
  }, [addItem]);

  // ── Cards colapsáveis — compartilhado entre portrait e landscape ─────────
  // null = ambos expandidos; 'avatar' | 'cart' = apenas um expandido
  const [expandedCard, setExpandedCard] = useState<'avatar' | 'cart' | null>(null);

  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    };
  }, []);

  useEffect(() => {
    const update = () => setIsPortrait(getIsPortrait());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    if (screen.orientation) screen.orientation.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (screen.orientation) screen.orientation.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    let m = true;
    async function load() {
      setLoadingProdutos(true);
      try {
        const [prods, cats] = await Promise.all([
          listarProdutos(companyId),
          listarCategorias(companyId),
        ]);
        if (!m) return;
        setProdutos(prods);
        setCategorias(cats);
      } catch (err) {
        console.error('Erro ao carregar produtos:', err);
      } finally {
        if (m) setLoadingProdutos(false);
      }
    }
    load();
    return () => { m = false; };
  }, [companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showCheckout && !showPdvScanner) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, showCheckout, showPdvScanner]);

  useEffect(() => {
    async function loadMetodos() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('company_function_settings')
          .select('function_key, is_enabled')
          .eq('company_id', companyId)
          .in('function_key', [
            'pix_generate',
            'nfc_debito', 'nfc_credito',
            'tef_debito', 'tef_credito',
            'dinheiro',
          ]);

        const ativos: string[] = [];
        (data ?? []).forEach((r: any) => {
          if (r.is_enabled) ativos.push(r.function_key);
        });
        setMetodosAtivos(ativos);
      } catch {
        setMetodosAtivos([]);
      }
    }
    loadMetodos();
  }, [companyId]);

  useEffect(() => {
    if (!produtoInicial) return;
    const qty = quantidadeInicial ?? produtoInicial._quantidade ?? 1;
    for (let i = 0; i < qty; i++) {
      addItem(produtoInicial as any);
    }
    setTimeout(() => setShowCheckout(false), 100);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckout = useCallback(() => {
    if (totalItens === 0) return;
    setShowCheckout(true);
  }, [totalItens]);

  // ── Avatar node (reutilizado nos dois layouts) ───────────────────────────
  const avatarNode = (
    <div
      className="relative cursor-pointer select-none"
      style={{ width: 80, height: 80 }}
      onMouseDown={onMicDown}
      onMouseUp={onMicUp}
      onTouchStart={(e) => { e.preventDefault(); onMicDown?.(); }}
      onTouchEnd={(e) => { e.preventDefault(); onMicUp?.(); }}
    >
      {isListening && (
        <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30 pointer-events-none" />
      )}
      <div className="w-full h-full overflow-hidden rounded-full">
        <div style={{ transform: 'scale(0.417)', transformOrigin: 'top left', width: 192, height: 192, pointerEvents: 'none' }}>
          <AvatarFace
            isListening={isListening}
            isSpeaking={isPlayingAudio}
            isProcessing={isProcessing || isTranscribing}
            theme={effectiveTheme}
            qrCodeData={null}
            pixConfirmationData={null}
            onCloseQRCode={() => {}}
            onCopyQRCode={() => {}}
            onConfirmPix={() => {}}
            onCancelPix={() => {}}
          />
        </div>
      </div>
    </div>
  );

  const avatarLabel = (
    <p className={`text-[9px] text-center leading-tight ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
      {isListening ? 'Ouvindo...' : isTranscribing ? 'Transcrevendo...' : isProcessing || isPlayingAudio ? 'Processando...' : 'Segure para falar'}
    </p>
  );

  // ── Mini avatar (cabeçalho dos cards colapsáveis) ────────────────────────
  const miniAvatar = (
    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 relative">
      {isListening && (
        <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-40 pointer-events-none" />
      )}
      <div style={{ transform: 'scale(0.146)', transformOrigin: 'top left', width: 192, height: 192, pointerEvents: 'none' }}>
        <AvatarFace
          isListening={isListening}
          isSpeaking={isPlayingAudio}
          isProcessing={isProcessing || isTranscribing}
          theme={effectiveTheme}
          qrCodeData={null}
          pixConfirmationData={null}
          onCloseQRCode={() => {}}
          onCopyQRCode={() => {}}
          onConfirmPix={() => {}}
          onCancelPix={() => {}}
        />
      </div>
    </div>
  );

  // ── Conteúdo expandido do card avatar (reutilizado portrait + landscape) ─
  const avatarExpandedContent = (
    <div className="flex flex-col items-center gap-2 px-3 pb-3">
      <div className="flex items-center justify-center w-full">
        <div
          className="relative cursor-pointer select-none"
          style={{ width: 80, height: 80 }}
          onMouseDown={onMicDown}
          onMouseUp={onMicUp}
          onTouchStart={(e) => { e.preventDefault(); onMicDown?.(); }}
          onTouchEnd={(e) => { e.preventDefault(); onMicUp?.(); }}
        >
          {isListening && (
            <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30 pointer-events-none" />
          )}
          <div className="w-full h-full overflow-hidden rounded-full">
            <div style={{ transform: 'scale(0.417)', transformOrigin: 'top left', width: 192, height: 192, pointerEvents: 'none' }}>
              <AvatarFace
                isListening={isListening}
                isSpeaking={isPlayingAudio}
                isProcessing={isProcessing || isTranscribing}
                theme={effectiveTheme}
                qrCodeData={null}
                pixConfirmationData={null}
                onCloseQRCode={() => {}}
                onCopyQRCode={() => {}}
                onConfirmPix={() => {}}
                onCancelPix={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
      {avatarLabel}
      {onTextMessage && (
        <div className="w-full">
          <TextInputChat
            onSendMessage={onTextMessage}
            isProcessing={isProcessing || isPlayingAudio || isTranscribing}
            theme={effectiveTheme}
            disabled={false}
            compact
          />
        </div>
      )}
      {!isFullscreen && (
        <button
          onClick={onClose}
          className={`text-[10px] ${isDark ? 'text-white/25 hover:text-white/50' : 'text-gray-300 hover:text-gray-500'}`}
        >
          Fechar modo vendas
        </button>
      )}
    </div>
  );

  // ── gridAndCart — portrait ───────────────────────────────────────────────
  const gridAndCartPortrait = (
    <>
      {/* Produtos — ocupa o espaço restante */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ProductGrid
          produtos={produtos}
          categorias={categorias}
          loading={loadingProdutos}
          theme={effectiveTheme}
          produtoDestaque={produtoDestaque}
          onProdutoDestaqueClear={() => setProdutoDestaque(null)}
          hideBusca
          onOpenBarcodeScanner={() => setShowPdvScanner(true)}
        />
      </div>

      {/* Barra inferior: avatar + carrinho como cards-botão */}
      <div className="flex-shrink-0 flex gap-2 pt-1">

        {/* ── Card Avatar (portrait) ── */}
        <div className={`flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
          isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'
        } ${expandedCard === 'avatar' ? 'flex-1' : expandedCard === 'cart' ? 'w-14 flex-shrink-0' : 'w-[140px] flex-shrink-0'}`}>

          <button
            className={`flex items-center gap-2 px-3 py-2 w-full transition-colors ${
              isDark ? 'hover:bg-white/5 active:bg-white/8' : 'hover:bg-gray-100 active:bg-gray-150'
            }`}
            onClick={() => setExpandedCard(p => p === 'avatar' ? null : 'avatar')}
          >
            {miniAvatar}
            {expandedCard !== 'cart' && (
              <span className={`text-[10px] font-medium truncate flex-1 text-left ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                {isListening ? 'Ouvindo...' : isProcessing || isPlayingAudio ? 'Processando...' : 'Assistente'}
              </span>
            )}
            <svg
              className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${expandedCard === 'avatar' ? 'rotate-180' : ''} ${isDark ? 'text-white/30' : 'text-gray-400'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {expandedCard === 'avatar' && avatarExpandedContent}
        </div>

        {/* ── Card Carrinho (portrait) ── */}
        <div className={`flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
          isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'
        } ${expandedCard === 'cart' ? 'flex-1' : expandedCard === 'avatar' ? 'w-14 flex-shrink-0' : 'flex-1'}`}>

          <button
            className={`flex items-center gap-2 px-3 py-2 w-full transition-colors ${
              isDark ? 'hover:bg-white/5 active:bg-white/8' : 'hover:bg-gray-100 active:bg-gray-150'
            }`}
            onClick={() => setExpandedCard(p => p === 'cart' ? null : 'cart')}
          >
            <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-white/50' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {expandedCard !== 'avatar' && (
              <span className={`text-[10px] font-medium flex-1 text-left truncate ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Carrinho
              </span>
            )}
            {totalItens > 0 && expandedCard !== 'avatar' && (
              <span className="flex-shrink-0 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {totalItens}
              </span>
            )}
            <svg
              className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${expandedCard === 'cart' ? 'rotate-180' : ''} ${isDark ? 'text-white/30' : 'text-gray-400'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {expandedCard === 'cart' && (
            <div className="flex-1 min-h-0 overflow-hidden px-1 pb-2">
              <CartPanel theme={effectiveTheme} onCheckout={handleCheckout} />
            </div>
          )}

          {expandedCard !== 'cart' && totalItens > 0 && (
            <div
              className="px-3 pb-2 cursor-pointer"
              onClick={() => setExpandedCard('cart')}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleCheckout(); }}
                className="w-full py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold transition-colors"
              >
                Finalizar pedido
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // ── gridAndCart — landscape ──────────────────────────────────────────────
  const gridAndCartLandscape = (
    <>
      {/* Produtos */}
      <div className="flex flex-col min-w-0 overflow-hidden flex-[7]">
        <ProductGrid
          produtos={produtos}
          categorias={categorias}
          loading={loadingProdutos}
          theme={effectiveTheme}
          produtoDestaque={produtoDestaque}
          onProdutoDestaqueClear={() => setProdutoDestaque(null)}
          hideBusca
          onOpenBarcodeScanner={() => setShowPdvScanner(true)}
        />
      </div>

      {/* Sidebar: Avatar + Carrinho como cards colapsáveis verticais */}
      <div className="flex flex-col min-w-0 overflow-hidden gap-2 flex-[1.5]">

        {/* ── Card Avatar (landscape) ── */}
        <div className={`flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
          isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'
        } ${
          expandedCard === 'avatar'
            ? 'flex-1'
            : expandedCard === 'cart'
            ? 'flex-shrink-0'
            : 'flex-shrink-0'
        }`}>

          {/* Cabeçalho clicável */}
          <button
            className={`flex items-center gap-2 px-3 py-2 w-full transition-colors ${
              isDark ? 'hover:bg-white/5 active:bg-white/8' : 'hover:bg-gray-100 active:bg-gray-150'
            }`}
            onClick={() => setExpandedCard(p => p === 'avatar' ? null : 'avatar')}
          >
            {miniAvatar}
            <span className={`text-[10px] font-medium truncate flex-1 text-left ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              {isListening ? 'Ouvindo...' : isProcessing || isPlayingAudio ? 'Processando...' : 'Assistente'}
            </span>
            {/* Botão fechar no cabeçalho quando não expandido e não fullscreen */}
            {!isFullscreen && expandedCard !== 'avatar' && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isDark ? 'text-white/30 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <svg
              className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${expandedCard === 'avatar' ? 'rotate-180' : ''} ${isDark ? 'text-white/30' : 'text-gray-400'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Conteúdo expandido */}
          {expandedCard === 'avatar' && avatarExpandedContent}

          {/* Estado padrão (nenhum expandido): mostra avatar centralizado */}
          {expandedCard === null && (
            <div className="flex flex-col items-center gap-1 pt-1 pb-2 px-2">
              {avatarNode}
              {avatarLabel}
              {onTextMessage && (
                <div className="w-full mt-0.5">
                  <TextInputChat
                    onSendMessage={onTextMessage}
                    isProcessing={isProcessing || isPlayingAudio || isTranscribing}
                    theme={effectiveTheme}
                    disabled={false}
                    compact
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Card Carrinho (landscape) ── */}
        <div className={`flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
          isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'
        } ${
          expandedCard === 'cart'
            ? 'flex-1'
            : expandedCard === 'avatar'
            ? 'flex-shrink-0'
            : 'flex-1 min-h-0'
        }`}>

          {/* Cabeçalho clicável */}
          <button
            className={`flex items-center gap-2 px-3 py-2 w-full transition-colors flex-shrink-0 ${
              isDark ? 'hover:bg-white/5 active:bg-white/8' : 'hover:bg-gray-100 active:bg-gray-150'
            }`}
            onClick={() => setExpandedCard(p => p === 'cart' ? null : 'cart')}
          >
            <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-white/50' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className={`text-[10px] font-medium flex-1 text-left truncate ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Carrinho
            </span>
            {totalItens > 0 && (
              <span className="flex-shrink-0 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {totalItens}
              </span>
            )}
            <svg
              className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${expandedCard === 'cart' ? 'rotate-180' : ''} ${isDark ? 'text-white/30' : 'text-gray-400'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Conteúdo: sempre visível em null ou cart, oculto em avatar */}
          {expandedCard !== 'avatar' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <CartPanel theme={effectiveTheme} onCheckout={handleCheckout} />
            </div>
          )}

          {/* Resumo compacto quando avatar está expandido */}
          {expandedCard === 'avatar' && totalItens > 0 && (
            <div className="px-3 pb-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleCheckout(); }}
                className="w-full py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold transition-colors"
              >
                Finalizar pedido
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const gridAndCart = isPortrait ? gridAndCartPortrait : gridAndCartLandscape;

  // ── Checkout compartilhado ───────────────────────────────────────────────
  const checkoutContent = (
    <div className="flex-1 flex items-start justify-center overflow-y-auto pt-4 pb-20">
      <div
        className={`w-full max-w-sm rounded-2xl border p-5 ${
          isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-gray-200 shadow-xl'
        }`}
      >
        <CheckoutFlow
          companyId={companyId}
          theme={effectiveTheme}
          onClose={() => { setShowCheckout(false); onClose(); }}
          playText={playText}
          metodosAtivos={metodosAtivos.length > 0 ? metodosAtivos : undefined}
          profile={profile}
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
  );

  // ── Scanner PDV (compartilhado pelos dois modos) ─────────────────────────
  const pdvScanner = showPdvScanner && playText ? (
    <BarcodePdvModal
      companyId={companyId}
      theme={effectiveTheme}
      playText={playText}
      onProductFound={handleProductScanned}
      onClose={() => setShowPdvScanner(false)}
    />
  ) : null;

  // ============================================================
  // MODO FULLSCREEN — Com SlugHeader completo
  // ============================================================
  if (isFullscreen && mounted) {
    const fullscreenContent = (
      <div className={`fixed inset-0 z-[200] flex flex-col overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <SlugHeader
          company={{
            name: companyName,
            logo_url: companyLogo,
            assistant_role: assistantRole,
            webapp_enabled: true,
          }}
          slug={slug}
          pageType="vendas"
          theme={effectiveTheme}
          overlayMode={false}
          isKioskMode={false}
          isWakeLockActive={false}
          isWakeLockSupported={false}
          isPortrait={isPortrait}
          showControls={false}
          onEnterKioskMode={() => {}}
          onToggleWakeLock={() => {}}
          onToggleModoVenda={() => {}}
          onToggleTheme={handleToggleTheme}
          onClose={undefined}
        />

        <div className="flex-1 flex overflow-hidden px-3 py-3 pb-32 min-h-0 w-full gap-3">
          <div className="flex-1 flex flex-col overflow-hidden gap-3">
            {showCheckout ? checkoutContent : gridAndCart}
          </div>
        </div>

        {pdvScanner}
      </div>
    );

    return createPortal(fullscreenContent, document.body);
  }

  // ============================================================
  // MODO NORMAL — Modal dentro do VoiceAssistant (sem header/footer)
  // ============================================================
  return (
    <>
      <div className={`absolute inset-0 z-40 flex flex-col overflow-hidden rounded-2xl ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex-1 flex flex-col overflow-hidden px-3 py-3 min-h-0 w-full gap-3">
          {showCheckout ? checkoutContent : gridAndCart}
        </div>
      </div>
      {pdvScanner}
    </>
  );
}

export default function SaleModeModal(props: SaleModeModalProps) {
  return (
    <CartProvider>
      <SaleModeInner {...props} />
    </CartProvider>
  );
}
