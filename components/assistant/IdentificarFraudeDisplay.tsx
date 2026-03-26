'use client';

// ─────────────────────────────────────────────────────────────────────────────
// IdentificarFraudeDisplay.tsx
// Caminho: components/VoiceAssistant/modals/IdentificarFraudeDisplay.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Loader2, Mic, Link, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import CameraCapture from '@/components/assistant/CameraCapture';

// ─── Tipos ───────────────────────────────────────────────────────────────────
type InputMode = 'image' | 'url';
type Tab       = 'companion' | 'upload';
type Stage     = 'input' | 'processing' | 'result' | 'error';
type RiskLevel = 'SEGURO' | 'SUSPEITO' | 'FRAUDE';

interface FraudeData {
  risk_level: RiskLevel;
  score: number;
  type: string;
  indicators: string[];
  recommendation: string;
  details: string;
  url_analyzed?: string;
}

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// ─── Paletas ─────────────────────────────────────────────────────────────────
const DARK = {
  bg:              '#1e293b',
  border:          'rgba(255,255,255,0.08)',
  header:          '#f8fafc',
  sub:             '#94a3b8',
  card:            '#0f172a',
  cardBorder:      'rgba(255,255,255,0.06)',
  input:           '#0f172a',
  inputBorder:     '#334155',
  inputText:       '#e2e8f0',
  inputPlaceholder:'#64748b',
  tabActive:       '#6366f1',
  tabInactive:     'rgba(255,255,255,0.05)',
  tabActiveText:   '#ffffff',
  tabInactiveText: '#94a3b8',
  hint:            'rgba(255,255,255,0.05)',
  hintText:        '#64748b',
  hintCode:        'rgba(255,255,255,0.08)',
  btn:             '#6366f1',
  btnText:         '#ffffff',
  btnSecondary:    'rgba(255,255,255,0.08)',
  btnSecondaryText:'#cbd5e1',
  errorBg:         'rgba(239,68,68,0.12)',
  errorBorder:     'rgba(239,68,68,0.3)',
  errorText:       '#fca5a5',
};

const LIGHT = {
  bg:              '#ffffff',
  border:          '#e2e8f0',
  header:          '#0f172a',
  sub:             '#64748b',
  card:            '#f8fafc',
  cardBorder:      '#e2e8f0',
  input:           '#ffffff',
  inputBorder:     '#cbd5e1',
  inputText:       '#1e293b',
  inputPlaceholder:'#94a3b8',
  tabActive:       '#6366f1',
  tabInactive:     '#f1f5f9',
  tabActiveText:   '#ffffff',
  tabInactiveText: '#64748b',
  hint:            '#f8fafc',
  hintText:        '#94a3b8',
  hintCode:        '#e2e8f0',
  btn:             '#6366f1',
  btnText:         '#ffffff',
  btnSecondary:    '#f1f5f9',
  btnSecondaryText:'#475569',
  errorBg:         '#fef2f2',
  errorBorder:     '#fecaca',
  errorText:       '#dc2626',
};

// ─── Semáforo ─────────────────────────────────────────────────────────────────
const RISK_CONFIG: Record<RiskLevel, {
  color: string; bg: string; border: string; emoji: string; label: string;
}> = {
  SEGURO:   { color: '#16a34a', bg: 'rgba(22,163,74,0.12)',  border: 'rgba(22,163,74,0.3)',  emoji: '✅', label: 'Seguro'   },
  SUSPEITO: { color: '#d97706', bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.3)',  emoji: '⚠️', label: 'Suspeito' },
  FRAUDE:   { color: '#dc2626', bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.3)',  emoji: '🚨', label: 'Fraude'   },
};

const TYPE_LABELS: Record<string, string> = {
  boleto:          'Boleto',
  pix:             'PIX',
  phishing:        'Phishing / Site Falso',
  mensagem_golpe:  'Mensagem Golpe',
  imagem_generica: 'Imagem',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

// Áudio de abertura — apenas aqui.
// O handler do registry e o case do VoiceAssistant NÃO chamam playText.
const OPENING_TEXT =
  'Modo de identificação de fraude. Escolha imagem para enviar um boleto ou comprovante, ou link para analisar um site suspeito.';

// ─── VoiceHint ────────────────────────────────────────────────────────────────
function VoiceHint({ commands, p }: { commands: string[]; p: typeof DARK }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 12, background: p.hint,
    }}>
      <Mic style={{ width: 14, height: 14, color: p.hintText, flexShrink: 0 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
        {commands.map(cmd => (
          <span key={cmd} style={{
            padding: '2px 6px', borderRadius: 6,
            fontFamily: 'monospace', fontSize: 11,
            background: p.hintCode, color: p.hintText,
          }}>
            "{cmd}"
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── ScoreBar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score, riskLevel }: { score: number; riskLevel: RiskLevel }) {
  const cfg = RISK_CONFIG[riskLevel];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: cfg.color }}>
        <span>Score de risco</span>
        <span style={{ fontWeight: 700 }}>{score}/100</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${score}%`,
          background: cfg.color, borderRadius: 999,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function IdentificarFraudeDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const p        = theme === 'dark' ? DARK : LIGHT;
  const supabase = createClient();

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [inputMode, setInputMode]         = useState<InputMode>('image');
  const [cameraTab, setCameraTab]         = useState<Tab>('companion');
  const [stage, setStage]                 = useState<Stage>('input');
  const [urlInput, setUrlInput]           = useState('');
  const [urlError, setUrlError]           = useState('');
  const [fraudeData, setFraudeData]       = useState<FraudeData | null>(null);
  const [errorMsg, setErrorMsg]           = useState('');
  const [urlFetchError, setUrlFetchError] = useState<string | null>(null);

  // Refs
  const lastTabCommandRef    = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref para handleAnalyzeUrl — evita stale closure no companion callback
  const handleAnalyzeUrlRef  = useRef<(urlToAnalyze?: string) => Promise<void>>();

  // ── Abrir modal — fala UMA vez ───────────────────────────────────────────────
  useEffect(() => {
    window.speechSynthesis?.cancel();
    playText(OPENING_TEXT).catch(() => {});
  }, []); // eslint-disable-line

  // ── Analisar URL ──────────────────────────────────────────────────────────────
  const handleAnalyzeUrl = useCallback(async (urlToAnalyze?: string) => {
    const target = (urlToAnalyze ?? urlInput).trim();
    if (!target) { setUrlError('Cole uma URL para análise.'); return; }

    const normalized = target.startsWith('http') ? target : `https://${target}`;
    try { new URL(normalized); } catch { setUrlError('URL inválida.'); return; }

    setUrlError('');
    setStage('processing');

    try {
      const { data: res, error } = await supabase.functions.invoke('camera-process', {
        body: { action: 'fraude_url', url: normalized, company_id: data.companyId },
      });
      if (error) throw new Error(error.message);
      if (!res.success) throw new Error(res.error ?? 'Falha na análise');
      setFraudeData(res.fraude);
      setUrlFetchError(res.url_fetch_error ?? null);
      setStage('result');
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao analisar URL.');
      setStage('error');
    }
  }, [urlInput, data.companyId, supabase, playText]);

  // Manter ref sempre atualizada com a versão mais recente
  useEffect(() => {
    handleAnalyzeUrlRef.current = handleAnalyzeUrl;
  }, [handleAnalyzeUrl]);

  // ── Callback para quando o celular envia link via QR ─────────────────────────
  // Usa ref para garantir versão atualizada — evita stale closure do Realtime
  const handleUrlFromCompanion = useCallback((url: string) => {
    setInputMode('url');
    setUrlInput(url);
    // Defer de 50ms garante que setUrlInput já propagou antes de chamar via ref
    setTimeout(() => {
      handleAnalyzeUrlRef.current?.(url);
    }, 50);
  }, []);

  // ── Captura imagem/PDF ────────────────────────────────────────────────────────
  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');
    try {
      const clean = base64.includes(',') ? base64.split(',')[1] : base64;
      const { data: res, error } = await supabase.functions.invoke('camera-process', {
        body: { action: 'fraude', image: clean, company_id: data.companyId },
      });
      if (error) throw new Error(error.message);
      if (!res.success) throw new Error(res.error ?? 'Falha na análise');
      setFraudeData(res.fraude);
      setStage('result');
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao analisar imagem.');
      setStage('error');
    }
  }, [data.companyId, supabase, playText]);

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setStage('input');
    setFraudeData(null);
    setErrorMsg('');
    setUrlInput('');
    setUrlError('');
    setUrlFetchError(null);
    setCameraTab('companion');
  }, []);

  // ── Voice commands ────────────────────────────────────────────────────────────
  // Apenas companion e upload — webcam e câmera removidos desta função
  const TAB_COMMANDS: Record<string, string[]> = {
    upload:    ['arquivo', 'upload', 'galeria'],
    companion: ['celular', 'qr code', 'qrcode', 'enviar do celular'],
  };
  const TAB_FEEDBACK: Record<string, string> = {
    upload:    'Selecione um arquivo ou imagem.',
    companion: 'Aponte o celular para o QR Code.',
  };

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(cmd => t.includes(cmd))) {
        onClose(); return;
      }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(cmd => t.includes(cmd))) {
        playText(OPENING_TEXT).catch(() => {});
        return;
      }

      // Alternar modo
      if (stage === 'input') {
        if (['imagem', 'foto', 'boleto', 'comprovante'].some(cmd => t.includes(cmd))) {
          setInputMode('image');
          playText('Modo imagem. Envie o boleto ou comprovante.').catch(() => {});
          return;
        }
        if (['link', 'url', 'site', 'endereco'].some(cmd => t.includes(cmd))) {
          setInputMode('url');
          playText('Modo link. Digite ou cole a URL suspeita.').catch(() => {});
          return;
        }
      }

      // Comandos de aba — só no modo imagem, stage input
      if (stage === 'input' && inputMode === 'image') {
        for (const [tab, triggers] of Object.entries(TAB_COMMANDS)) {
          if (triggers.some(tr => t.includes(tr))) {
            if (lastTabCommandRef.current === tab) return;
            lastTabCommandRef.current = tab;
            setCameraTab(tab as Tab);
            playText(TAB_FEEDBACK[tab]).catch(() => {});
            if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
            tabCommandTimeoutRef.current = setTimeout(() => {
              lastTabCommandRef.current = null;
            }, 4000);
            return;
          }
        }
      }

      if (stage === 'result') {
        if (['nova analise', 'novo', 'analisar outro', 'novamente'].some(cmd => t.includes(cmd))) {
          handleReset(); return;
        }
      }

      if (stage === 'error') {
        if (['tentar', 'novamente', 'tentar novamente'].some(cmd => t.includes(cmd))) {
          handleReset(); return;
        }
      }
    },
  });

  // ─── Render ──────────────────────────────────────────────────────────────────
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: stage === 'result' ? 680 : 520,
        background: p.bg, border: `1px solid ${p.border}`,
        borderRadius: 20, padding: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: p.header, margin: 0 }}>
            🔍 Identificar Fraude
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 8px', borderRadius: 10, color: p.sub, lineHeight: 0,
          }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            STAGE: input
        ══════════════════════════════════════════════════════ */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Toggle Imagem / Link */}
            <div style={{
              display: 'flex', gap: 4, padding: 4,
              background: p.tabInactive, borderRadius: 14,
            }}>
              {([
                { id: 'image' as InputMode, label: 'Imagem / Boleto', Icon: ImageIcon },
                { id: 'url'   as InputMode, label: 'Link / URL',      Icon: Link      },
              ]).map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setInputMode(id)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '9px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                  background: inputMode === id ? p.tabActive : 'transparent',
                  color: inputMode === id ? p.tabActiveText : p.tabInactiveText,
                }}>
                  <Icon style={{ width: 14, height: 14 }} />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Modo Imagem — apenas Celular e Upload ── */}
            {inputMode === 'image' && (
              <>
                <CameraCapture
                  onCapture={handleCapture}
                  onCancel={onClose}
                  theme={theme}
                  companyId={data.companyId}
                  acceptPdf
                  enabledTabs={['companion', 'upload']}
                  activeTab={cameraTab}
                  onTabChange={(tab) => setCameraTab(tab as Tab)}
                  onUrlReceived={handleUrlFromCompanion}
                  instructions="Envie o boleto ou comprovante suspeito para análise."
                />
                <VoiceHint
                  commands={['imagem', 'link', 'celular', 'arquivo', 'fechar']}
                  p={p}
                />
              </>
            )}

            {/* ── Modo URL ── */}
            {inputMode === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, color: p.sub, textAlign: 'center', margin: 0 }}>
                  Cole o link suspeito para verificar se é phishing ou fraude
                </p>

                {/* Dica totem */}
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: theme === 'dark' ? 'rgba(99,102,241,0.1)' : '#eef2ff',
                  border: `1px solid ${theme === 'dark' ? 'rgba(99,102,241,0.25)' : '#c7d2fe'}`,
                  fontSize: 12,
                  color: theme === 'dark' ? '#a5b4fc' : '#4338ca',
                }}>
                  📱 Em totens sem teclado: use a aba <strong>Imagem / Boleto</strong> e envie o link pelo celular via QR Code.
                </div>

                <input
                  type="url"
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setUrlError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyzeUrl()}
                  placeholder="https://site-suspeito.com"
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    border: `1px solid ${urlError ? '#ef4444' : p.inputBorder}`,
                    background: p.input, color: p.inputText,
                    fontSize: 13, fontFamily: 'monospace',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {urlError && (
                  <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{urlError}</p>
                )}
                <button
                  onClick={() => handleAnalyzeUrl()}
                  disabled={!urlInput.trim()}
                  style={{
                    padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: urlInput.trim() ? p.btn : p.btnSecondary,
                    color: urlInput.trim() ? p.btnText : p.btnSecondaryText,
                    fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                  }}
                >
                  Analisar link
                </button>
                <VoiceHint commands={['imagem', 'link', 'fechar']} p={p} />
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAGE: processing
        ══════════════════════════════════════════════════════ */}
        {stage === 'processing' && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 16, padding: '32px 0',
          }}>
            <Loader2 style={{
              width: 40, height: 40, color: '#6366f1',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: p.header, margin: 0 }}>
              Analisando {inputMode === 'url' ? 'o link' : 'a imagem'}...
            </p>
            <p style={{ fontSize: 13, color: p.sub, margin: 0 }}>
              Verificando indícios de fraude
            </p>
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAGE: result
        ══════════════════════════════════════════════════════ */}
        {stage === 'result' && fraudeData && (() => {
          const cfg = RISK_CONFIG[fraudeData.risk_level] ?? RISK_CONFIG.SUSPEITO;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Card semáforo */}
              <div style={{
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                borderRadius: 16, padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 36, lineHeight: 1 }}>{cfg.emoji}</span>
                  <div>
                    <p style={{ fontSize: 22, fontWeight: 800, color: cfg.color, margin: 0 }}>
                      {cfg.label}
                    </p>
                    <p style={{ fontSize: 13, color: p.sub, margin: 0 }}>
                      {TYPE_LABELS[fraudeData.type] ?? fraudeData.type}
                      {fraudeData.url_analyzed && (
                        <span style={{ fontFamily: 'monospace', marginLeft: 8, fontSize: 11 }}>
                          · {fraudeData.url_analyzed.slice(0, 50)}
                          {fraudeData.url_analyzed.length > 50 ? '…' : ''}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <ScoreBar score={fraudeData.score} riskLevel={fraudeData.risk_level} />

                <p style={{ fontSize: 14, color: p.header, fontWeight: 500, margin: 0 }}>
                  {fraudeData.recommendation}
                </p>
              </div>

              {/* Grid 2 colunas no desktop */}
              <div style={{
                display: 'grid',
                gridTemplateColumns:
                  fraudeData.indicators.length > 0 && fraudeData.details
                    ? 'minmax(0,1fr) minmax(0,1fr)'
                    : '1fr',
                gap: 12,
              }}>
                {fraudeData.indicators.length > 0 && (
                  <div style={{
                    background: p.card, border: `1px solid ${p.cardBorder}`,
                    borderRadius: 14, padding: 16,
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: p.header, margin: 0 }}>
                      Indícios encontrados
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {fraudeData.indicators.map((ind, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: cfg.color, fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>•</span>
                          <span style={{ fontSize: 13, color: p.sub, lineHeight: '20px' }}>{ind}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fraudeData.details && (
                  <div style={{
                    background: p.card, border: `1px solid ${p.cardBorder}`,
                    borderRadius: 14, padding: 16,
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: p.header, margin: 0 }}>
                      Detalhes técnicos
                    </p>
                    <p style={{ fontSize: 12, color: p.sub, margin: 0, lineHeight: 1.6 }}>
                      {fraudeData.details}
                    </p>
                  </div>
                )}
              </div>

              {/* Aviso se URL não foi acessível */}
              {urlFetchError && (
                <div style={{
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 12, padding: '10px 14px',
                  fontSize: 12, color: '#d97706',
                }}>
                  ⚠️ {urlFetchError} — análise baseada apenas na URL.
                </div>
              )}

              {/* Botões */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={handleReset}
                  style={{
                    flex: 1, minWidth: 120,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: p.btn, color: p.btnText, fontSize: 14, fontWeight: 600,
                  }}
                >
                  <RefreshCw style={{ width: 15, height: 15 }} />
                  Nova análise
                </button>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, minWidth: 120,
                    padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: p.btnSecondary, color: p.btnSecondaryText,
                    fontSize: 14, fontWeight: 600,
                  }}
                >
                  Fechar
                </button>
              </div>

              <VoiceHint commands={['nova analise', 'fechar', 'repetir']} p={p} />
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════
            STAGE: error
        ══════════════════════════════════════════════════════ */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: p.errorBg, border: `1px solid ${p.errorBorder}`,
              borderRadius: 14, padding: 16,
            }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: p.errorText, margin: '0 0 4px' }}>
                Erro na análise
              </p>
              <p style={{ fontSize: 13, color: p.errorText, margin: 0, opacity: 0.8 }}>
                {errorMsg}
              </p>
            </div>
            <button
              onClick={handleReset}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: p.btn, color: p.btnText, fontSize: 14, fontWeight: 600,
              }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Tentar novamente
            </button>
            <VoiceHint commands={['tentar novamente', 'fechar']} p={p} />
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
