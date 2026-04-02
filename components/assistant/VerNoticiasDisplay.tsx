'use client';

import { useEffect, useState, useCallback } from 'react';
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
  buttonSecondary: '#e2e8f0',
  buttonSecondaryHover: '#cbd5e1',
};

// ============================================================================
// TIPOS
// ============================================================================
interface Noticia {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

type Stage = 'loading' | 'result' | 'error';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

const OPENING_TEXT = 'Carregando as últimas notícias para você.';
const ERROR_TEXT = 'Não foi possível carregar as notícias no momento. Tente novamente.';

// URL da edge function — ajuste para o seu project ref
const EDGE_URL =
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/noticias-produtos`;

// ============================================================================
// COMPONENTE
// ============================================================================
export default function VerNoticiasDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const { companyId } = data;
  const colors = theme === 'dark' ? DARK : LIGHT;

  const [stage, setStage] = useState<Stage>('loading');
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    playText?.(OPENING_TEXT).catch(() => {});
    buscarNoticias();
    cobrarCredito();
  }, []);

  // ── Notícias via Edge Function ─────────────────────────────────────────────
  const buscarNoticias = async () => {
    try {
      setStage('loading');

      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'noticias' }),
      });

      if (!res.ok) throw new Error(`Erro ao buscar notícias (${res.status})`);

      const json = await res.json();

      if (!json.articles || json.articles.length === 0) {
        throw new Error('Nenhuma notícia encontrada');
      }

      const formatted: Noticia[] = json.articles.map((item: any) => ({
        title: item.title,
        url: item.url,
        source: item.source?.name || 'GNews',
        publishedAt: new Date(item.publishedAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));

      setNoticias(formatted);
      setStage('result');
    } catch (err: any) {
      console.error('❌ Erro ao buscar notícias:', err);
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

      console.log('✅ Crédito cobrado: Ver Notícias');
    } catch (err) {
      console.error('❌ Erro ao cobrar crédito:', err);
    }
  };

  // ── Voz ───────────────────────────────────────────────────────────────────
  const handleVoiceCommand = useCallback(
    (transcript: string) => {
      const lower = transcript.toLowerCase();
      if (lower.includes('fechar') || lower.includes('sair') || lower.includes('voltar')) {
        onClose();
        return true;
      }
      if (lower.includes('repetir') || lower.includes('atualizar') || lower.includes('recarregar')) {
        buscarNoticias();
        return true;
      }
      return false;
    },
    [onClose],
  );

  useModalVoiceCommand({ active: true, onTranscript: handleVoiceCommand });

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
              className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
              style={{ background: colors.accent + '20' }}
            >
              📰
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                Ver Notícias
              </h2>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Últimas manchetes do momento
              </p>
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
          {/* LOADING */}
          {stage === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div
                className="w-12 h-12 rounded-full"
                style={{
                  border: `3px solid ${colors.border}`,
                  borderTop: `3px solid ${colors.accent}`,
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Buscando notícias...
              </p>
            </div>
          )}

          {/* ERROR */}
          {stage === 'error' && (
            <div
              className="p-6 rounded-xl text-center"
              style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
            >
              <p className="font-semibold mb-4" style={{ color: '#dc2626' }}>
                {error || ERROR_TEXT}
              </p>
              <button
                onClick={buscarNoticias}
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
            <div className="flex flex-col gap-3">
              {noticias.map((noticia, index) => (
                <div
                  key={index}
                  onClick={() => window.open(noticia.url, '_blank', 'noopener,noreferrer')}
                  className="p-4 rounded-xl cursor-pointer transition-all"
                  style={{ background: colors.cardBg, border: `1px solid ${colors.border}` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.cardHover;
                    e.currentTarget.style.borderColor = colors.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.cardBg;
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  <h3 className="text-base font-semibold mb-2 leading-snug" style={{ color: colors.text }}>
                    {noticia.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs" style={{ color: colors.textMuted }}>
                    <span>{noticia.source}</span>
                    <span>{noticia.publishedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        {stage === 'result' && (
          <div
            className="px-6 py-3"
            style={{ borderTop: `1px solid ${colors.border}`, background: colors.bgSecondary }}
          >
            <p className="text-xs text-center" style={{ color: colors.textMuted }}>
              💬 Diga: <strong>"Atualizar"</strong> • <strong>"Fechar"</strong>
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body,
  );
}
