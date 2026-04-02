'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';

// ============================================================================
// PALETAS DE COR
// ============================================================================
const DARK = {
  bg: '#1e293b',
  bgSecondary: '#0f172a',
  border: 'rgba(255,255,255,0.08)',
  cardBg: 'rgba(15,23,42,0.6)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.4)',
  accent: '#00FFF7',
  accentHover: '#00d4cc',
  cardHover: '#475569',
  inputBg: '#0f172a',
  inputBorder: '#334155',
  buttonSecondary: 'rgba(255,255,255,0.1)',
  buttonSecondaryHover: 'rgba(255,255,255,0.15)',
};

const LIGHT = {
  bg: '#ffffff',
  bgSecondary: '#f8fafc',
  border: '#e2e8f0',
  cardBg: '#f8fafc',
  text: '#1e293b',
  textMuted: '#94a3b8',
  accent: '#00b8b0',
  accentHover: '#009990',
  cardHover: '#e2e8f0',
  inputBg: '#ffffff',
  inputBorder: '#e2e8f0',
  buttonSecondary: '#e2e8f0',
  buttonSecondaryHover: '#cbd5e1',
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

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

const OPENING_TEXT = 'Digite o produto que deseja buscar no Mercado Livre.';
const LOADING_TEXT = 'Buscando produtos...';
const ERROR_TEXT = 'Não foi possível buscar produtos. Tente novamente.';

// URL da edge function — ajuste para o seu project ref
const EDGE_URL =
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/noticias-produtos`;

// Força HTTPS no thumbnail para evitar mixed-content
const toHttps = (url: string) => url.replace(/^http:\/\//, 'https://');

// ============================================================================
// COMPONENTE
// ============================================================================
export default function ProcurarProdutoDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const { companyId } = data;
  const colors = theme === 'dark' ? DARK : LIGHT;

  const [stage, setStage] = useState<Stage>('input');
  const [query, setQuery] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    playText?.(OPENING_TEXT).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 100);
    cobrarCredito();
  }, []);

  // ── Produtos via Edge Function ─────────────────────────────────────────────
  const buscarProdutos = async () => {
    if (!query.trim()) { setError('Digite algo para buscar'); return; }

    try {
      setStage('loading');
      playText?.(LOADING_TEXT).catch(() => {});

      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'produtos', query: query.trim() }),
      });

      if (!res.ok) throw new Error(`Erro ao buscar produtos (${res.status})`);

      const mlData = await res.json();

      if (!mlData.results || mlData.results.length === 0) {
        throw new Error('Nenhum produto encontrado');
      }

      const formatted: Produto[] = mlData.results.map((item: any) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        thumbnail: toHttps(item.thumbnail),
        permalink: item.permalink,
      }));

      setProdutos(formatted);
      setStage('result');
      playText?.(`Encontrei ${formatted.length} produtos.`).catch(() => {});
    } catch (err: any) {
      console.error('❌ Erro ao buscar produtos:', err);
      setError(err.message || 'Erro desconhecido');
      setStage('error');
      playText?.(ERROR_TEXT).catch(() => {});
    }
  };

  // ── Crédito — sem .single() ────────────────────────────────────────────────
  const cobrarCredito = async () => {
    try {
      const supabase = createClient();

      const { data: companies, error: fetchError } = await supabase
        .from('companies')
        .select('credits')
        .eq('id', companyId);

      if (fetchError || !companies || companies.length === 0) return;

      const newCredits = Math.max(0, (companies[0].credits || 0) - 1);

      await supabase.from('companies').update({ credits: newCredits }).eq('id', companyId);

      console.log('✅ Crédito cobrado: Procurar Produto');
    } catch (err) {
      console.error('❌ Erro ao cobrar crédito:', err);
    }
  };

  // ── Voz ───────────────────────────────────────────────────────────────────
  const handleVoiceCommand = useCallback(
    (transcript: string) => {
      const lower = transcript.toLowerCase();
      if (lower.includes('fechar') || lower.includes('sair') || lower.includes('voltar')) {
        onClose(); return true;
      }
      if (stage === 'result' && (lower.includes('buscar novamente') || lower.includes('nova busca'))) {
        handleReset(); return true;
      }
      return false;
    },
    [stage, onClose],
  );

  useModalVoiceCommand({ active: true, onTranscript: handleVoiceCommand });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    setStage('input'); setQuery(''); setProdutos([]); setError('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    window.speechSynthesis?.cancel();
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: colors.bg, border: `1px solid ${colors.border}`, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${colors.border}`, background: colors.cardBg }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: colors.accent + '20' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: colors.accent }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: colors.text }}>Procurar Produto</h2>
              <p className="text-sm" style={{ color: colors.textMuted }}>Busque produtos no Mercado Livre</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full transition"
            style={{ background: colors.buttonSecondary, color: colors.text }}
            onMouseEnter={(e) => (e.currentTarget.style.background = colors.buttonSecondaryHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = colors.buttonSecondary)}
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {/* INPUT */}
          {stage === 'input' && (
            <div className="space-y-4">
              <div
                className="p-4 rounded-xl border"
                style={{ background: colors.accent + '15', borderColor: colors.accent + '50' }}
              >
                <p className="text-sm text-center font-medium" style={{ color: colors.text }}>
                  🛒 Digite o nome do produto que deseja encontrar
                </p>
              </div>

              <div>
                <label htmlFor="produto-query" className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  O que você está procurando?
                </label>
                <input
                  ref={inputRef}
                  id="produto-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarProdutos()}
                  placeholder="Ex: notebook gamer, fone bluetooth..."
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{ background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: colors.text }}
                  onFocus={(e) => (e.target.style.borderColor = colors.accent)}
                  onBlur={(e) => (e.target.style.borderColor = colors.inputBorder)}
                />
              </div>

              <button
                onClick={buscarProdutos}
                disabled={!query.trim()}
                className="w-full px-4 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: colors.accent }}
                onMouseEnter={(e) => { if (query.trim()) e.currentTarget.style.background = colors.accentHover; }}
                onMouseLeave={(e) => (e.currentTarget.style.background = colors.accent)}
              >
                🔍 Buscar Produtos
              </button>
            </div>
          )}

          {/* LOADING */}
          {stage === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div
                className="w-12 h-12 rounded-full"
                style={{ border: `3px solid ${colors.border}`, borderTop: `3px solid ${colors.accent}`, animation: 'spin 1s linear infinite' }}
              />
              <p className="text-sm" style={{ color: colors.textMuted }}>Buscando produtos no Mercado Livre...</p>
            </div>
          )}

          {/* ERROR */}
          {stage === 'error' && (
            <div className="p-6 rounded-xl text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="font-semibold mb-4" style={{ color: '#dc2626' }}>{error || ERROR_TEXT}</p>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg font-semibold text-white transition"
                style={{ background: colors.accent }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = colors.accent)}
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* RESULT */}
          {stage === 'result' && (
            <>
              <div
                className="flex justify-between items-center mb-4 pb-3"
                style={{ borderBottom: `1px solid ${colors.border}` }}
              >
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  Busca: <strong style={{ color: colors.text }}>{query}</strong>
                </p>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  style={{ background: colors.buttonSecondary, color: colors.text, border: `1px solid ${colors.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.buttonSecondaryHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = colors.buttonSecondary)}
                >
                  Nova Busca
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {produtos.map((produto) => (
                  <div
                    key={produto.id}
                    className="flex items-center gap-4 p-3 rounded-xl transition-all"
                    style={{ background: colors.cardBg, border: `1px solid ${colors.border}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.cardHover; e.currentTarget.style.borderColor = colors.accent; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = colors.cardBg; e.currentTarget.style.borderColor = colors.border; }}
                  >
                    <img
                      src={produto.thumbnail}
                      alt={produto.title}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold mb-1 leading-snug line-clamp-2" style={{ color: colors.text }}>
                        {produto.title}
                      </h3>
                      <p className="text-base font-bold" style={{ color: colors.accent }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => window.open(produto.permalink, '_blank', 'noopener,noreferrer')}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-white flex-shrink-0 transition"
                      style={{ background: colors.accent }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = colors.accent)}
                    >
                      Abrir →
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        {(stage === 'input' || stage === 'result') && (
          <div className="px-6 py-3" style={{ borderTop: `1px solid ${colors.border}`, background: colors.bgSecondary }}>
            <p className="text-xs text-center" style={{ color: colors.textMuted }}>
              💬 Diga:{' '}
              {stage === 'input'
                ? <strong>"Fechar"</strong>
                : <><strong>"Nova busca"</strong> • <strong>"Fechar"</strong></>
              }
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body,
  );
}
