// components/assistant/FazerPedidoDisplay.tsx
// Modal de venda guiada — 4 etapas: Catálogo → Carrinho → Entrega → Pagamento
// Reusa ProductGrid, CartPanel, CheckoutFlow e useCart do SaleModeModal

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { CartProvider, useCart } from '@/hooks/useCart';
import { listarProdutos, listarCategorias } from '@/lib/produtos-venda';
import type { ProdutoVenda } from '@/lib/produtos-venda';
import { getContextualRoute } from '@/lib/routing-utils';

// Componentes reusados do SaleModeModal
import ProductGrid from '@/components/VoiceAssistant/modals/SaleModeModal/ProductGrid';
import CartPanel from '@/components/VoiceAssistant/modals/SaleModeModal/CartPanel';
import CheckoutFlow from '@/components/VoiceAssistant/modals/SaleModeModal/CheckoutFlow';

// ── Tipos ──────────────────────────────────────────────────
type Etapa = 'catalogo' | 'carrinho' | 'entrega' | 'pagamento';
type TipoEntrega = 'retirada' | 'delivery' | 'mesa';

interface FazerPedidoDisplayProps {
  data: {
    companyId: string;
    slug?: string;
  };
  onClose: () => void;
  theme: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

// ── Paletas ────────────────────────────────────────────────
const DARK = {
  bg: 'rgba(10,15,30,0.98)',
  card: 'rgba(20,28,50,0.95)',
  border: 'rgba(255,255,255,0.08)',
  text: '#f1f5f9',
  textMuted: 'rgba(241,245,249,0.45)',
  accent: '#10b981',
  accentBg: 'rgba(16,185,129,0.12)',
};
const LIGHT = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#94a3b8',
  accent: '#10b981',
  accentBg: '#f0fdf4',
};

// ── Ícones SVG ─────────────────────────────────────────────
function IconShoppingBag() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}
function IconCart() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function IconTruck() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 17H9m4 0V5a1 1 0 00-1-1H5a1 1 0 00-1 1v12m9 0h2m2 0h1m-3-9h3l2 4v5h-5V8z" />
    </svg>
  );
}
function IconCreditCard() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" />
    </svg>
  );
}
function IconExternalLink() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

// ── Etapa de entrega ───────────────────────────────────────
function EtapaEntrega({
  C,
  tipoEntrega,
  setTipoEntrega,
  enderecoDelivery,
  setEnderecoDelivery,
  numeroMesa,
  setNumeroMesa,
  onVoltar,
  onAvancar,
  totalItens,
}: {
  C: typeof DARK;
  tipoEntrega: TipoEntrega;
  setTipoEntrega: (t: TipoEntrega) => void;
  enderecoDelivery: string;
  setEnderecoDelivery: (v: string) => void;
  numeroMesa: string;
  setNumeroMesa: (v: string) => void;
  onVoltar: () => void;
  onAvancar: () => void;
  totalItens: number;
}) {
  const opcoes: { key: TipoEntrega; label: string; desc: string; icon: string }[] = [
    { key: 'retirada', label: 'Retirada no local', desc: 'Cliente retira no balcão', icon: '🏪' },
    { key: 'delivery', label: 'Delivery', desc: 'Entrega no endereço do cliente', icon: '🛵' },
    { key: 'mesa', label: 'Mesa / Comanda', desc: 'Consumo no estabelecimento', icon: '🪑' },
  ];

  const podeProsseguir =
    tipoEntrega === 'retirada' ||
    (tipoEntrega === 'delivery' && enderecoDelivery.trim().length >= 5) ||
    (tipoEntrega === 'mesa' && numeroMesa.trim().length >= 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16, padding: 24 }}>
      <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
        Como será a entrega do pedido?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opcoes.map(op => (
          <button
            key={op.key}
            onClick={() => setTipoEntrega(op.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
              textAlign: 'left', transition: 'all 0.15s',
              background: tipoEntrega === op.key ? C.accentBg : C.card,
              outline: tipoEntrega === op.key ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 24 }}>{op.icon}</span>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: C.text, fontSize: 14 }}>{op.label}</p>
              <p style={{ margin: 0, color: C.textMuted, fontSize: 12 }}>{op.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Campo extra para delivery */}
      {tipoEntrega === 'delivery' && (
        <div>
          <label style={{ display: 'block', color: C.textMuted, fontSize: 12, marginBottom: 6 }}>
            Endereço de entrega *
          </label>
          <textarea
            value={enderecoDelivery}
            onChange={e => setEnderecoDelivery(e.target.value)}
            placeholder="Rua, número, bairro, cidade..."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.card, color: C.text, fontSize: 13, resize: 'none', boxSizing: 'border-box',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* Campo extra para mesa */}
      {tipoEntrega === 'mesa' && (
        <div>
          <label style={{ display: 'block', color: C.textMuted, fontSize: 12, marginBottom: 6 }}>
            Número da mesa / comanda *
          </label>
          <input
            type="text"
            value={numeroMesa}
            onChange={e => setNumeroMesa(e.target.value)}
            placeholder="Ex: Mesa 5, Comanda 12"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.card, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
        <button
          onClick={onVoltar}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 10, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.text, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          Voltar
        </button>
        <button
          onClick={onAvancar}
          disabled={!podeProsseguir}
          style={{
            flex: 2, padding: '12px 0', borderRadius: 10, border: 'none',
            background: podeProsseguir ? C.accent : C.border,
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: podeProsseguir ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          Ir para pagamento
        </button>
      </div>
    </div>
  );
}

// ── Inner (precisa de CartProvider) ───────────────────────
function FazerPedidoInner({
  companyId,
  slug,
  onClose,
  theme,
  playText,
}: {
  companyId: string;
  slug?: string;
  onClose: () => void;
  theme: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}) {
  const isDark = theme === 'dark';
  const C = isDark ? DARK : LIGHT;
  const { itens, total, totalItens } = useCart();

  const [etapa, setEtapa] = useState<Etapa>('catalogo');
  const [produtos, setProdutos] = useState<ProdutoVenda[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [metodosAtivos, setMetodosAtivos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Entrega
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('retirada');
  const [enderecoDelivery, setEnderecoDelivery] = useState('');
  const [numeroMesa, setNumeroMesa] = useState('');

  // Labels das etapas
  const ETAPAS: { key: Etapa; label: string; icon: React.ReactNode }[] = [
    { key: 'catalogo', label: 'Produtos', icon: <IconShoppingBag /> },
    { key: 'carrinho', label: 'Carrinho', icon: <IconCart /> },
    { key: 'entrega', label: 'Entrega', icon: <IconTruck /> },
    { key: 'pagamento', label: 'Pagamento', icon: <IconCreditCard /> },
  ];
  const etapaIdx = ETAPAS.findIndex(e => e.key === etapa);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prods, cats] = await Promise.all([
          listarProdutos(companyId),
          listarCategorias(companyId),
        ]);
        setProdutos(prods);
        setCategorias(cats);

        // Buscar métodos de pagamento ativos
        const supabase = createClient();
        const { data: settings } = await supabase
          .from('company_function_settings')
          .select('function_key, is_enabled')
          .eq('company_id', companyId)
          .in('function_key', ['pix_generate', 'nfc_debito', 'nfc_credito', 'tef_debito', 'tef_credito', 'link_pagamento']);

        const ativos = settings?.filter(s => s.is_enabled).map(s => s.function_key) ?? [];
        setMetodosAtivos(ativos.length > 0 ? ativos : ['pix_generate']);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId]);

  // Monta observação de entrega para o pedido
  function getObservacaoEntrega(): string | null {
    if (tipoEntrega === 'delivery') return `Delivery: ${enderecoDelivery}`;
    if (tipoEntrega === 'mesa') return `Mesa/Comanda: ${numeroMesa}`;
    return null;
  }

  const vendaUrl = slug ? getContextualRoute('vendas', slug) : null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: C.bg,
        display: 'flex', flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
          background: C.card, flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Botão voltar etapa */}
          {etapaIdx > 0 && etapa !== 'pagamento' && (
            <button
              onClick={() => setEtapa(ETAPAS[etapaIdx - 1].key)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: C.textMuted, padding: 4, display: 'flex', alignItems: 'center',
              }}
            >
              <IconArrowLeft />
            </button>
          )}
          <span style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>
            Fazer Pedido
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Link para seção de vendas completa */}
          {vendaUrl && (
            <a
              href={vendaUrl}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, color: C.accent, textDecoration: 'none',
                padding: '5px 10px', borderRadius: 8,
                border: `1px solid ${C.accent}33`,
                background: C.accentBg,
              }}
            >
              <IconExternalLink />
              Loja completa
            </a>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: C.textMuted, padding: 4, display: 'flex', alignItems: 'center',
            }}
          >
            <IconX />
          </button>
        </div>
      </div>

      {/* Indicador de progresso */}
      {etapa !== 'pagamento' && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 0, padding: '10px 20px', borderBottom: `1px solid ${C.border}`,
            background: C.card, flexShrink: 0,
          }}
        >
          {ETAPAS.map((e, i) => {
            const ativo = e.key === etapa;
            const concluido = i < etapaIdx;
            return (
              <div key={e.key} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                    borderRadius: 20, fontSize: 12, fontWeight: ativo ? 700 : 500,
                    color: ativo ? C.accent : concluido ? C.accent : C.textMuted,
                    background: ativo ? C.accentBg : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ opacity: ativo || concluido ? 1 : 0.4 }}>{e.icon}</span>
                  <span style={{ display: window.innerWidth < 400 ? 'none' : 'inline' }}>
                    {e.label}
                  </span>
                  {concluido && (
                    <span style={{ color: C.accent, fontWeight: 700 }}>✓</span>
                  )}
                </div>
                {i < ETAPAS.length - 1 && (
                  <div style={{ width: 20, height: 1, background: C.border }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: C.textMuted }}>
              <div style={{
                width: 32, height: 32, border: `3px solid ${C.border}`,
                borderTopColor: C.accent, borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
              }} />
              <p style={{ margin: 0, fontSize: 14 }}>Carregando produtos...</p>
            </div>
          </div>
        ) : etapa === 'catalogo' ? (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ProductGrid
                companyId={companyId}
                produtos={produtos}
                categorias={categorias}
                theme={theme}
              />
            </div>
            {/* Botão avançar — aparece quando há itens */}
            {totalItens > 0 && (
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
                <button
                  onClick={() => setEtapa('carrinho')}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                    background: C.accent, color: '#fff', fontWeight: 700, fontSize: 15,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <IconCart />
                  Ver carrinho ({totalItens} {totalItens === 1 ? 'item' : 'itens'})
                </button>
              </div>
            )}
          </div>
        ) : etapa === 'carrinho' ? (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 16 }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <CartPanel
                theme={theme}
                onCheckout={() => setEtapa('entrega')}
              />
            </div>
            {/* Botão voltar ao catálogo */}
            <div style={{ paddingTop: 10, flexShrink: 0 }}>
              <button
                onClick={() => setEtapa('catalogo')}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 10,
                  border: `1px solid ${C.border}`, background: 'transparent',
                  color: C.text, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                + Adicionar mais itens
              </button>
            </div>
          </div>
        ) : etapa === 'entrega' ? (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <EtapaEntrega
              C={C}
              tipoEntrega={tipoEntrega}
              setTipoEntrega={setTipoEntrega}
              enderecoDelivery={enderecoDelivery}
              setEnderecoDelivery={setEnderecoDelivery}
              numeroMesa={numeroMesa}
              setNumeroMesa={setNumeroMesa}
              onVoltar={() => setEtapa('carrinho')}
              onAvancar={() => setEtapa('pagamento')}
              totalItens={totalItens}
            />
          </div>
        ) : (
          /* Etapa pagamento — CheckoutFlow completo */
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CheckoutFlow
              companyId={companyId}
              theme={theme}
              onClose={onClose}
              playText={playText}
              metodosAtivos={metodosAtivos}
              observacaoEntrega={getObservacaoEntrega()}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Export principal com CartProvider e portal ─────────────
export default function FazerPedidoDisplay({ data, onClose, theme, playText }: FazerPedidoDisplayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <CartProvider>
      <FazerPedidoInner
        companyId={data.companyId}
        slug={data.slug}
        onClose={onClose}
        theme={theme}
        playText={playText}
      />
    </CartProvider>,
    document.body
  );
}
