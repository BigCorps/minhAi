'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';
import { playText } from '@/lib/tts';

// ============================================================================
// PALETAS DE COR (inline styles — nunca Tailwind dinâmico)
// ============================================================================
const DARK = {
  bg: '#1e293b',
  bgSecondary: '#0f172a',
  border: 'rgba(255,255,255,0.08)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  accent: '#00FFF7',
  accentHover: '#00d4cc',
  cardBg: '#334155',
  cardHover: '#475569',
  inputBg: '#0f172a',
  inputBorder: '#334155',
};

const LIGHT = {
  bg: '#ffffff',
  bgSecondary: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  accent: '#00b8b0',
  accentHover: '#009990',
  cardBg: '#f1f5f9',
  cardHover: '#e2e8f0',
  inputBg: '#ffffff',
  inputBorder: '#e2e8f0',
};

// ============================================================================
// TIPOS
// ============================================================================
interface Produto {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  permalink: string;
}

type Stage = 'input' | 'loading' | 'result' | 'error';

interface ProcurarProdutoDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  isDarkMode?: boolean;
}

// ============================================================================
// TEXTOS
// ============================================================================
const OPENING_TEXT = 'Digite o produto que deseja buscar no Mercado Livre.';
const LOADING_TEXT = 'Buscando produtos...';
const ERROR_TEXT = 'Não foi possível buscar produtos. Tente novamente.';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function ProcurarProdutoDisplay({
  isOpen,
  onClose,
  companyId,
  isDarkMode = false,
}: ProcurarProdutoDisplayProps) {
  const P = isDarkMode ? DARK : LIGHT;

  const [stage, setStage] = useState<Stage>('input');
  const [query, setQuery] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // MOUNT: Falar texto inicial + focar input + cobrar crédito
  // ============================================================================
  useEffect(() => {
    if (!isOpen) return;

    window.speechSynthesis?.cancel();
    playText(OPENING_TEXT);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    cobrarCredito();
  }, [isOpen]);

  // ============================================================================
  // BUSCAR PRODUTOS (Mercado Livre API)
  // ============================================================================
  const buscarProdutos = async () => {
    if (!query.trim()) {
      setError('Digite algo para buscar');
      return;
    }

    try {
      setStage('loading');
      playText(LOADING_TEXT);

      // API pública do Mercado Livre Brasil
      const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(
        query
      )}&limit=5`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Erro ao buscar produtos');
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error('Nenhum produto encontrado');
      }

      const produtosFormatados: Produto[] = data.results.map((item: any) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        thumbnail: item.thumbnail,
        permalink: item.permalink,
      }));

      setProdutos(produtosFormatados);
      setStage('result');
      playText(`Encontrei ${produtosFormatados.length} produtos.`);
    } catch (err: any) {
      console.error('❌ Erro ao buscar produtos:', err);
      setError(err.message || 'Erro desconhecido');
      setStage('error');
      playText(ERROR_TEXT);
    }
  };

  // ============================================================================
  // COBRAR CRÉDITO (1 crédito ao abrir modal)
  // ============================================================================
  const cobrarCredito = async () => {
    try {
      const supabase = createClient();

      const { data: company } = await supabase
        .from('companies')
        .select('credits')
        .eq('id', companyId)
        .single();

      if (!company) return;

      const newCredits = Math.max(0, (company.credits || 0) - 1);

      await supabase
        .from('companies')
        .update({ credits: newCredits })
        .eq('id', companyId);

      console.log('✅ Crédito cobrado: Procurar Produto');
    } catch (err) {
      console.error('❌ Erro ao cobrar crédito:', err);
    }
  };

  // ============================================================================
  // COMANDOS DE VOZ
  // ============================================================================
  const handleVoiceCommand = useCallback((transcript: string) => {
    const lower = transcript.toLowerCase();

    if (lower.includes('fechar') || lower.includes('sair') || lower.includes('voltar')) {
      onClose();
      return true;
    }

    if (stage === 'result') {
      if (lower.includes('buscar novamente') || lower.includes('nova busca')) {
        setStage('input');
        setQuery('');
        setProdutos([]);
        setTimeout(() => inputRef.current?.focus(), 100);
        return true;
      }
    }

    return false;
  }, [stage, onClose]);

  useModalVoiceCommand({
    active: isOpen,
    onTranscript: handleVoiceCommand,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleProdutoClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buscarProdutos();
  };

  const handleReset = () => {
    setStage('input');
    setQuery('');
    setProdutos([]);
    setError('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    window.speechSynthesis?.cancel();
    onClose();
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: P.bg,
          borderRadius: '1rem',
          maxWidth: '48rem',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: `1px solid ${P.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: `1px solid ${P.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Ícone SVG inline */}
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                backgroundColor: P.accent + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}
            >
              ❄️
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: P.text,
                  margin: 0,
                }}
              >
                Procurar Produto
              </h2>
              <p style={{ fontSize: '0.875rem', color: P.textMuted, margin: 0 }}>
                Busque produtos no Mercado Livre
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              color: P.textMuted,
              fontSize: '1.5rem',
              lineHeight: 1,
            }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* CONTENT */}
        <div style={{ padding: '1.5rem' }}>
          {/* INPUT STAGE */}
          {stage === 'input' && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="produto-query"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: P.text,
                    marginBottom: '0.5rem',
                  }}
                >
                  O que você está procurando?
                </label>
                <input
                  ref={inputRef}
                  id="produto-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: notebook gamer, fone bluetooth..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: P.inputBg,
                    border: `1px solid ${P.inputBorder}`,
                    borderRadius: '0.5rem',
                    color: P.text,
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = P.accent;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = P.inputBorder;
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: P.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = P.accentHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = P.accent;
                }}
              >
                🔍 Buscar Produtos
              </button>
            </form>
          )}

          {/* LOADING */}
          {stage === 'loading' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1rem',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  border: `3px solid ${P.border}`,
                  borderTop: `3px solid ${P.accent}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ color: P.textMuted, fontSize: '0.875rem' }}>
                Buscando produtos no Mercado Livre...
              </p>
            </div>
          )}

          {/* ERROR */}
          {stage === 'error' && (
            <div
              style={{
                padding: '1.5rem',
                borderRadius: '0.5rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                textAlign: 'center',
              }}
            >
              <p style={{ color: '#dc2626', fontWeight: '500', margin: '0 0 1rem 0' }}>
                {error || ERROR_TEXT}
              </p>
              <button
                onClick={handleReset}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: P.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* RESULT */}
          {stage === 'result' && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: `1px solid ${P.border}`,
                }}
              >
                <p style={{ color: P.textMuted, fontSize: '0.875rem', margin: 0 }}>
                  Busca: <strong style={{ color: P.text }}>{query}</strong>
                </p>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '0.375rem 0.75rem',
                    backgroundColor: P.bgSecondary,
                    color: P.text,
                    border: `1px solid ${P.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Nova Busca
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {produtos.map((produto) => (
                  <div
                    key={produto.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem',
                      backgroundColor: P.cardBg,
                      borderRadius: '0.5rem',
                      border: `1px solid ${P.border}`,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = P.cardHover;
                      e.currentTarget.style.borderColor = P.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = P.cardBg;
                      e.currentTarget.style.borderColor = P.border;
                    }}
                  >
                    {/* Imagem */}
                    <img
                      src={produto.thumbnail}
                      alt={produto.title}
                      style={{
                        width: '4rem',
                        height: '4rem',
                        objectFit: 'cover',
                        borderRadius: '0.375rem',
                        flexShrink: 0,
                      }}
                    />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: P.text,
                          margin: '0 0 0.25rem 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.3',
                        }}
                      >
                        {produto.title}
                      </h3>
                      <p
                        style={{
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          color: P.accent,
                          margin: 0,
                        }}
                      >
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(produto.price)}
                      </p>
                    </div>

                    {/* Botão abrir */}
                    <button
                      onClick={() => handleProdutoClick(produto.permalink)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: P.accent,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = P.accentHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = P.accent;
                      }}
                    >
                      Abrir →
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* FOOTER — Voice Hints */}
        {(stage === 'input' || stage === 'result') && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: `1px solid ${P.border}`,
              backgroundColor: P.bgSecondary,
              borderBottomLeftRadius: '1rem',
              borderBottomRightRadius: '1rem',
            }}
          >
            <p
              style={{
                fontSize: '0.75rem',
                color: P.textMuted,
                margin: 0,
                textAlign: 'center',
              }}
            >
              💬 Diga:{' '}
              {stage === 'input' ? (
                <strong>"Fechar"</strong>
              ) : (
                <>
                  <strong>"Nova busca"</strong> • <strong>"Fechar"</strong>
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
