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

type FeedbackState = 'idle' | 'searching' | 'found' | 'not_found' | 'no_stock';

const DARK = {
  overlay:     'rgba(0,0,0,0.75)',
  bg:          '#1e293b',
  border:      'rgba(255,255,255,0.08)',
  inputBg:     '#0f172a',
  inputBorder: 'rgba(255,255,255,0.15)',
  inputFocus:  '#3b82f6',
  inputText:   '#f1f5f9',
  text:        '#f1f5f9',
  textMuted:   '#94a3b8',
  tipBg:       'rgba(255,255,255,0.03)',
  btnClose:    'rgba(255,255,255,0.08)',
  btnCloseHov: 'rgba(255,255,255,0.14)',
  btnPrimary:  '#3b82f6',
  btnDisabled: 'rgba(59,130,246,0.35)',
  accent:      '#3b82f6',
  scanLine:    '#3b82f6',
  camBg:       '#0f172a',
  feedFound:   { bg: 'rgba(16,185,129,0.12)', border: '#059669', text: '#34d399' },
  feedNot:     { bg: 'rgba(239,68,68,0.12)',  border: '#dc2626', text: '#f87171' },
  feedSearch:  { bg: 'rgba(59,130,246,0.10)', border: '#3b82f6', text: '#93c5fd' },
  feedStock:   { bg: 'rgba(245,158,11,0.12)', border: '#d97706', text: '#fbbf24' },
};
const LIGHT = {
  overlay:     'rgba(0,0,0,0.50)',
  bg:          '#ffffff',
  border:      '#e2e8f0',
  inputBg:     '#f8fafc',
  inputBorder: '#cbd5e1',
  inputFocus:  '#2563eb',
  inputText:   '#0f172a',
  text:        '#0f172a',
  textMuted:   '#64748b',
  tipBg:       '#f8fafc',
  btnClose:    '#f1f5f9',
  btnCloseHov: '#e2e8f0',
  btnPrimary:  '#2563eb',
  btnDisabled: 'rgba(37,99,235,0.35)',
  accent:      '#2563eb',
  scanLine:    '#2563eb',
  camBg:       '#1e293b',
  feedFound:   { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
  feedNot:     { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  feedSearch:  { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  feedStock:   { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
};

export default function BarcodePdvModal({ companyId, theme, playText, onProductFound, onClose }: Props) {
  const p = theme === 'dark' ? DARK : LIGHT;
  const { lookup } = useBarcodeProductLookup(companyId);

  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [lastProduct, setLastProduct] = useState<ProdutoVenda | null>(null);
  const [lastEan, setLastEan] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [camError, setCamError] = useState(false);
  const [hasBarcodeDetector] = useState(() => typeof window !== 'undefined' && 'BarcodeDetector' in window);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEanRef = useRef('');
  const feedbackRef = useRef<FeedbackState>('idle');

  useEffect(() => { lastEanRef.current = lastEan; }, [lastEan]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);

  // Inicia câmera + foca input ao montar
  useEffect(() => {
    startWebcam();
    setTimeout(() => inputRef.current?.focus(), 120);
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
      setCamError(true);
    }
  }, [hasBarcodeDetector]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetFeedback = useCallback((delay: number) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback('idle');
      setLastProduct(null);
      setLastEan('');
    }, delay);
  }, []);

  const processEan = useCallback(async (ean: string) => {
    const normalized = ean.trim().replace(/\s/g, '');
    if (!normalized || normalized === lastEanRef.current) return;

    setLastEan(normalized);
    setFeedback('searching');
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);

    const produto = await lookup(normalized);

    if (!produto) {
      setFeedback('not_found');
      setLastEan('');
      playText(`Código ${normalized} não cadastrado.`).catch(() => {});
      resetFeedback(3000);
      return;
    }

    if (produto.controla_estoque && produto.estoque_atual <= 0) {
      setLastProduct(produto);
      setFeedback('no_stock');
      setLastEan('');
      playText(`${produto.nome} está sem estoque.`).catch(() => {});
      resetFeedback(3000);
      return;
    }

    // ✅ Produto ok — adiciona e prepara próxima leitura
    setLastProduct(produto);
    setFeedback('found');
    setScanCount(c => c + 1);
    onProductFound(produto);
    playText(`${produto.nome} adicionado.`).catch(() => {});

    setInputValue('');
    feedbackTimerRef.current = setTimeout(() => {
      setLastEan('');
      setFeedback('idle');
      setLastProduct(null);
      inputRef.current?.focus();
    }, 1800);
  }, [lookup, onProductFound, playText, resetFeedback]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      processEan(inputValue);
    }
  }, [inputValue, processEan]);

  const feedbackConfig = feedback === 'idle' ? null : {
    searching: { ...p.feedSearch, spinner: true,  label: 'Buscando produto...', sub: null },
    found: {
      ...p.feedFound, spinner: false,
      label: lastProduct ? `${lastProduct.nome} — R$ ${Number(lastProduct.preco_venda).toFixed(2).replace('.', ',')}` : 'Adicionado!',
      sub: lastProduct ? `${lastProduct.categoria ?? 'Geral'} · Estoque: ${lastProduct.estoque_atual} ${lastProduct.unidade}` : null,
    },
    not_found: { ...p.feedNot,   spinner: false, label: 'Código não cadastrado', sub: 'Verifique o EAN ou cadastre o produto' },
    no_stock:  { ...p.feedStock, spinner: false, label: lastProduct ? `${lastProduct.nome} sem estoque` : 'Produto sem estoque', sub: null },
  }[feedback] ?? null;

  return createPortal(
    <>
      <style>{`
        @keyframes pdvspin { to { transform: rotate(360deg); } }
        @keyframes pdvscan {
          0%   { top: 8%;  opacity: 1; }
          46%  { top: 86%; opacity: 1; }
          50%  { top: 86%; opacity: 0; }
          52%  { top: 8%;  opacity: 0; }
          54%  { top: 8%;  opacity: 1; }
          100% { top: 8%;  opacity: 1; }
        }
      `}</style>

      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.overlay, padding: 16 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          width: '100%', maxWidth: 440,
          background: p.bg, border: `1px solid ${p.border}`,
          borderRadius: 20, padding: 20,
          display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
        }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(59,130,246,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <SvgBarcode size={18} color={p.accent} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: p.text, lineHeight: 1.2 }}>Scanner PDV</div>
                <div style={{ fontSize: 11, color: p.textMuted, marginTop: 1 }}>
                  {scanCount === 0
                    ? 'Aguardando leitura'
                    : `${scanCount} produto${scanCount !== 1 ? 's' : ''} adicionado${scanCount !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: p.btnClose, color: p.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, transition: 'background 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = p.btnCloseHov)}
              onMouseLeave={e => (e.currentTarget.style.background = p.btnClose)}
            >✕</button>
          </div>

          {/* ── Câmera ── */}
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: p.camBg, aspectRatio: '16/9' }}>
            <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

            {/* Mira */}
            {!camError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{
                  width: '70%', height: '42%',
                  border: `2px solid ${p.scanLine}`,
                  borderRadius: 8, position: 'relative',
                  boxShadow: `0 0 0 9999px rgba(0,0,0,0.32)`,
                }}>
                  {[
                    { top: -2,    left: -2,  borderTop: `3px solid ${p.scanLine}`,    borderLeft: `3px solid ${p.scanLine}` },
                    { top: -2,    right: -2, borderTop: `3px solid ${p.scanLine}`,    borderRight: `3px solid ${p.scanLine}` },
                    { bottom: -2, left: -2,  borderBottom: `3px solid ${p.scanLine}`, borderLeft: `3px solid ${p.scanLine}` },
                    { bottom: -2, right: -2, borderBottom: `3px solid ${p.scanLine}`, borderRight: `3px solid ${p.scanLine}` },
                  ].map((s, i) => (
                    <div key={i} style={{ position: 'absolute', width: 14, height: 14, ...s }} />
                  ))}
                  {hasBarcodeDetector && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0, height: 2,
                      background: `linear-gradient(90deg, transparent, ${p.scanLine}, transparent)`,
                      animation: 'pdvscan 1.8s ease-in-out infinite',
                      borderRadius: 1,
                    }} />
                  )}
                </div>
              </div>
            )}

            {camError && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                color: p.textMuted, fontSize: 12, textAlign: 'center', padding: 16,
              }}>
                <SvgCamera size={28} color={p.textMuted} />
                <span>Câmera indisponível — use o campo abaixo</span>
              </div>
            )}

            {!camError && !hasBarcodeDetector && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '5px 10px', background: 'rgba(0,0,0,0.65)',
                fontSize: 10, color: '#fbbf24', textAlign: 'center',
              }}>
                Navegador sem leitura automática — use o campo abaixo
              </div>
            )}
          </div>

          {/* ── Input + Botão (sempre visível, foco automático para USB) ── */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <SvgBarcode size={14} color={p.textMuted} />
              </div>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Código de barras ou EAN…"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="numeric"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 12px 10px 34px',
                  background: p.inputBg, border: `1.5px solid ${p.inputBorder}`,
                  borderRadius: 10, fontSize: 14, fontFamily: 'monospace',
                  color: p.inputText, outline: 'none', letterSpacing: '0.03em',
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
                padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: (!inputValue.trim() || feedback === 'searching') ? p.btnDisabled : p.btnPrimary,
                color: '#fff', fontSize: 13, fontWeight: 600,
                transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                opacity: (!inputValue.trim() || feedback === 'searching') ? 0.65 : 1,
              }}
            >
              Buscar
            </button>
          </div>

          {/* ── Feedback ── */}
          {feedbackConfig && (
            <div style={{
              padding: '10px 13px', borderRadius: 10,
              background: feedbackConfig.bg, border: `1px solid ${feedbackConfig.border}`,
              display: 'flex', alignItems: 'flex-start', gap: 9,
            }}>
              <div style={{ marginTop: 1, flexShrink: 0 }}>
                {feedbackConfig.spinner ? (
                  <div style={{ width: 16, height: 16, border: `2px solid ${feedbackConfig.text}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'pdvspin 0.7s linear infinite' }} />
                ) : feedback === 'found' ? (
                  <SvgCheck size={16} color={feedbackConfig.text} />
                ) : feedback === 'no_stock' ? (
                  <SvgWarn size={16} color={feedbackConfig.text} />
                ) : (
                  <SvgX size={16} color={feedbackConfig.text} />
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: feedbackConfig.text }}>{feedbackConfig.label}</div>
                {feedbackConfig.sub && (
                  <div style={{ fontSize: 11, color: feedbackConfig.text, opacity: 0.75, marginTop: 2 }}>{feedbackConfig.sub}</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>,
    document.body
  );
}

// ── Ícones SVG inline ─────────────────────────────────────────────────────────
function SvgBarcode({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14M7 5v14M11 5v14M15 5v4M15 15v4M19 5v4M19 15v4M15 11h4"/>
    </svg>
  );
}
function SvgCamera({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}
function SvgCheck({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7"/>
    </svg>
  );
}
function SvgX({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  );
}
function SvgWarn({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
