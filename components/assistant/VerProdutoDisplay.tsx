'use client';

// components/VoiceAssistant/modals/SaleModeModal/VerProdutoDisplay.tsx
//
// Modal de detalhe de produto individual.
// Fluxo:
//  1. Abre com foto, nome, descrição, preço
//  2. Se produto tem opcionais → abre OpcionaisProdutoModal antes da ação
//  3. Botão "Pagar com PIX" → gera PIX direto (sem carrinho)
//  4. Botão "Adicionar ao Carrinho" → abre SaleModeModal com produto no carrinho
//
// Props:
//  data.companyId   — UUID da empresa
//  data.produto     — objeto ProdutoVenda completo
//  onClose          — fecha este modal
//  onComprarPix     — abre modal PIX com o produto (chamado após opcionais se houver)
//  onAdicionarCarrinho — abre SaleModeModal com produto no carrinho

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { formatarPreco, type ProdutoVenda } from '@/lib/produtos-venda';
import OpcionaisProdutoModal, { type OpcaoSelecionada } from '@/components/VoiceAssistant/modals/SaleModeModal/OpcionaisProdutoModal';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface VerProdutoDisplayProps {
  data: {
    companyId: string;
    produto: ProdutoVenda;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
  // Callbacks injetados pelo ActionModals
  onComprarPix?: (produto: ProdutoVenda, opcoes: OpcaoSelecionada[], totalAdicional: number) => void;
  onAdicionarCarrinho?: (produto: ProdutoVenda, opcoes: OpcaoSelecionada[], totalAdicional: number) => void;
}

type AcaoPendente = 'pix' | 'carrinho' | null;

// ── Paletas inline (sem Tailwind dinâmico) ────────────────────────────────────

const DARK = {
  bg:           '#0f172a',
  bgCard:       '#1e293b',
  bgOverlay:    '#162032',
  border:       '#334155',
  textPrimary:  '#f1f5f9',
  textMuted:    '#94a3b8',
  textFaint:    '#475569',
  accent:       '#10b981',
  accentBg:     'rgba(16,185,129,0.12)',
  accentBorder: 'rgba(16,185,129,0.30)',
  pix:          '#00b894',
  pixBg:        'rgba(0,184,148,0.12)',
  cart:         '#2563eb',
  cartBg:       'rgba(37,99,235,0.12)',
  danger:       '#ef4444',
  dangerBg:     'rgba(239,68,68,0.12)',
  tag:          '#7c3aed',
  tagBg:        'rgba(124,58,237,0.12)',
};

const LIGHT = {
  bg:           '#ffffff',
  bgCard:       '#f8fafc',
  bgOverlay:    '#f1f5f9',
  border:       '#e2e8f0',
  textPrimary:  '#0f172a',
  textMuted:    '#64748b',
  textFaint:    '#94a3b8',
  accent:       '#059669',
  accentBg:     'rgba(5,150,105,0.07)',
  accentBorder: 'rgba(5,150,105,0.25)',
  pix:          '#059669',
  pixBg:        'rgba(5,150,105,0.08)',
  cart:         '#1d4ed8',
  cartBg:       'rgba(29,78,216,0.08)',
  danger:       '#dc2626',
  dangerBg:     'rgba(220,38,38,0.08)',
  tag:          '#6d28d9',
  tagBg:        'rgba(109,40,217,0.08)',
};

// ── SVG Icons inline ──────────────────────────────────────────────────────────

function IconPix({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6.5 3.5L12 9l5.5-5.5M12 9V15M6.5 20.5L12 15l5.5 5.5"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCart({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function IconClose({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconStar({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function VerProdutoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
  onComprarPix,
  onAdicionarCarrinho,
}: VerProdutoDisplayProps) {
  const { companyId, produto } = data;
  const P = theme === 'dark' ? DARK : LIGHT;
  const supabase = createClient();

  const [temOpcionais, setTemOpcionais]       = useState(false);
  const [loadingOpcoes, setLoadingOpcoes]     = useState(true);
  const [nomesGrupos, setNomesGrupos]         = useState<string[]>([]);

  // Controle do modal de opcionais
  const [showOpcoes, setShowOpcoes]           = useState(false);
  const [acaoPendente, setAcaoPendente]       = useState<AcaoPendente>(null);

  // Quantidade selecionada
  const [quantidade, setQuantidade]           = useState(1);

  // Sem estoque
  const semEstoque = produto.controla_estoque && produto.estoque_atual <= 0;

  // ── Verificar opcionais ao montar ──────────────────────────────────────────

  useEffect(() => {
    async function checkOpcoes() {
      try {
        const { data: grupos } = await supabase
          .from('produto_opcoes_grupos')
          .select('id, nome')
          .eq('produto_id', produto.id)
          .order('display_order', { ascending: true });

        if (grupos && grupos.length > 0) {
          setTemOpcionais(true);
          setNomesGrupos(grupos.map(g => g.nome));
        }
      } catch {
        // silencioso — produto sem opcionais é o padrão
      } finally {
        setLoadingOpcoes(false);
      }
    }
    checkOpcoes();
  }, [produto.id]);

  // ── Falar ao abrir ─────────────────────────────────────────────────────────

  useEffect(() => {
    const preco = formatarPreco(produto.preco_venda);
    const msg = [
      produto.nome,
      produto.descricao ? produto.descricao + '.' : null,
      `Por ${preco}.`,
      semEstoque ? 'Produto sem estoque no momento.' : null,
    ].filter(Boolean).join(' ');
    playText?.(msg).catch(() => {});
  }, []);

  // Cleanup
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // ── Handlers de ação ──────────────────────────────────────────────────────

  function handleAcao(acao: AcaoPendente) {
    if (temOpcionais) {
      // Tem opcionais → abre o modal de seleção antes de prosseguir
      setAcaoPendente(acao);
      setShowOpcoes(true);
    } else {
      // Sem opcionais → executa a ação direto
      executarAcao(acao, [], 0);
    }
  }

  function executarAcao(acao: AcaoPendente, opcoes: OpcaoSelecionada[], totalAdicional: number) {
    // Cria produto com quantidade e opcionais embutidos
    const produtoFinal: ProdutoVenda & {
      _opcoes_selecionadas?: OpcaoSelecionada[];
      _quantidade?: number;
    } = {
      ...produto,
      preco_venda: produto.preco_venda + totalAdicional, // preço unitário já com adicionais
      _opcoes_selecionadas: opcoes,
      _quantidade: quantidade,
    };

    onClose();

    if (acao === 'pix') {
      onComprarPix?.(produtoFinal, opcoes, totalAdicional);
    } else if (acao === 'carrinho') {
      onAdicionarCarrinho?.(produtoFinal, opcoes, totalAdicional);
    }
  }

  // ── Calcular preço exibido ─────────────────────────────────────────────────

  const precoUnitario = produto.preco_venda;
  const precoTotal    = precoUnitario * quantidade;

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return createPortal(
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>

        {/* Card */}
        <div style={{
          position: 'relative',
          width: '100%', maxWidth: 480,
          background: P.bg,
          border: `1px solid ${P.border}`,
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
          overflow: 'hidden',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Botão fechar */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 10,
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.45)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconClose color="#fff" />
          </button>

          {/* Imagem */}
          {produto.imagem_url ? (
            <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={produto.imagem_url}
                alt={produto.nome}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            /* Placeholder sem imagem */
            <div style={{
              width: '100%', aspectRatio: '16/9', flexShrink: 0,
              background: `linear-gradient(135deg, ${P.bgCard}, ${P.bgOverlay})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={P.textFaint} strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}

          {/* Conteúdo */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>

            {/* Categoria + badge estoque */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              {produto.categoria ? (
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '.08em', color: P.accent,
                }}>
                  {produto.categoria}
                </span>
              ) : <span />}

              {semEstoque ? (
                <span style={{
                  padding: '3px 10px', borderRadius: 20,
                  background: P.dangerBg, color: P.danger,
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                }}>
                  Sem estoque
                </span>
              ) : produto.controla_estoque && produto.estoque_atual <= 5 ? (
                <span style={{
                  padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                }}>
                  Últimas unidades
                </span>
              ) : null}
            </div>

            {/* Nome */}
            <h2 style={{
              margin: '0 0 8px', fontSize: 22, fontWeight: 800,
              color: P.textPrimary, lineHeight: 1.25,
            }}>
              {produto.nome}
            </h2>

            {/* Descrição */}
            {produto.descricao && (
              <p style={{
                margin: '0 0 14px', fontSize: 14, color: P.textMuted, lineHeight: 1.6,
              }}>
                {produto.descricao}
              </p>
            )}

            {/* Opcionais disponíveis */}
            {!loadingOpcoes && temOpcionais && (
              <div style={{
                marginBottom: 14, padding: '8px 12px',
                background: P.tagBg,
                border: `1px solid ${P.tag}30`,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <IconStar color={P.tag} />
                <span style={{ fontSize: 12, color: P.tag, fontWeight: 600 }}>
                  Personalizável: {nomesGrupos.join(', ')}
                </span>
              </div>
            )}

            {/* Preço */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: P.textFaint }}>Preço unitário</p>
                <p style={{ margin: '2px 0 0', fontSize: 32, fontWeight: 900, color: P.accent, lineHeight: 1 }}>
                  {formatarPreco(precoUnitario)}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: P.textFaint }}>
                  por {produto.unidade}
                </p>
              </div>

              {/* Seletor de quantidade */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 0,
                border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden',
              }}>
                <button
                  onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                  style={{
                    width: 40, height: 40, border: 'none', cursor: 'pointer',
                    background: P.bgCard, color: P.textMuted,
                    fontSize: 18, fontWeight: 700, lineHeight: 1,
                  }}
                >
                  −
                </button>
                <div style={{
                  width: 44, height: 40, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: P.bg,
                  fontSize: 16, fontWeight: 700, color: P.textPrimary,
                  borderLeft: `1px solid ${P.border}`,
                  borderRight: `1px solid ${P.border}`,
                }}>
                  {quantidade}
                </div>
                <button
                  onClick={() => {
                    const maxEstoque = produto.controla_estoque ? produto.estoque_atual : 99;
                    setQuantidade(q => Math.min(maxEstoque, q + 1));
                  }}
                  style={{
                    width: 40, height: 40, border: 'none', cursor: 'pointer',
                    background: P.bgCard, color: P.textMuted,
                    fontSize: 18, fontWeight: 700, lineHeight: 1,
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Total */}
            {quantidade > 1 && (
              <div style={{
                marginBottom: 16, padding: '10px 14px',
                background: P.accentBg, border: `1px solid ${P.accentBorder}`,
                borderRadius: 10, display: 'flex', justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, color: P.textMuted }}>
                  Total ({quantidade}×)
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: P.accent }}>
                  {formatarPreco(precoTotal)}
                </span>
              </div>
            )}

            {/* Botões de ação */}
            {semEstoque ? (
              <div style={{
                padding: '14px', borderRadius: 14,
                background: P.dangerBg, border: `1px solid ${P.danger}30`,
                textAlign: 'center', fontSize: 14, color: P.danger, fontWeight: 600,
              }}>
                Produto indisponível no momento
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* PIX */}
                <button
                  onClick={() => handleAcao('pix')}
                  style={{
                    width: '100%', padding: '15px 20px',
                    background: P.pix, border: 'none', borderRadius: 14,
                    color: '#fff', fontWeight: 700, fontSize: 16,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: `0 4px 16px ${P.pix}40`,
                    transition: 'opacity .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <IconPix color="#fff" />
                  Pagar com PIX
                  <span style={{ fontSize: 13, opacity: .85 }}>
                    {formatarPreco(precoTotal)}
                  </span>
                </button>

                {/* Adicionar ao carrinho */}
                <button
                  onClick={() => handleAcao('carrinho')}
                  style={{
                    width: '100%', padding: '14px 20px',
                    background: P.cartBg, border: `1.5px solid ${P.cart}40`,
                    borderRadius: 14, color: P.cart,
                    fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    transition: 'opacity .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '.80')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <IconCart color={P.cart} />
                  Adicionar ao Carrinho
                </button>

                {/* Voltar */}
                <button
                  onClick={onClose}
                  style={{
                    width: '100%', padding: '10px',
                    background: 'transparent', border: 'none',
                    color: P.textFaint, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  ← Voltar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de opcionais — abre sobre o VerProdutoDisplay */}
      {showOpcoes && (
        <OpcionaisProdutoModal
          produto={produto}
          quantidade={quantidade}
          theme={theme}
          onConfirmar={(opcoes, totalAdicional) => {
            setShowOpcoes(false);
            executarAcao(acaoPendente, opcoes, totalAdicional);
          }}
          onCancelar={() => {
            setShowOpcoes(false);
            setAcaoPendente(null);
          }}
        />
      )}
    </>,
    document.body,
  );
}
