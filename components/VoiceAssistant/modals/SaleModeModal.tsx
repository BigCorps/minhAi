// components/VoiceAssistant/modals/SaleModeModal.tsx — v8 FINAL
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { CartProvider, useCart } from '@/hooks/useCart';
import ProductGrid from './SaleModeModal/ProductGrid';
import CartPanel from './SaleModeModal/CartPanel';
import CheckoutFlow from './SaleModeModal/CheckoutFlow';
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
  const isDark = theme === 'dark';
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
      if (e.key === 'Escape' && !showCheckout) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, showCheckout]);

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

  // ============================================================
  // MODO FULLSCREEN - Com SlugHeader completo
  // ============================================================
  if (isFullscreen && mounted) {
    const fullscreenContent = (
      <div
        className={`fixed inset-0 z-[200] flex flex-col overflow-hidden ${
          isDark ? 'bg-slate-900' : 'bg-white'
        }`}
      >
        {/* SLUGHEADER - pageType='vendas' faz o botão vendas virar botão assistente */}
<SlugHeader
  company={{
    name: companyName,
    logo_url: companyLogo,
    assistant_role: assistantRole,
    webapp_enabled: true,
  }}
  slug={slug}
  pageType="vendas"
  theme={theme}
  overlayMode={false}
  isKioskMode={false}
  isWakeLockActive={false}
  isWakeLockSupported={false}
  isPortrait={isPortrait}
  showControls={false}
  onEnterKioskMode={() => {}}
  onToggleWakeLock={() => {}}
  onToggleModoVenda={() => {}}
  onToggleTheme={() => {}}
  onClose={undefined}
/>

        {/* CONTEÚDO */}
        <div className="flex-1 flex overflow-hidden px-3 py-3 min-h-0 w-full gap-3">
          <div
            className={`flex-1 flex overflow-hidden gap-3 ${
              isPortrait ? 'flex-col' : 'flex-row'
            }`}
          >
            {showCheckout ? (
              <div className="flex-1 flex items-start justify-center overflow-y-auto pt-4 pb-20">
                <div
                  className={`w-full max-w-sm rounded-2xl border p-5 ${
                    isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-gray-200 shadow-xl'
                  }`}
                >
                  <CheckoutFlow
                    companyId={companyId}
                    theme={theme}
                    onClose={() => {
                      setShowCheckout(false);
                      onClose();
                    }}
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
            ) : (
              <>
                {/* Produtos */}
                <div
                  className={`flex flex-col min-w-0 overflow-hidden ${
                    isPortrait ? 'flex-1 min-h-0' : 'flex-[7]'
                  }`}
                >
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

                {/* Avatar + Carrinho */}
                <div
                  className={`flex min-w-0 overflow-hidden gap-2 ${
                    isPortrait ? 'flex-row flex-shrink-0 h-[200px]' : 'flex-col flex-[3]'
                  }`}
                >
                  {/* Card do avatar */}
                  <div
                    className={`rounded-2xl border flex flex-col items-center gap-1 pt-2 pb-2 px-2 ${
                      isPortrait ? 'w-[160px] flex-shrink-0' : 'flex-shrink-0'
                    } ${isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div
                      className="relative cursor-pointer select-none mt-1"
                      style={{ width: 80, height: 80 }}
                      onMouseDown={onMicDown}
                      onMouseUp={onMicUp}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        onMicDown?.();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        onMicUp?.();
                      }}
                    >
                      {isListening && (
                        <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30 pointer-events-none" />
                      )}
                      <div className="w-full h-full overflow-hidden rounded-full">
                        <div
                          style={{
                            transform: 'scale(0.417)',
                            transformOrigin: 'top left',
                            width: 192,
                            height: 192,
                            pointerEvents: 'none',
                          }}
                        >
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

                    <p
                      className={`text-[9px] text-center leading-tight ${
                        isDark ? 'text-white/35' : 'text-gray-400'
                      }`}
                    >
                      {isListening
                        ? 'Ouvindo...'
                        : isTranscribing
                        ? 'Transcrevendo...'
                        : isProcessing || isPlayingAudio
                        ? 'Processando...'
                        : 'Segure para falar'}
                    </p>

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

        {/* FOOTER */}
        <div
          className={`flex-shrink-0 h-8 border-t flex items-center justify-center ${
            isDark ? 'bg-slate-800/50 border-white/10' : 'bg-white border-gray-200'
          }`}
        >
          <p className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            {totalItens > 0 ? `${totalItens} ${totalItens === 1 ? 'item' : 'itens'} no carrinho` : 'Carrinho vazio'}
          </p>
        </div>
      </div>
    );

    return createPortal(fullscreenContent, document.body);
  }

  // ============================================================
  // MODO NORMAL - Modal dentro do VoiceAssistant (sem header/footer)
  // ============================================================
  const normalContent = (
    <div
      className={`absolute inset-0 z-40 flex overflow-hidden rounded-2xl ${
        isDark ? 'bg-slate-900' : 'bg-white'
      }`}
    >
      <div
        className={`flex-1 flex overflow-hidden px-3 py-3 min-h-0 w-full gap-3 ${
          isPortrait ? 'flex-col' : 'flex-row'
        }`}
      >
        {showCheckout ? (
          <div className="flex-1 flex items-start justify-center overflow-y-auto pt-4">
            <div
              className={`w-full max-w-sm rounded-2xl border p-5 ${
                isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-gray-200 shadow-xl'
              }`}
            >
              <CheckoutFlow
                companyId={companyId}
                theme={theme}
                onClose={() => {
                  setShowCheckout(false);
                  onClose();
                }}
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
        ) : (
          <>
            {/* Produtos */}
            <div
              className={`flex flex-col min-w-0 overflow-hidden ${
                isPortrait ? 'flex-1 min-h-0' : 'flex-[7]'
              }`}
            >
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

            {/* Avatar + Carrinho */}
            <div
              className={`flex min-w-0 overflow-hidden gap-2 ${
                isPortrait ? 'flex-row flex-shrink-0 h-[200px]' : 'flex-col flex-[3]'
              }`}
            >
              {/* Card do avatar */}
              <div
                className={`rounded-2xl border flex flex-col items-center gap-1 pt-2 pb-2 px-2 relative ${
                  isPortrait ? 'w-[160px] flex-shrink-0' : 'flex-shrink-0'
                } ${isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'}`}
              >
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

                <div
                  className="relative cursor-pointer select-none mt-1"
                  style={{ width: 80, height: 80 }}
                  onMouseDown={onMicDown}
                  onMouseUp={onMicUp}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onMicDown?.();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onMicUp?.();
                  }}
                >
                  {isListening && (
                    <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30 pointer-events-none" />
                  )}
                  <div className="w-full h-full overflow-hidden rounded-full">
                    <div
                      style={{
                        transform: 'scale(0.417)',
                        transformOrigin: 'top left',
                        width: 192,
                        height: 192,
                        pointerEvents: 'none',
                      }}
                    >
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

                <p
                  className={`text-[9px] text-center leading-tight ${
                    isDark ? 'text-white/35' : 'text-gray-400'
                  }`}
                >
                  {isListening
                    ? 'Ouvindo...'
                    : isTranscribing
                    ? 'Transcrevendo...'
                    : isProcessing || isPlayingAudio
                    ? 'Processando...'
                    : 'Segure para falar'}
                </p>

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

  return normalContent;
}

export default function SaleModeModal(props: SaleModeModalProps) {
  return (
    <CartProvider>
      <SaleModeInner {...props} />
    </CartProvider>
  );
}
