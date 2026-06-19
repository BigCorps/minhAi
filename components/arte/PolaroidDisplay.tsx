'use client';

/**
 * PolaroidDisplay.tsx — ArteFinal
 *
 * Gerador de polaroids em PDF (Padrão 2x2 ou Mini 3x2 em A4).
 * Upload em lote/individual, drag para reposicionar dentro do quadro,
 * recorte cover em alta resolução para o PDF final.
 * 100% client-side. Gratuito (sem cobrança de crédito).
 *
 * Convenções do guia v2:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta DARK/LIGHT
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - eai:modalOpen/Close
 *  - Sem rota de API extra (jsPDF puro)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── Ícones SVG inline ────────────────────────────────────────────────────────

type P = { c: string; sz: number };
const icon = (color: string, size = 20): P => ({ c: color, sz: size });

const IconX = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconPlus = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconUpload = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const IconDownload = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconRefresh = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
  </svg>
);
const IconChevronLeft = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconTrash = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconImage = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// ─── Paletas ──────────────────────────────────────────────────────────────────

const DARK = {
  bg: '#1a1a2e', surface: '#16213e', surfaceAlt: '#0f172a',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.18)',
  text: '#e2e8f0', sub: '#94a3b8', muted: '#475569',
  accent: '#e94560', blue: '#3b82f6', blueDim: '#1e3a5f', blueMuted: '#60a5fa',
  green: '#22c55e', greenDim: '#166534', greenMuted: '#86efac',
  red: '#fca5a5', redDim: 'rgba(127,29,29,0.3)', redBorder: '#b91c1c',
  inputBorder: '#334155',
  overlay: 'rgba(0,0,0,0.8)',
};
const LIGHT = {
  bg: '#ffffff', surface: '#f8fafc', surfaceAlt: '#f1f5f9',
  border: '#e5e7eb', borderStrong: '#d1d5db',
  text: '#111827', sub: '#6b7280', muted: '#9ca3af',
  accent: '#e94560', blue: '#2563eb', blueDim: '#eff6ff', blueMuted: '#1d4ed8',
  green: '#16a34a', greenDim: '#dcfce7', greenMuted: '#166534',
  red: '#dc2626', redDim: '#fef2f2', redBorder: '#fecaca',
  inputBorder: '#d1d5db',
  overlay: 'rgba(0,0,0,0.65)',
};

// ─── Tipos e constantes ───────────────────────────────────────────────────────

type Stage = 'type' | 'editor' | 'generating' | 'result' | 'error';
type TypeKey = 'padrao' | 'mini';

interface PolaroidType {
  key:   TypeKey;
  label: string;
  frameW: number; frameH: number; // mm
  photo:  number;                  // mm (foto é sempre quadrada)
  sideB:  number; topB: number;    // mm
  page:   'portrait' | 'landscape';
  cols: number; rows: number;
}

const TYPES: Record<TypeKey, PolaroidType> = {
  padrao: { key: 'padrao', label: 'Polaroid Padrão', frameW: 90, frameH: 120, photo: 80, sideB: 5, topB: 5, page: 'portrait',  cols: 2, rows: 2 },
  mini:   { key: 'mini',   label: 'Polaroid Mini',    frameW: 75, frameH: 100, photo: 65, sideB: 5, topB: 5, page: 'landscape', cols: 3, rows: 2 },
};

interface Slot {
  filled: boolean;
  img:    HTMLImageElement | null;
  pX:     number; // 0–1
  pY:     number; // 0–1
}

const emptySlot = (): Slot => ({ filled: false, img: null, pX: 0.5, pY: 0.5 });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hexToRgb(hex: string) {
  const m = hex.replace('#', '');
  return { r: parseInt(m.slice(0, 2), 16), g: parseInt(m.slice(2, 4), 16), b: parseInt(m.slice(4, 6), 16) };
}

// Recorte cover em alta resolução, replicando a mesma matemática do background-position
function cropDataURL(slot: Slot, sizePx: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = sizePx; canvas.height = sizePx;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, sizePx, sizePx);

  const img = slot.img!;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(sizePx / iw, sizePx / ih); // cover
  const rw = iw * scale, rh = ih * scale;
  const ox = (sizePx - rw) * slot.pX;
  const oy = (sizePx - rh) * slot.pY;
  ctx.drawImage(img, ox, oy, rw, rh);
  return canvas.toDataURL('image/jpeg', 0.92);
}

export interface PolaroidDisplayProps {
  onClose:   () => void;
  theme?:    'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PolaroidDisplay({ onClose, theme = 'dark', playText }: PolaroidDisplayProps) {
  const C = theme === 'dark' ? DARK : LIGHT;

  // ── Estado ───────────────────────────────────────────────────────────────────

  const [stage,       setStage]       = useState<Stage>('type');
  const [typeKey,      setTypeKey]    = useState<TypeKey | null>(null);
  const [slots,        setSlots]      = useState<Slot[]>([]);
  const [borderColor,  setBorderColor] = useState<'#9aa0a6' | '#000000' | 'none'>('#9aa0a6');
  const [errorMsg,     setErrorMsg]   = useState<string | null>(null);
  const [resultName,   setResultName] = useState('');
  const [resultCount,  setResultCount] = useState(0);

  const batchInputRef  = useRef<HTMLInputElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);
  const activeSingleIdx = useRef<number | null>(null);

  // Drag state (não precisa re-render, fica em ref)
  const dragRef = useRef<{ idx: number; startX: number; startY: number; startPX: number; startPY: number; ovX: number; ovY: number } | null>(null);
  const winRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const current = typeKey ? TYPES[typeKey] : null;

  // ── Mount ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    playText?.('Gerador de polaroids. Escolha o formato e adicione suas fotos.').catch(() => {});
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Selecionar tipo ───────────────────────────────────────────────────────────

  const selectType = useCallback((key: TypeKey) => {
    const t = TYPES[key];
    setTypeKey(key);
    setSlots(Array.from({ length: t.cols * t.rows }, emptySlot));
    setStage('editor');
  }, []);

  // ── Preencher / limpar slot ───────────────────────────────────────────────────

  const fillSlot = useCallback(async (idx: number, dataUrl: string) => {
    try {
      const img = await loadImg(dataUrl);
      setSlots(prev => {
        const next = [...prev];
        next[idx] = { filled: true, img, pX: 0.5, pY: 0.5 };
        return next;
      });
    } catch { /* ignore */ }
  }, []);

  const clearSlot = useCallback((idx: number) => {
    setSlots(prev => {
      const next = [...prev];
      next[idx] = emptySlot();
      return next;
    });
  }, []);

  // ── Upload em lote — preenche slots vazios em ordem ──────────────────────────

  const handleBatchUpload = useCallback(async (files: FileList) => {
    const imgFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    // Captura os índices vazios no momento da chamada
    setSlots(prevSlots => {
      const emptyIdxs = prevSlots.map((s, i) => s.filled ? -1 : i).filter(i => i >= 0);
      (async () => {
        for (let k = 0; k < imgFiles.length && k < emptyIdxs.length; k++) {
          const dataUrl = await readAsDataURL(imgFiles[k]);
          await fillSlot(emptyIdxs[k], dataUrl);
        }
      })();
      return prevSlots;
    });
  }, [fillSlot]);

  const handleSingleUpload = useCallback(async (file: File) => {
    if (activeSingleIdx.current === null) return;
    const dataUrl = await readAsDataURL(file);
    await fillSlot(activeSingleIdx.current, dataUrl);
    activeSingleIdx.current = null;
  }, [fillSlot]);

  // ── Drag para reposicionar foto dentro do slot ───────────────────────────────

  const onPointerDown = useCallback((idx: number) => (e: React.PointerEvent) => {
    const slot = slots[idx];
    if (!slot.filled || !slot.img) return;
    const winEl = winRefs.current[idx];
    if (!winEl) return;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const r = winEl.getBoundingClientRect();
    const scale = Math.max(r.width / slot.img.naturalWidth, r.height / slot.img.naturalHeight);
    const ovX = slot.img.naturalWidth  * scale - r.width;
    const ovY = slot.img.naturalHeight * scale - r.height;

    dragRef.current = { idx, startX: e.clientX, startY: e.clientY, startPX: slot.pX, startPY: slot.pY, ovX, ovY };
  }, [slots]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const nx = d.ovX > 0 ? clamp(d.startPX - dx / d.ovX, 0, 1) : d.startPX;
    const ny = d.ovY > 0 ? clamp(d.startPY - dy / d.ovY, 0, 1) : d.startPY;

    setSlots(prev => {
      const next = [...prev];
      next[d.idx] = { ...next[d.idx], pX: nx, pY: ny };
      return next;
    });
  }, []);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  // ── Gerar PDF ─────────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!current || !slots.some(s => s.filled)) return;
    setStage('generating');
    setErrorMsg(null);

    try {
      const { jsPDF } = await import('jspdf') as any;
      const { frameW, frameH, photo, sideB, topB, cols, rows, page, label } = current;
      const doc = new jsPDF(page, 'mm', 'a4');

      const pageW = page === 'landscape' ? 297 : 210;
      const pageH = page === 'landscape' ? 210 : 297;
      const gap = 5;

      const gridW = cols * frameW + (cols - 1) * gap;
      const gridH = rows * frameH + (rows - 1) * gap;
      const marginX = (pageW - gridW) / 2;
      const marginY = (pageH - gridH) / 2;

      const showBorder = borderColor !== 'none';
      const rgb = showBorder ? hexToRgb(borderColor) : { r: 0, g: 0, b: 0 };
      const photoPx = Math.round((photo / 25.4) * 300); // 300 DPI

      let filled = 0;
      slots.forEach((slot, i) => {
        if (!slot.filled) return;
        filled++;
        const c = i % cols, r = Math.floor(i / cols);
        const fx = marginX + c * (frameW + gap);
        const fy = marginY + r * (frameH + gap);

        if (showBorder) {
          doc.setDrawColor(rgb.r, rgb.g, rgb.b);
          doc.setLineWidth(0.2);
          doc.rect(fx, fy, frameW, frameH);
        }

        const px = fx + sideB, py = fy + topB;
        doc.addImage(cropDataURL(slot, photoPx), 'JPEG', px, py, photo, photo);

        if (showBorder) {
          doc.setLineWidth(0.15);
          doc.rect(px, py, photo, photo);
        }
      });

      doc.setFontSize(7);
      doc.setTextColor(150);
      if (pageH - (marginY + gridH) >= 6) {
        doc.text(
          `${label} — ${filled} foto(s) — moldura ${frameW / 10}x${frameH / 10}cm, foto ${photo / 10}x${photo / 10}cm — ${new Date().toLocaleString('pt-BR')}`,
          Math.max(marginX, 5), pageH - 4
        );
      }

      const fileName = `polaroid_${label.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);

      setResultName(fileName);
      setResultCount(filled);
      setStage('result');
      playText?.('PDF gerado e baixado!').catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao gerar PDF.');
      setStage('error');
    }
  }, [current, slots, borderColor, playText]);

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStage('type');
    setTypeKey(null);
    setSlots([]);
    setErrorMsg(null);
    setBorderColor('#9aa0a6');
  }, []);

  const backToType = useCallback(() => {
    setStage('type');
  }, []);

  // ─── Estilos base ─────────────────────────────────────────────────────────────

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 18px', borderRadius: 10, border: 'none',
    background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  const btnSecondary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`,
    background: 'transparent', color: C.sub, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };
  const btnGhost: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 0', borderRadius: 10, border: 'none', width: '100%',
    background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
    color: C.sub, fontSize: 12, cursor: 'pointer',
  };

  const filledCount = slots.filter(s => s.filled).length;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.overlay, padding: 12,
    }}>
      <div style={{
        width: '100%',
        maxWidth: stage === 'editor' ? 640 : 460,
        maxHeight: '95dvh', overflowY: 'auto',
        borderRadius: 20, padding: 22,
        background: C.bg, border: `1px solid ${C.border}`,
        boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
        transition: 'max-width 0.3s ease',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconImage s={icon(C.accent, 20)} />
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Polaroids para A4</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <IconX s={icon(C.sub, 18)} />
          </button>
        </div>

        {/* ── Stage: type ── */}
        {stage === 'type' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>
              Escolha o formato. Você monta o grid e ajusta cada foto na próxima etapa.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(Object.values(TYPES)).map(t => (
                <button
                  key={t.key}
                  onClick={() => selectType(t.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    padding: '18px 12px', borderRadius: 14, cursor: 'pointer',
                    border: `2px solid ${C.border}`, background: C.surface, textAlign: 'center',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.label}</span>
                  <span style={{ fontSize: 10, color: C.muted }}>
                    Moldura {t.frameW / 10}×{t.frameH / 10} cm · foto {t.photo / 10}×{t.photo / 10} cm
                  </span>

                  {/* Mock visual da polaroid */}
                  <div style={{
                    width: t.key === 'padrao' ? 64 : 54,
                    aspectRatio: `${t.frameW} / ${t.frameH}`,
                    background: '#fff', border: `1px solid ${C.borderStrong}`,
                    borderRadius: 2, boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6%',
                  }}>
                    <div style={{
                      width: '100%', height: `${(t.photo / t.frameH) * 100}%`,
                      background: 'linear-gradient(135deg, #ffd9a0, #ff8c00)', borderRadius: 1,
                    }} />
                  </div>

                  <span style={{
                    fontSize: 10, fontWeight: 600, color: C.accent,
                    background: C.blueDim, padding: '2px 8px', borderRadius: 6,
                  }}>
                    {t.cols * t.rows} fotos por folha
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Stage: editor ── */}
        {stage === 'editor' && current && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.sub }}>
                <strong style={{ color: C.text }}>{current.label}</strong> — {filledCount}/{slots.length} quadros preenchidos
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={backToType} style={btnSecondary}>
                  <IconChevronLeft s={icon(C.sub, 14)} /> Trocar tipo
                </button>
                <button onClick={() => batchInputRef.current?.click()} style={btnPrimary}>
                  <IconUpload s={icon('#fff', 14)} /> Carregar fotos
                </button>
              </div>
            </div>

            {/* Grid de slots */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${current.cols}, 1fr)`,
              gap: 14,
              maxWidth: current.cols === 2 ? 320 : 420,
              margin: '0 auto',
              width: '100%',
            }}>
              {slots.map((slot, i) => {
                const sidePct = (current.sideB / current.frameW) * 100;
                const topPct  = (current.topB  / current.frameH) * 100;
                const wPct    = (current.photo / current.frameW) * 100;
                const hPct    = (current.photo / current.frameH) * 100;

                return (
                  <div key={i} style={{
                    position: 'relative', width: '100%',
                    aspectRatio: `${current.frameW} / ${current.frameH}`,
                    background: '#fff', border: `1px solid ${C.borderStrong}`,
                    borderRadius: 2, boxShadow: '0 4px 14px rgba(0,0,0,0.15)', overflow: 'hidden',
                  }}>
                    {/* Janela da foto */}
                    <div
                      ref={el => { winRefs.current[i] = el; }}
                      onPointerDown={onPointerDown(i)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={onPointerUp}
                      onClick={() => {
                        if (!slot.filled) {
                          activeSingleIdx.current = i;
                          singleInputRef.current!.value = '';
                          singleInputRef.current?.click();
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: `${sidePct}%`, top: `${topPct}%`, width: `${wPct}%`, height: `${hPct}%`,
                        backgroundColor: '#f0f0f0',
                        backgroundImage: slot.filled && slot.img ? `url(${slot.img.src})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: `${slot.pX * 100}% ${slot.pY * 100}%`,
                        border: `1px ${slot.filled ? 'solid' : 'dashed'} ${slot.filled ? '#e6e6e6' : C.borderStrong}`,
                        cursor: slot.filled ? 'grab' : 'pointer',
                        touchAction: 'none',
                        display: slot.filled ? undefined : 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      {!slot.filled && (
                        <>
                          <IconPlus s={icon(C.accent, 22)} />
                          <span style={{ fontSize: 9, color: C.muted, textAlign: 'center', padding: '0 6px' }}>Adicionar foto</span>
                        </>
                      )}
                    </div>

                    {/* Remover */}
                    {slot.filled && (
                      <button
                        onClick={(e) => { e.stopPropagation(); clearSlot(i); }}
                        style={{
                          position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                          background: 'rgba(220,53,69,0.92)', color: '#fff', border: 'none', cursor: 'pointer',
                          fontSize: 13, lineHeight: '22px', padding: 0, zIndex: 3,
                        }}
                      >
                        <IconTrash s={icon('#fff', 11)} />
                      </button>
                    )}

                    {/* Hint de arraste */}
                    {slot.filled && (
                      <div style={{
                        position: 'absolute', left: 0, right: 0, bottom: 4, textAlign: 'center',
                        fontSize: 8, color: 'rgba(0,0,0,0.4)', pointerEvents: 'none',
                      }}>
                        ↕ ↔ arraste para ajustar
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Opções */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 4 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 4, display: 'block' }}>
                  Borda de corte
                </label>
                <select
                  value={borderColor}
                  onChange={e => setBorderColor(e.target.value as any)}
                  style={{
                    padding: '8px 10px', borderRadius: 8, fontSize: 13, minWidth: 160,
                    background: theme === 'dark' ? C.surfaceAlt : '#fff',
                    border: `1px solid ${C.inputBorder}`, color: C.text, outline: 'none',
                  }}
                >
                  <option value="#9aa0a6">Cinza (recomendado)</option>
                  <option value="#000000">Preto</option>
                  <option value="none">Sem borda</option>
                </select>
              </div>
            </div>

            {/* Dica */}
            <div style={{
              background: C.blueDim, borderLeft: `4px solid ${C.accent}`, borderRadius: 8,
              padding: '12px 14px', fontSize: 12, color: C.sub, lineHeight: 1.5,
            }}>
              <strong style={{ color: C.text }}>Dica:</strong> a foto preenche todo o quadro sem distorcer.
              Se ela for retangular, arraste para escolher o que aparece. A borda marca onde cortar.
            </div>

            <button
              onClick={handleGenerate}
              disabled={filledCount === 0}
              style={{
                ...btnPrimary, width: '100%',
                background: filledCount > 0 ? C.accent : C.border,
                cursor:     filledCount > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              <IconDownload s={icon('#fff', 16)} />
              Gerar PDF
            </button>

            <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', margin: 0 }}>
              Gratuito · sem cobrança de créditos
            </p>
          </div>
        )}

        {/* ── Stage: generating ── */}
        {stage === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', animation: 'pl-spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>Gerando PDF…</p>
            <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Stage: result ── */}
        {stage === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.greenDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconDownload s={icon(C.greenMuted, 24)} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>PDF gerado e baixado!</p>
              {resultName && <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{resultName}</p>}
            </div>
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
              {resultCount} foto(s) · {current?.label}
            </p>
            <button onClick={handleReset} style={btnGhost}>
              <IconRefresh s={icon(C.sub, 14)} /> Gerar outro
            </button>
          </div>
        )}

        {/* ── Stage: error ── */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.4, background: C.redDim, border: `1px solid ${C.redBorder}`, color: C.red }}>
              {errorMsg ?? 'Ocorreu um erro inesperado.'}
            </div>
            <button onClick={() => setStage('editor')} style={btnPrimary}>
              <IconRefresh s={icon('#fff', 15)} /> Tentar novamente
            </button>
          </div>
        )}

        {/* Inputs ocultos */}
        <input ref={batchInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.length) handleBatchUpload(e.target.files); e.currentTarget.value = ''; }} />
        <input ref={singleInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleSingleUpload(f); e.currentTarget.value = ''; }} />

      </div>
    </div>,
    document.body
  );
}
