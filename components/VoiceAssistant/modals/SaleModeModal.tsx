// components/VoiceAssistant/modals/SaleModeModal.tsx — v5
//
// - Fundo sólido (sem backdrop-blur translúcido)
// - Sem barra de título — X de fechar fica no card do avatar
// - isMaximized: fixed inset-0 no kiosk, absolute inset-0 rounded-2xl no normal
// - Layout responsivo por orientação:
//     landscape → produtos esquerda / avatar+carrinho direita (coluna)
//     portrait  → produtos em cima / avatar+carrinho em linha abaixo
// - Detecção de orientação via screen.orientation + resize (confiável no kiosk/fullscreen)

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
  isMaximized?: boolean;
}

function getIsPortrait() {
  // screen.orientation é mais confiável que window.innerWidth/Height no fullscreen
  if (typeof screen !== 'undefined' && screen.orientation?.type) {
    return screen.orientation.type.startsWith('portrait');
  }
  return window.innerHeight > window.innerWidth;
}

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
  isMaximized = false,
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
  const [isPortrait, setIsPortrait] = useState(false);

  // Detecção de orientação robusta (funciona em kiosk/fullscreen)
  useEffect(() => {
    const update = () => setIsPortrait(getIsPortrait());
    update();

    // Escuta tanto resize quanto orientationchange
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    // screen.orientation API (mais moderna)
    if (screen.orientation) {
      screen.orientation.addEventListener('change', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', update);
      }
    };
  }, []);

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

  const rootClass = isMaximized
    ? `fixed inset-0 z-[200] flex overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`
    : `absolute inset-0 z-40 flex overflow-hidden rounded-2xl ${isDark ? 'bg-slate-900' : 'bg-white'}`;

  return (
    <div className={rootClass}>
      <div className={`flex-1 flex overflow-hidden px-3 py-3 min-h-0 w-full gap-3 ${
        isPortrait ? 'flex-col' : 'flex-row'
      }`}>

        {showCheckout ? (
          <div className="flex-1 flex items-start justify-center overflow-y-auto pt-4">
            <div className={`w-full max-w-sm rounded-2xl border p-5 ${
              isDark
                ? 'bg-slate-800 border-white/10'
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
            {/* ── GRADE DE PRODUTOS ────────────────────────────────
                landscape: flex-[7] em linha
                portrait:  flex-1 em cima (ocupa o máximo disponível) */}
            <div className={`flex flex-col min-w-0 overflow-hidden ${
              isPortrait ? 'flex-1 min-h-0' : 'flex-[7]'
            }`}>
              <ProductGrid
                produtos={produtos}
                categorias={categorias}
                loading={loadingProdutos}
                theme={theme}
                produtoDestaque={produtoDestaque}
                onProdutoDestaqueClear={() => setProdutoDestaque(null)}
                hideBusca
              />
            </div>

            {/* ── CONTROLES (avatar + carrinho) ────────────────────
                landscape: flex-[3] coluna, ocupa 30% da linha
                portrait:  linha fixa h-[200px] na parte de baixo  */}
            <div className={`flex min-w-0 overflow-hidden gap-2 ${
              isPortrait
                ? 'flex-row flex-shrink-0 h-[200px]'
                : 'flex-col flex-[3]'
            }`}>

              {/* Card do avatar */}
              <div className={`rounded-2xl border flex flex-col items-center gap-1 pt-2 pb-2 px-2 relative ${
                isPortrait ? 'w-[160px] flex-shrink-0' : 'flex-shrink-0'
              } ${
                isDark
                  ? 'bg-white/3 border-white/8'
                  : 'bg-gray-50 border-gray-200'
              }`}>

                {/* Botão X de fechar */}
                <button
                  onClick={onClose}
                  className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 ${
                    isDark
                      ? 'text-white/30 hover:text-white hover:bg-white/10'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Avatar push-to-talk */}
                <div
                  className="relative cursor-pointer select-none mt-1"
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

                {/* Estado do avatar */}
                <p className={`text-[9px] text-center leading-tight ${
                  isDark ? 'text-white/35' : 'text-gray-400'
                }`}>
                  {isListening ? 'Ouvindo...'
                    : isTranscribing ? 'Transcrevendo...'
                    : isProcessing || isPlayingAudio ? 'Processando...'
                    : 'Segure para falar'}
                </p>

                {/* TextInput fino */}
                {onTextMessage && (
                  <div className="w-full mt-0.5">
                    <TextInputChat
                      onSendMessage={onTextMessage}
                      isProcessing={isProcessing || isPlayingAudio || isTranscribing}
                      theme={theme}
                      disabled={false}
                      compact
                    />
                  </div>
                )}
              </div>

              {/* CartPanel — ocupa o restante ao lado do avatar no portrait */}
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

export default function SaleModeModal(props: SaleModeModalProps) {
  return (
    <CartProvider>
      <SaleModeInner {...props} />
    </CartProvider>
  );
}
