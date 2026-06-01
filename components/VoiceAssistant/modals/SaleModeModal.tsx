// components/VoiceAssistant/modals/SaleModeModal.tsx — v11
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
//   - Usado na página /vendas/[slug]
//
// Novidades v11:
//   - Prop avatarType passada para todos os AvatarFace (orbe vs avatar)
//   - Fix layout fullscreen: flex-row/flex-col condicional por isPortrait
//   - pb-32 → pb-3 (remove espaço do carrossel removido)

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
import SlugHeaderWrapper from '@/app/ia/[slug]/SlugHeaderWrapper';  // FIX: usa wrapper com kiosk/wakelock
import { ArrowLeft, ArrowRight, Truck, Store, UtensilsCrossed } from 'lucide-react';

export interface SaleModeModalProps {
  companyId: string;
  slug?: string;
  companyName?: string;
  companyLogo?: string | null;
  assistantRole?: string;
  avatarType?: string;                    // ← NOVO: orbe vs avatar
  modo_vendas_enabled?: boolean;
  modo_fila_enabled?: boolean;
  modo_links_enabled?: boolean;
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
  footerHeight?: number;                  // ← altura do footer em px (default 32 = h-8)
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
  avatarType,                             // ← NOVO
  modo_vendas_enabled = true,
  modo_fila_enabled = false,
  modo_links_enabled = false,
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
  footerHeight = 32,                      // ← default h-8 do SlugFooter
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
  const [showEntrega, setShowEntrega] = useState(false);
  const [tipoEntrega, setTipoEntrega] = useState<'retirada' | 'delivery' | 'mesa'>('retirada');
  const [enderecoDelivery, setEnderecoDelivery] = useState('');
  const [numeroMesa, setNumeroMesa] = useState('');
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryWhoPays, setDeliveryWhoPays] = useState<'cliente' | 'empresa'>('cliente');
  const [isPortrait, setIsPortrait] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [metodosAtivos, setMetodosAtivos] = useState<string[]>([]);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);

  // ── Scanner PDV ──────────────────────────────────────────────────────────
  const [showPdvScanner, setShowPdvScanner] = useState(false);

  const handleProductScanned = useCallback((produto: ProdutoVenda) => {
    addItem(produto as any);
  }, [addItem]);

  const [isKioskMode, setIsKioskMode] = useState(false);

useEffect(() => {
  try {
    const session = sessionStorage.getItem('eai:kioskSession');
    if (session) setIsKioskMode(JSON.parse(session)?.active === true);
  } catch {}
  const handleKiosk = (e: CustomEvent) => setIsKioskMode(e.detail?.active === true);
  window.addEventListener('eai:kioskModeChange', handleKiosk as EventListener);
  return () => window.removeEventListener('eai:kioskModeChange', handleKiosk as EventListener);
}, []);

  // ── Cards colapsáveis em portrait (mobile) ───────────────────────────────
  const [portraitExpanded, setPortraitExpanded] = useState<'avatar' | 'cart' | null>(null);

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
        setMetodosAtivos(ativos.length > 0 ? ativos : ['pix_generate']);

        // Carregar config de delivery
        const { data: companyData } = await supabase
          .from('companies')
          .select('delivery_enabled, delivery_who_pays')
          .eq('id', companyId)
          .maybeSingle();
        setDeliveryEnabled(!!companyData?.delivery_enabled);
        setDeliveryWhoPays(companyData?.delivery_who_pays ?? 'cliente');
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
    setShowEntrega(true);
  }, [totalItens]);

  const handleConfirmarEntrega = useCallback(() => {
    setShowEntrega(false);
    setShowCheckout(true);
  }, []);

  function getObservacaoEntrega(): string | null {
    if (tipoEntrega === 'delivery') return `Delivery: ${enderecoDelivery}`;
    if (tipoEntrega === 'mesa') return `Mesa/Comanda: ${numeroMesa}`;
    return null;
  }

  // ── Prop compartilhada para todos os AvatarFace ──────────────────────────
  // Centraliza as props fixas para não repetir em cada instância
  const avatarFaceProps = {
    isListening,
    isSpeaking: isPlayingAudio,
    isProcessing: isProcessing || isTranscribing,
    theme: effectiveTheme,
    avatarType,                           // ← NOVO: orbe vs avatar
    qrCodeData: null,
    pixConfirmationData: null,
    onCloseQRCode: () => {},
    onCopyQRCode: () => {},
    onConfirmPix: () => {},
    onCancelPix: () => {},
  } as const;

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
          <AvatarFace {...avatarFaceProps} />
        </div>
      </div>
    </div>
  );

  const avatarLabel = (
    <p className={`text-[9px] text-center leading-tight ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
      {isListening ? 'Ouvindo...' : isTranscribing ? 'Transcrevendo...' : isProcessing || isPlayingAudio ? 'Processando...' : 'Segure para falar'}
    </p>
  );

  // ── Conteúdo compartilhado: grid + carrinho ──────────────────────────────
  const gridAndCart = isPortrait ? (
    // ── PORTRAIT (mobile): produtos em cima, avatar+carrinho em baixo como botões colapsáveis ──
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

        {/* ── Card Avatar ── */}
        <div className={`flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
          isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'
        } ${portraitExpanded === 'avatar' ? 'flex-1' : portraitExpanded === 'cart' ? 'w-14 flex-shrink-0' : 'w-[140px] flex-shrink-0'}`}>

          {/* Cabeçalho clicável do card avatar */}
          <button
            className={`flex items-center gap-2 px-3 py-2 w-full transition-colors ${
              isDark ? 'hover:bg-white/5 active:bg-white/8' : 'hover:bg-gray-100 active:bg-gray-150'
            }`}
            onClick={() => setPortraitExpanded(p => p === 'avatar' ? null : 'avatar')}
          >
            {/* Mini avatar sempre visível no header */}
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 relative">
              {isListening && <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-40 pointer-events-none" />}
              <div style={{ transform: 'scale(0.146)', transformOrigin: 'top left', width: 192, height: 192, pointerEvents: 'none' }}>
                <AvatarFace {...avatarFaceProps} />
              </div>
            </div>
            {portraitExpanded !== 'cart' && (
              <span className={`text-[10px] font-medium truncate flex-1 text-left ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                {isListening ? 'Ouvindo...' : isProcessing || isPlayingAudio ? 'Processando...' : 'Assistente'}
              </span>
            )}
            <svg
              className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${portraitExpanded === 'avatar' ? 'rotate-180' : ''} ${isDark ? 'text-white/30' : 'text-gray-400'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Conteúdo expandido do avatar */}
          {portraitExpanded === 'avatar' && (
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
                      <AvatarFace {...avatarFaceProps} />
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
  showVirtualKeyboard={showVirtualKeyboard}
  onVirtualKeyboardToggle={isKioskMode ? () => setShowVirtualKeyboard(v => !v) : undefined}
  autoOpenKeyboard={isKioskMode}
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
          )}
        </div>

        {/* ── Card Carrinho ── */}
        <div className={`flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
          isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'
        } ${portraitExpanded === 'cart' ? 'flex-1' : portraitExpanded === 'avatar' ? 'w-14 flex-shrink-0' : 'flex-1'}`}>

          {/* Cabeçalho clicável do carrinho */}
          <button
            className={`flex items-center gap-2 px-3 py-2 w-full transition-colors ${
              isDark ? 'hover:bg-white/5 active:bg-white/8' : 'hover:bg-gray-100 active:bg-gray-150'
            }`}
            onClick={() => setPortraitExpanded(p => p === 'cart' ? null : 'cart')}
          >
            <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-white/50' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {portraitExpanded !== 'avatar' && (
              <span className={`text-[10px] font-medium flex-1 text-left truncate ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Carrinho
              </span>
            )}
            {totalItens > 0 && portraitExpanded !== 'avatar' && (
              <span className="flex-shrink-0 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {totalItens}
              </span>
            )}
            <svg
              className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${portraitExpanded === 'cart' ? 'rotate-180' : ''} ${isDark ? 'text-white/30' : 'text-gray-400'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Conteúdo expandido do carrinho */}
          {portraitExpanded === 'cart' && (
            <div className="flex-1 min-h-0 overflow-hidden px-1 pb-2">
              <CartPanel theme={effectiveTheme} onCheckout={handleCheckout} />
            </div>
          )}

          {/* Resumo compacto quando não expandido */}
          {portraitExpanded !== 'cart' && totalItens > 0 && (
            <div
              className="px-3 pb-2 cursor-pointer"
              onClick={() => setPortraitExpanded('cart')}
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
  ) : (
    // ── LANDSCAPE / DESKTOP: layout original ──
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

      {/* Avatar + Carrinho */}
      <div className="flex flex-col min-w-0 overflow-hidden gap-2 flex-[1.5]">
        {/* Card do avatar */}
        <div className={`rounded-2xl border flex flex-col items-center justify-center gap-1 pt-2 pb-2 px-2 relative flex-shrink-0 ${
          isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'
        }`}>
          {!isFullscreen && (
            <button
              onClick={onClose}
              className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 ${
                isDark ? 'text-white/30 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
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
  showVirtualKeyboard={showVirtualKeyboard}
  onVirtualKeyboardToggle={isKioskMode ? () => setShowVirtualKeyboard(v => !v) : undefined}
  autoOpenKeyboard={isKioskMode}
/>
            </div>
          )}
        </div>

        {/* CartPanel */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <CartPanel theme={effectiveTheme} onCheckout={handleCheckout} />
        </div>
      </div>
    </>
  );

// ── Entrega ──────────────────────────────────────────────────────────────
  const entregaBorder = isDark ? '#475569' : '#e2e8f0';
  const entregaBgSec  = isDark ? '#334155' : '#f8fafc';
  const entregaText   = isDark ? '#f1f5f9' : '#0f172a';
  const entregaMuted  = isDark ? '#94a3b8' : '#64748b';
  const entregaAccent = '#10b981';

  const opcoesEntrega = [
    { key: 'retirada' as const, label: 'Retirada no local', desc: 'Cliente retira no balcão',   Icon: Store },
    { key: 'delivery' as const, label: 'Delivery',          desc: 'Entrega no endereço',         Icon: Truck },
    { key: 'mesa'    as const, label: 'Mesa / Comanda',     desc: 'Consumo no estabelecimento',  Icon: UtensilsCrossed },
  ];

  const podeAvancarEntrega =
    tipoEntrega === 'retirada' ||
    (tipoEntrega === 'delivery' && enderecoDelivery.trim().length >= 5) ||
    (tipoEntrega === 'mesa'    && numeroMesa.trim().length >= 1);

  const entregaContent = (
    <div className="flex-1 flex items-start justify-center overflow-y-auto pt-4 pb-20">
      <div className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 ${
        isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-gray-200 shadow-xl'
      }`}>
        <p className="text-sm" style={{ color: entregaMuted }}>Como o pedido será entregue?</p>

        <div className="space-y-2">
          {opcoesEntrega.map(({ key, label, desc, Icon }) => (
            <button key={key} onClick={() => setTipoEntrega(key)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-opacity hover:opacity-80"
              style={{
                borderColor:     tipoEntrega === key ? entregaAccent : entregaBorder,
                backgroundColor: tipoEntrega === key ? 'rgba(16,185,129,0.08)' : entregaBgSec,
              }}>
              <Icon className="w-6 h-6 flex-shrink-0"
                style={{ color: tipoEntrega === key ? entregaAccent : entregaMuted }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: entregaText }}>{label}</p>
                <p className="text-xs"               style={{ color: entregaMuted }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {tipoEntrega === 'delivery' && (
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: entregaMuted }}>
              Endereço de entrega *
            </label>
            <textarea rows={2} value={enderecoDelivery}
              onChange={e => setEnderecoDelivery(e.target.value)}
              placeholder="Rua, número, bairro, cidade..."
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none"
              style={{ borderColor: entregaBorder, backgroundColor: entregaBgSec, color: entregaText }} />
          </div>
        )}

        {tipoEntrega === 'mesa' && (
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: entregaMuted }}>
              Mesa / Comanda *
            </label>
            <input value={numeroMesa} onChange={e => setNumeroMesa(e.target.value)}
              placeholder="Ex: Mesa 5, Comanda 12"
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{ borderColor: entregaBorder, backgroundColor: entregaBgSec, color: entregaText }} />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={() => setShowEntrega(false)}
            className="flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{ backgroundColor: entregaBgSec, color: entregaText }}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <button onClick={handleConfirmarEntrega} disabled={!podeAvancarEntrega}
            className="flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            style={{
              backgroundColor: podeAvancarEntrega ? entregaAccent : entregaBorder,
              color:           podeAvancarEntrega ? '#fff' : entregaMuted,
              cursor:          podeAvancarEntrega ? 'pointer' : 'not-allowed',
            }}>
            Ir para pagamento <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

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
          onVoltar={() => { setShowCheckout(false); setShowEntrega(true); }}
          playText={playText}
          metodosAtivos={metodosAtivos.length > 0 ? metodosAtivos : undefined}
          profile={profile}
          observacaoEntrega={getObservacaoEntrega()}
          tipoEntrega={tipoEntrega}
          enderecoDelivery={enderecoDelivery}
          deliveryEnabled={deliveryEnabled}
          deliveryWhoPays={deliveryWhoPays}
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

  // ── Scanner PDV ──────────────────────────────────────────────────────────
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
      <div
        className={`fixed inset-x-0 top-0 z-[200] flex flex-col overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}
        style={{ bottom: footerHeight }}
      >
        {/* FIX: SlugHeaderWrapper — kiosk, wake lock e navegação funcionam no modo vendas */}
        <SlugHeaderWrapper
          company={{
            id: companyId,
            name: companyName,
            logo_url: companyLogo,
            assistant_role: assistantRole,
            webapp_enabled: true,
            modo_vendas_enabled: modo_vendas_enabled,
            modo_fila_enabled: modo_fila_enabled,
            modo_links_enabled: modo_links_enabled,
          }}
          slug={slug}
          pageType="vendas"
          overlayMode={false}
        />

        {/* ── Fix v11: flex-row em landscape, flex-col em portrait. pb-3 no lugar do pb-32 ── */}
        <div className={`flex-1 flex overflow-hidden px-3 py-3 pb-3 min-h-0 w-full gap-3 ${
          isPortrait ? 'flex-col' : 'flex-row'
        }`}>
          {showCheckout ? checkoutContent : showEntrega ? entregaContent : gridAndCart}
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
          {showCheckout ? checkoutContent : showEntrega ? entregaContent : gridAndCart}
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
