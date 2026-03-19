// components/VoiceAssistant/modals/SaleModeModal.tsx — v4
//
// Mudanças desta versão:
// - Fundo sólido (sem backdrop-blur translúcido)
// - Sem barra de título "Modo Venda" — X de fechar fica no card do avatar
// - Cantos arredondados (rounded-2xl) igual aos outros modais
// - Sem busca — cliente usa o TextInput para isso

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
    // absolute inset-0 relativo ao container pai com position: relative
    // Fundo sólido — sem translucidez
    <div className={`absolute inset-0 z-40 flex overflow-hidden rounded-2xl ${
      isDark ? 'bg-slate-900' : 'bg-white'
    }`}>

      {/* Área principal: sem padding top, ocupa tudo */}
      <div className="flex-1 flex gap-3 overflow-hidden px-3 py-3 min-h-0 w-full">

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
            {/* Esquerdo: produtos (70%) */}
            <div className="flex-[7] flex flex-col min-w-0 overflow-hidden">
              <ProductGrid
                produtos={produtos}
                categorias={categorias}
                loading={loadingProdutos}
                theme={theme}
                produtoDestaque={produtoDestaque}
                onProdutoDestaqueClear={() => setProdutoDestaque(null)}
                // sem busca aqui — cliente usa o TextInput
                hideBusca
              />
            </div>

            {/* Direito: avatar + carrinho (30%) */}
            <div className="flex-[3] flex flex-col gap-2 min-w-0 overflow-hidden">

              {/* Card do avatar — X de fechar no canto superior direito */}
              <div className={`flex-shrink-0 rounded-2xl border flex flex-col items-center gap-1 pt-2 pb-2 px-2 relative ${
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

export default function SaleModeModal(props: SaleModeModalProps) {
  return (
    <CartProvider>
      <SaleModeInner {...props} />
    </CartProvider>
  );
}
