// components/assistant/BarcodePdvModal.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBarcodeProductLookup } from '@/hooks/useBarcodeProductLookup';
import type { ProdutoVenda } from '@/lib/produtos-venda';

interface Props {
  companyId: string;
  theme: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
  onProductFound: (produto: ProdutoVenda) => void;
  onClose: () => void;
}

type ScanMode = 'input' | 'webcam';
type FeedbackState = 'idle' | 'searching' | 'found' | 'not_found' | 'no_stock';

const DARK = {
  overlay:      'rgba(0,0,0,0.75)',
  bg:           '#1e293b',
  border:       'rgba(255,255,255,0.08)',
  inputBg:      '#0f172a',
  inputBorder:  'rgba(255,255,255,0.15)',
  inputFocus:   '#3b82f6',
  inputText:    '#f1f5f9',
  text:         '#f1f5f9',
  textMuted:    '#94a3b8',
  tabBg:        'rgba(255,255,255,0.04)',
  tabActive:    '#3b82f6',
  tabActiveBg:  'rgba(59,130,246,0.15)',
  tipBg:        'rgba(255,255,255,0.03)',
  btnClose:     'rgba(255,255,255,0.08)',
  btnCloseHov:  'rgba(255,255,255,0.14)',
  btnPrimary:   '#3b82f6',
  btnDisabled:  'rgba(59,130,246,0.35)',
  scanLine:     '#3b82f6',
  feedFound:    { bg: 'rgba(16,185,129,0.12)', border: '#059669', text: '#34d399' },
  feedNot:      { bg: 'rgba(239,68,68,0.12)',  border: '#dc2626', text: '#f87171' },
  feedSearch:   { bg: 'rgba(59,130,246,0.10)', border: '#3b82f6', text: '#93c5fd' },
  feedStock:    { bg: 'rgba(245,158,11,0.12)', border: '#d97706', text: '#fbbf24' },
};
const LIGHT = {
  overlay:      'rgba(0,0,0,0.50)',
  bg:           '#ffffff',
  border:       '#e2e8f0',
  inputBg:      '#f8fafc',
  inputBorder:  '#cbd5e1',
  inputFocus:   '#3b82f6',
  inputText:    '#0f172a',
  text:         '#0f172a',
  textMuted:    '#64748b',
  tabBg:        '#f1f5f9',
  tabActive:    '#2563eb',
  tabActiveBg:  'rgba(37,99,235,0.08)',
  tipBg:        '#f8fafc',
  btnClose:     '#f1f5f9',
  btnCloseHov:  '#e2e8f0',
  btnPrimary:   '#2563eb',
  btnDisabled:  'rgba(37,99,235,0.35)',
  scanLine:     '#2563eb',
  feedFound:    { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
  feedNot:      { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  feedSearch:   { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  feedStock:    { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
};

export default function BarcodePdvModal({ companyId, theme, playText, onProductFound, onClose }: Props) {
  const p = theme === 'dark' ? DARK : LIGHT;
  const { lookup } = useBarcodeProductLookup(companyId);

  const [mode, setMode] = useState<ScanMode>('input');
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [lastProduct, setLastProduct] = useState<ProdutoVenda | null>(null);
  const [lastEan, setLastEan] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [hasBarcodeDetector] = useState(() => typeof window !== 'undefined' && 'BarcodeDetector' in window);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEanRef = useRef('');
  const feedbackRef = useRef<FeedbackState>('idle');

  // Mantém refs sincronizadas (evita stale closure no interval da webcam)
  useEffect(() => { lastEanRef.current = lastEan; }, [lastEan]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);

  // Foca input ao abrir no modo digitação
  useEffect(() => {
    if (mode === 'input') {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [mode]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopWebcam();
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopWebcam = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (!hasBarcodeDetector) return;
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar', 'qr_code'],
      });
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        if (feedbackRef.current === 'searching') return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) processEan(codes[0].rawValue);
        } catch { /* ignora */ }
      }, 700);
    } catch {
      playText('Não foi possível acessar a câmera.').catch(() => {});
    }
  }, [hasBarcodeDetector]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode === 'webcam') startWebcam();
    else stopWebcam();
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFeedbackTimed = useCallback((state: FeedbackState, ms = 2500) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(state);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback('idle');
      setLastProduct(null);
    }, ms);
  }, []);

  const processEan = useCallback(async (ean: string) => {
    const normalized = ean.trim().replace(/\s/g, '');
    if (!normalized || normalized === lastEanRef.current) return;

    setLastEan(normalized);
    setFeedback('searching');

    const produto = await lookup(normalized);

    if (!produto) {
      setLastEan('');
      setFeedbackTimed('not_found', 3000);
      playText(`Produto não encontrado para o código ${normalized}.`).catch(() => {});
      return;
    }

    if (produto.controla_estoque && produto.estoque_atual <= 0) {
      setLastProduct(produto);
      setLastEan('');
      setFeedbackTimed('no_stock', 3000);
      playText(`${produto.nome} está sem estoque.`).catch(() => {});
      return;
    }

    // ✅ Produto ok — adiciona
    setLastProduct(produto);
    setFeedback('found');
    setScanCount(c => c + 1);
    onProductFound(produto);
    playText(`${produto.nome} adicionado.`).catch(() => {});

    if (mode === 'input') {
      setInputValue('');
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setLastEan('');
        setFeedback('idle');
        setLastProduct(null);
        inputRef.current?.focus();
      }, 1800);
    } else {
      // webcam: reseta após 2s para próxima leitura
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setLastEan('');
        setFeedback('idle');
        setLastProduct(null);
      }, 2000);
    }
  }, [lookup, mode, onProductFound, playText, setFeedbackTimed]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      processEan(inputValue);
    }
  }, [inputValue, processEan]);

  // ── Feedback config ──────────────────────────────────────────────────────
  const feedbackConfig = feedback === 'idle' ? null : {
    searching: {
      ...p.feedSearch,
      icon: (
        <div style={{ width: 18, height: 18, border: `2px solid ${p.feedSearch.text}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
      ),
      label: 'Buscando produto...',
      sub: null,
    },
    found: {
      ...p.feedFound,
      icon: <SvgCheck size={18} color={p.feedFound.text} />,
      label: lastProduct ? `${lastProduct.nome} — R$ ${Number(lastProduct.preco_venda).toFixed(2).replace('.', ',')}` : 'Adicionado!',
      sub: lastProduct ? `${lastProduct.categoria ?? 'Geral'} · Estoque: ${lastProduct.estoque_atual} ${lastProduct.unidade}` : null,
    },
    not_found: {
      ...p.feedNot,
      icon: <SvgX size={18} color={p.feedNot.text} />,
      label: `Código "${lastEan || '—'}" não cadastrado`,
      sub: 'Verifique o EAN ou cadastre o produto',
    },
    no_stock: {
      ...p.feedStock,
      icon: <SvgWarn size={18} color={p.feedStock.text} />,
      label: lastProduct ? `${lastProduct.nome} sem estoque` : 'Produto sem estoque',
      sub: null,
    },
  }[feedback] ?? null;

  return createPortal(
    <>
      {/* Keyframe para o spinner */}
      <style>{`@keyframes pdv-spin { to { transform: rotate(360deg); } }`}</style>

      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.overlay, padding: 16 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          width: '100%', maxWidth: 480,
          background: p.bg, border: `1px solid ${p.border}`,
          borderRadius: 20, padding: 24,
          display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
        }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `rgba(59,130,246,0.12)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <SvgBarcode size={20} color={p.tabActive} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: p.text, lineHeight: 1.2 }}>Scanner PDV</div>
                <div style={{ fontSize: 11, color: p.textMuted, marginTop: 1 }}>
                  {scanCount === 0 ? 'Aguardando leitura' : `${scanCount} produto${scanCount !== 1 ? 's' : ''} adicionado${scanCount !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: p.btnClose, color: p.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, transition: 'background 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = p.btnCloseHov)}
              onMouseLeave={e => (e.currentTarget.style.background = p.btnClose)}
            >✕</button>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: 4, background: p.tabBg, borderRadius: 12, padding: 4 }}>
            {([
              { id: 'input' as ScanMode,  label: 'Digitar / Leitor USB', icon: <SvgKeyboard size={13} color="currentColor" /> },
              { id: 'webcam' as ScanMode, label: 'Câmera',               icon: <SvgCamera size={13} color="currentColor" /> },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: mode === tab.id ? 600 : 400, transition: 'all 0.15s',
                  background: mode === tab.id ? p.tabActiveBg : 'transparent',
                  color: mode === tab.id ? p.tabActive : p.textMuted,
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* ── Modo Input ── */}
          {mode === 'input' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, color: p.textMuted, margin: 0, lineHeight: 1.5 }}>
                Aponte o leitor USB/Bluetooth para o código ou digite o EAN e pressione{' '}
                <span style={{ fontWeight: 600, color: p.text }}>Enter</span>.
              </p>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <SvgBarcode size={15} color={p.textMuted} />
                </div>
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Ex: 7891234567890"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="numeric"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '11px 12px 11px 36px',
                    background: p.inputBg, border: `1.5px solid ${p.inputBorder}`,
                    borderRadius: 12, fontSize: 15, fontFamily: 'monospace',
                    color: p.inputText, outline: 'none', letterSpacing: '0.04em',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = p.inputFocus)}
                  onBlur={e => (e.currentTarget.style.borderColor = p.inputBorder)}
                />
              </div>
              <button
                onClick={() => inputValue.trim() && processEan(inputValue)}
                disabled={!inputValue.trim() || feedback === 'searching'}
                style={{
                  padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: (!inputValue.trim() || feedback === 'searching') ? p.btnDisabled : p.btnPrimary,
                  color: '#fff', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  opacity: (!inputValue.trim() || feedback === 'searching') ? 0.7 : 1,
                }}
              >
                {feedback === 'searching' ? 'Buscando...' : 'Buscar produto'}
              </button>
            </div>
          )}

          {/* ── Modo Webcam ── */}
          {mode === 'webcam' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Overlay de mira */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{
                    width: '65%', height: '38%',
                    border: `2px solid ${p.scanLine}`,
                    borderRadius: 8, position: 'relative',
                    boxShadow: `0 0 0 9999px rgba(0,0,0,0.38)`,
                  }}>
                    {/* Cantos da mira */}
                    {[
                      { top: -2, left: -2,  borderTop: `3px solid ${p.scanLine}`, borderLeft: `3px solid ${p.scanLine}` },
                      { top: -2, right: -2, borderTop: `3px solid ${p.scanLine}`, borderRight: `3px solid ${p.scanLine}` },
                      { bottom: -2, left: -2,  borderBottom: `3px solid ${p.scanLine}`, borderLeft: `3px solid ${p.scanLine}` },
                      { bottom: -2, right: -2, borderBottom: `3px solid ${p.scanLine}`, borderRight: `3px solid ${p.scanLine}` },
                    ].map((style, i) => (
                      <div key={i} style={{ position: 'absolute', width: 16, height: 16, ...style }} />
                    ))}
                  </div>
                </div>
                {!hasBarcodeDetector && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px',
                    background: 'rgba(0,0,0,0.65)', fontSize: 11, color: '#fbbf24', textAlign: 'center',
                  }}>
                    Navegador sem suporte a leitura automática — use a aba Digitar
                  </div>
                )}
              </div>
              <p style={{ fontSize: 12, color: p.textMuted, textAlign: 'center', margin: 0 }}>
                Aponte o código de barras para a câmera — leitura automática ativada
              </p>
            </div>
          )}

          {/* ── Feedback ── */}
          {feedbackConfig && (
            <div style={{
              padding: '11px 14px', borderRadius: 12,
              background: feedbackConfig.bg, border: `1px solid ${feedbackConfig.border}`,
              display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'all 0.2s',
            }}>
              <div style={{ marginTop: 1 }}>
                {feedbackConfig.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: feedbackConfig.text }}>
                  {feedbackConfig.label}
                </div>
                {feedbackConfig.sub && (
                  <div style={{ fontSize: 11, color: feedbackConfig.text, opacity: 0.75, marginTop: 2 }}>
                    {feedbackConfig.sub}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Dica ── */}
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: p.tipBg, border: `1px solid ${p.border}`,
            fontSize: 11, color: p.textMuted, lineHeight: 1.55,
          }}>
            💡 <strong style={{ color: p.text }}>Leitor USB/Bluetooth:</strong> conecte o scanner ao computador,
            selecione a aba "Digitar / Leitor USB" e aponte o leitor para o código — o produto é adicionado automaticamente.
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}

// ── Ícones SVG inline ─────────────────────────────────────────────────────────
function SvgBarcode({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14M7 5v14M11 5v14M15 5v4M15 15v4M19 5v4M19 15v4M15 11h4"/>
    </svg>
  );
}
function SvgKeyboard({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
    </svg>
  );
}
function SvgCamera({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}
function SvgCheck({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M5 13l4 4L19 7"/>
    </svg>
  );
}
function SvgX({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  );
}
function SvgWarn({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
