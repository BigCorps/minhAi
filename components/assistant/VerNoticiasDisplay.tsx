'use client';

import { useEffect, useState, useCallback } from 'react';
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

interface VerNoticiasDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  isDarkMode?: boolean;
}

// ============================================================================
// TEXTOS
// ============================================================================
const OPENING_TEXT = 'Carregando as últimas notícias para você.';
const ERROR_TEXT = 'Não foi possível carregar as notícias no momento. Tente novamente.';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function VerNoticiasDisplay({
  isOpen,
  onClose,
  companyId,
  isDarkMode = false,
}: VerNoticiasDisplayProps) {
  const P = isDarkMode ? DARK : LIGHT;

  const [stage, setStage] = useState<Stage>('loading');
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [error, setError] = useState<string>('');

  // ============================================================================
  // MOUNT: Falar texto inicial + buscar notícias + cobrar crédito
  // ============================================================================
  useEffect(() => {
    if (!isOpen) return;

    window.speechSynthesis?.cancel();
    playText(OPENING_TEXT);

    buscarNoticias();
    cobrarCredito();
  }, [isOpen]);

  // ============================================================================
  // BUSCAR NOTÍCIAS (Google News RSS)
  // ============================================================================
  const buscarNoticias = async () => {
    try {
      setStage('loading');

      // Google News RSS — português, global
      const rssUrl = 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419';
      
      // Usar RSS2JSON para converter RSS em JSON (serviço público gratuito)
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=5`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error('Erro ao buscar notícias');
      }

      const data = await response.json();

      if (data.status !== 'ok' || !data.items || data.items.length === 0) {
        throw new Error('Nenhuma notícia encontrada');
      }

      const noticiasFormatadas: Noticia[] = data.items.map((item: any) => ({
        title: item.title,
        url: item.link,
        source: item.author || 'Google News',
        publishedAt: new Date(item.pubDate).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));

      setNoticias(noticiasFormatadas);
      setStage('result');
    } catch (err: any) {
      console.error('❌ Erro ao buscar notícias:', err);
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

      console.log('✅ Crédito cobrado: Ver Notícias');
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

    if (lower.includes('repetir') || lower.includes('atualizar') || lower.includes('recarregar')) {
      buscarNoticias();
      return true;
    }

    return false;
  }, [onClose]);

  useModalVoiceCommand({
    active: isOpen,
    onTranscript: handleVoiceCommand,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleNoticiaClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
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
                Ver Notícias
              </h2>
              <p style={{ fontSize: '0.875rem', color: P.textMuted, margin: 0 }}>
                Últimas manchetes do momento
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
                Buscando notícias...
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
              <p style={{ color: '#dc2626', fontWeight: '500', margin: 0 }}>
                {error || ERROR_TEXT}
              </p>
              <button
                onClick={buscarNoticias}
                style={{
                  marginTop: '1rem',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {noticias.map((noticia, index) => (
                <div
                  key={index}
                  onClick={() => handleNoticiaClick(noticia.url)}
                  style={{
                    padding: '1rem',
                    backgroundColor: P.cardBg,
                    borderRadius: '0.5rem',
                    border: `1px solid ${P.border}`,
                    cursor: 'pointer',
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
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: P.text,
                      margin: '0 0 0.5rem 0',
                      lineHeight: '1.4',
                    }}
                  >
                    {noticia.title}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: P.textMuted,
                    }}
                  >
                    <span>{noticia.source}</span>
                    <span>{noticia.publishedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER — Voice Hints */}
        {stage === 'result' && (
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
              💬 Diga: <strong>"Atualizar"</strong> • <strong>"Fechar"</strong>
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
