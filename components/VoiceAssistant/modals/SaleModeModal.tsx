// components/VoiceAssistant/modals/SaleModeModal.tsx — v3
//
// Estratégia correta: NÃO usa portal, NÃO usa fixed inset-0.
// O componente é renderizado pelo ActionModals diretamente no DOM,
// e usa position absolute relativo ao container pai que já respeita
// header e carrossel. Assim header e carrossel continuam visíveis.
//
// Para isso funcionar, o container pai no assistente-client.tsx
// precisa ter position: relative (ver instrução abaixo).

'use client';

import { useState, useEffect, useCallback } from 'react';
import { CartProvider, useCart } from '@/hooks/useCart';
import ProductGrid from './SaleModeModal/ProductGrid';
import CartPanel from './SaleModeModal/CartPanel';
import CheckoutFlow from './SaleModeModal/CheckoutFlow';
import { AvatarFace } from '@/components/AvatarFace';
import TextInputChat from '@/components/VoiceAssistant/TextInputChat';
import { listarProdutos, listarCategorias } from '@/lib/produtos-venda';
import type { ProdutoVenda } from '@/lib/produtos-venda';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SaleModeModalProps {
  companyId: string;
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
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function SaleModeInner({
  companyId,
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
    /*
      absolute inset-0 relativo ao container pai que tem position: relative.
      No assistente-client.tsx, o <div> que envolve o VoiceAssistantWithWakeWord
      precisa ter a classe "relative" — ver instrução no DIFFS_FASE2.md.
    */
    <div className={`absolute inset-0 z-40 flex flex-col overflow-hidden ${
      isDark
        ? 'bg-slate-900/98 backdrop-blur-xl'
        : 'bg-white/98 backdrop-blur-xl'
    }`}>

      {/* Barra de título */}
      <div className={`flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b ${
        isDark ? 'border-white/8' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
            isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
          }`}>
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Modo Venda
          </span>
          {produtos.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isDark ? 'bg-white/8 text-white/40' : 'bg-gray-100 text-gray-500'
            }`}>
              {produtos.length} produtos
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            isDark
              ? 'text-white/40 hover:text-white hover:bg-white/10'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Área principal */}
      <div className="flex-1 flex gap-3 overflow-hidden px-3 py-3 min-h-0">

        {showCheckout ? (
          <div className="flex-1 flex items-start justify-center overflow-y-auto pt-4">
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
            {/* Esquerdo: produtos com scroll próprio (70%) */}
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

            {/* Direito: avatar + carrinho fixos (30%) */}
            <div className="flex-[3] flex flex-col gap-2 min-w-0 overflow-hidden">

              {/* Card do avatar */}
              <div className={`flex-shrink-0 rounded-2xl border flex flex-col items-center gap-1 pt-3 pb-2 px-2 ${
                isDark
                  ? 'bg-white/3 border-white/8'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>

                {/* Avatar clicável push-to-talk */}
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

                  {/* AvatarFace comprimido de 192px para 80px via scale */}
                  <div className="w-full h-full overflow-hidden rounded-full">
                    <div style={{
                      transform: 'scale(0.417)',
                      transformOrigin: 'top left',
                      width: 192,
                      height: 192,
                      pointerEvents: 'none',
                    }}>
                      <AvatarFace
                        isListening={isListening}
                        isSpeaking={isPlayingAudio}
                        isProcessing={isProcessing || isTranscribing}
                        theme={theme}
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

                <p className={`text-[9px] text-center leading-tight ${
                  isDark ? 'text-white/35' : 'text-gray-400'
                }`}>
                  {isListening ? 'Ouvindo...'
                    : isTranscribing ? 'Transcrevendo...'
                    : isProcessing || isPlayingAudio ? 'Processando...'
                    : 'Segure para falar'}
                </p>

                {onTextMessage && (
                  <div className="w-full">
                    <TextInputChat
                      onSendMessage={onTextMessage}
                      isProcessing={isProcessing || isPlayingAudio || isTranscribing}
                      theme={theme}
                      disabled={false}
                    />
                  </div>
                )}
              </div>

              {/* CartPanel */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <CartPanel theme={theme} onCheckout={handleCheckout} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Export com CartProvider (sem portal) ────────────────────────────────────

export default function SaleModeModal(props: SaleModeModalProps) {
  return (
    <CartProvider>
      <SaleModeInner {...props} />
    </CartProvider>
  );
}
