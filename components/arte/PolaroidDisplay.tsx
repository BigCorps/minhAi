'use client';

/**
 * PolaroidDisplay.tsx — ArteFinal
 *
 * Gerador de polaroids em PDF (Padrão 2x2 ou Mini 3x2 em A4).
 * Upload em lote/individual, drag para reposicionar dentro do quadro,
 * recorte cover em alta resolução para o PDF final.
 * 100% client-side. Gratuito (sem cobrança de crédito).
 *
 * Migrado para o padrão visual dos demais modais (Adesivo, Folha de Recorte,
 * Margem e Sangria, Duplicar Imagem, Vetorizar Imagem, QR Code, Código de
 * Barras, Orçamento em PDF):
 *  - Paleta CMYK padrão (DARK/LIGHT com bg/bgSecondary/border/text/textMuted/
 *    success/error/accent/warn), accent = CMYK.cyan.
 *  - Card com a mesma largura dos outros (640 normal / 460 na escolha de tipo,
 *    mantendo a transição de largura que já existia entre as etapas).
 *  - Botão "Fechar" em texto no header.
 *  - Bloco "Como funciona" na tela de escolha de tipo.
 *  - Mock visual da polaroid mantido (moldura branca + retângulo representando
 *    a foto), mas o gradiente trocou de laranja para azul (derivado do próprio
 *    accent = CMYK.cyan, para ficar coerente com o resto da paleta).
 *
 * Convenções do guia v2 ainda aplicadas:
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

// ─── Paleta CMYK padrão (mesma dos demais modais) ────────────────────────────

const CMYK = { cyan: '#00AEEF', magenta: '#EC008C', yellow: '#FFD500', key: '#1A1A1A' };
const DARK = {
  bg: '#1e293b', bgSecondary: '#0f172a', border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0', textMuted: '#94a3b8', success: '#10b981', error: '#ef4444', accent: CMYK.cyan, warn: CMYK.yellow,
};
const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', textMuted: '#64748b', success: '#059669', error: '#dc2626', accent: CMYK.cyan, warn: '#d97706',
};

// Gradiente do mock visual da polaroid — antes laranja (#ffd9a0 → #ff8c00),
// agora azul, derivado do próprio accent (CMYK.cyan) para ficar coerente com
// o resto da paleta.
const MOCK_GRADIENT = `linear-gradient(135deg, #bfe9fb, ${CMYK.cyan})`;

// ─── Tipos e constantes ───────────────────────────────────────────────────────

type Stage = 'type' | 'editor' | 'generating' | 'result' | 'error';
type TypeKey = 'padrao' | 'mini';
type PageSize = 'A4' | 'A3' | 'custom';

interface PolaroidType {
  key:   TypeKey;
  label: string;
  frameW: number; frameH: number; // mm
  photo:  number;                  // mm (foto é sempre quadrada)
  sideB:  number; topB: number;    // mm
  page:   'portrait' | 'landscape';
  cols: number; rows: number;
}

// Definições base para A4 — A3 dobra cols e rows mantendo as mesmas dimensões de moldura
const TYPES_A4: Record<TypeKey, PolaroidType> = {
  padrao: { key: 'padrao', label: 'Polaroid Padrão', frameW: 90, frameH: 120, photo: 80, sideB: 5, topB: 5, page: 'portrait',  cols: 2, rows: 2 },
  mini:   { key: 'mini',   label: 'Polaroid Mini',    frameW: 75, frameH: 100, photo: 65, sideB: 5, topB: 5, page: 'landscape', cols: 3, rows: 2 },
};

// A3 dobra a quantidade: cols*2 para retrato, rows*2 para paisagem, mantendo moldura
const TYPES_A3: Record<TypeKey, PolaroidType> = {
  padrao: { ...TYPES_A4.padrao, cols: 4, rows: 4 },
  mini:   { ...TYPES_A4.mini,   cols: 6, rows: 4 },
};

// Dimensões reais das páginas em mm
const PAGE_DIMS: Record<'A4' | 'A3', { portrait: [number, number]; landscape: [number, number] }> = {
  A4: { portrait: [210, 297], landscape: [297, 210] },
  A3: { portrait: [297, 420], landscape: [420, 297] },
};

interface Slot {
  filled: boolean;
  img:    HTMLImageElement | null;
  pX:     number; // 0–1
  pY:     number; // 0–1
}

const emptySlot = (): Slot => ({ filled: false, img: null, pX: 0.5, pY: 0.5 });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const OPENING_TEXT = 'Gerador de polaroids. Escolha o formato e adicione suas fotos.';

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
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;

  // ── Estado ───────────────────────────────────────────────────────────────────

  const [stage,       setStage]       = useState<Stage>('type');
  const [typeKey,     setTypeKey]     = useState<TypeKey | null>(null);
  const [pageSize,    setPageSize]    = useState<PageSize>('A4');
  const [slots,       setSlots]       = useState<Slot[]>([]);
  const [borderColor, setBorderColor] = useState<'#9aa0a6' | '#000000' | 'none'>('#9aa0a6');
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [resultName,  setResultName]  = useState('');
  const [resultCount, setResultCount] = useState(0);

  // Campos de tamanho personalizado (mm)
  const [customW, setCustomW] = useState<number>(210);
  const [customH, setCustomH] = useState<number>(297);

  const batchInputRef  = useRef<HTMLInputElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);
  const activeSingleIdx = useRef<number | null>(null);
  const spoke = useRef(false);

  // Drag state (não precisa re-render, fica em ref)
  const dragRef = useRef<{ idx: number; startX: number; startY: number; startPX: number; startPY: number; ovX: number; ovY: number } | null>(null);
  const winRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Resolve o tipo atual considerando o pageSize selecionado
  const currentTypeDef = useCallback((key: TypeKey): PolaroidType => {
    if (pageSize === 'A3') return TYPES_A3[key];
    // A4 e Personalizado usam a grid base do A4 (o personalizado ajusta só dimensão de página no PDF)
    return TYPES_A4[key];
  }, [pageSize]);

  const current = typeKey ? currentTypeDef(typeKey) : null;

  // ── Mount ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    if (!spoke.current) {
      spoke.current = true;
      playText?.(OPENING_TEXT).catch(() => {});
    }
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Selecionar tipo ───────────────────────────────────────────────────────────

  const selectType = useCallback((key: TypeKey) => {
    const t = pageSize === 'A3' ? TYPES_A3[key] : TYPES_A4[key];
    setTypeKey(key);
    setSlots(Array.from({ length: t.cols * t.rows }, emptySlot));
    setStage('editor');
  }, [pageSize]);

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

      // Dimensões reais da página em mm
      let pageW: number, pageH: number;
      if (pageSize === 'A4') {
        [pageW, pageH] = page === 'landscape' ? PAGE_DIMS.A4.landscape : PAGE_DIMS.A4.portrait;
      } else if (pageSize === 'A3') {
        [pageW, pageH] = page === 'landscape' ? PAGE_DIMS.A3.landscape : PAGE_DIMS.A3.portrait;
      } else {
        // Personalizado: usa os valores customW/customH
        pageW = customW;
        pageH = customH;
      }

      // jsPDF aceita [w, h] em mm como formato
      const doc = new jsPDF({ orientation: page, unit: 'mm', format: [pageW, pageH] });

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
        const col = i % cols, row = Math.floor(i / cols);
        const fx = marginX + col * (frameW + gap);
        const fy = marginY + row * (frameH + gap);

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
          `${label} ${pageSize} — ${filled} foto(s) — moldura ${frameW / 10}x${frameH / 10}cm, foto ${photo / 10}x${photo / 10}cm — ${new Date().toLocaleString('pt-BR')}`,
          Math.max(marginX, 5), pageH - 4
        );
      }

      const fileName = `polaroid_${label.toLowerCase().replace(/\s+/g, '_')}_${pageSize.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);

      setResultName(fileName);
      setResultCount(filled);
      setStage('result');
      playText?.('PDF gerado e baixado!').catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao gerar PDF.');
      setStage('error');
    }
  }, [current, slots, borderColor, pageSize, customW, customH, playText]);

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStage('type');
    setTypeKey(null);
    setSlots([]);
    setErrorMsg(null);
    setBorderColor('#9aa0a6');
    setPageSize('A4');
  }, []);

  const backToType = useCallback(() => {
    setStage('type');
  }, []);

  // ─── Estilos derivados da paleta (mesma convenção dos demais modais) ──────────

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, border: 'none', background: c.accent, color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
  };
  const btnSecondary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8, border: `1px solid ${c.border}`,
    background: 'transparent', color: c.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };

  const filledCount = slots.filter(s => s.filled).length;

  // Rótulo do tamanho da página para exibição
  const pageSizeLabel = pageSize === 'custom'
    ? `${customW}×${customH}mm`
    : pageSize;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: stage === 'editor' ? 640 : 460, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', transition: 'max-width 0.2s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Polaroids para impressão</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

        {/* Stage: type */}
        {stage === 'type' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
              <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                Escolha o tamanho da folha e o formato da polaroid, carregue suas fotos — em lote ou uma por uma.
                Arraste cada foto dentro do quadro para ajustar o que aparece, e gere o PDF pronto para imprimir.
              </p>
            </div>

            {/* Seletor de tamanho de página — 3 botões na mesma linha */}
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tamanho da folha
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {(['A4', 'A3', 'custom'] as PageSize[]).map(ps => {
                  const isActive = pageSize === ps;
                  const label = ps === 'custom' ? 'Personalizado' : ps;
                  const sub = ps === 'A4' ? '210×297 mm' : ps === 'A3' ? '297×420 mm' : 'tamanho livre';
                  return (
                    <button
                      key={ps}
                      onClick={() => setPageSize(ps)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        padding: '10px 8px', borderRadius: 8, cursor: 'pointer', border: `2px solid ${isActive ? c.accent : c.border}`,
                        background: isActive ? (isDark ? 'rgba(0,174,239,0.12)' : 'rgba(0,174,239,0.08)') : c.bgSecondary,
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? c.accent : c.text }}>{label}</span>
                      <span style={{ fontSize: 10, color: c.textMuted }}>{sub}</span>
                    </button>
                  );
                })}
              </div>

              {/* Campos de tamanho personalizado */}
              {pageSize === 'custom' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: c.textMuted, display: 'block', marginBottom: 4 }}>Largura (mm)</label>
                    <input
                      type="number" min={50} max={1200} value={customW}
                      onChange={e => setCustomW(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: c.textMuted, display: 'block', marginBottom: 4 }}>Altura (mm)</label>
                    <input
                      type="number" min={50} max={1200} value={customH}
                      onChange={e => setCustomH(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Grid de tipos de polaroid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(Object.values(TYPES_A4)).map(t => {
                // Quantidade de fotos depende do tamanho selecionado
                const effectiveType = pageSize === 'A3' ? TYPES_A3[t.key] : t;
                return (
                  <button
                    key={t.key}
                    onClick={() => selectType(t.key)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      padding: '18px 12px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${c.border}`, background: c.bgSecondary, textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{t.label}</span>
                    <span style={{ fontSize: 10, color: c.textMuted }}>
                      Moldura {t.frameW / 10}×{t.frameH / 10} cm · foto {t.photo / 10}×{t.photo / 10} cm
                    </span>

                    {/* Mock visual da polaroid */}
                    <div style={{
                      width: t.key === 'padrao' ? 64 : 54,
                      aspectRatio: `${t.frameW} / ${t.frameH}`,
                      background: '#fff', border: `1px solid ${c.border}`,
                      borderRadius: 2, boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6%',
                    }}>
                      <div style={{
                        width: '100%', height: `${(t.photo / t.frameH) * 100}%`,
                        background: MOCK_GRADIENT, borderRadius: 1,
                      }} />
                    </div>

                    <span style={{
                      fontSize: 10, fontWeight: 600, color: c.accent,
                      background: c.bg, padding: '2px 8px', borderRadius: 6, border: `1px solid ${c.border}`,
                    }}>
                      {effectiveType.cols * effectiveType.rows} fotos · {pageSizeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stage: editor */}
        {stage === 'editor' && current && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, color: c.textMuted }}>
                <strong style={{ color: c.text }}>{current.label}</strong> {pageSizeLabel} — {filledCount}/{slots.length} quadros preenchidos
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={backToType} style={btnSecondary}>
                  <IconChevronLeft s={icon(c.textMuted, 14)} /> Trocar tipo
                </button>
                <button onClick={() => batchInputRef.current?.click()} style={{ ...btnPrimary, padding: '8px 14px', fontSize: 13 }}>
                  <IconUpload s={icon('#fff', 14)} /> Carregar fotos
                </button>
              </div>
            </div>

            {/* Grid de slots */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${current.cols}, 1fr)`,
              gap: current.cols > 3 ? 6 : 14,
              maxWidth: current.cols >= 4 ? 560 : current.cols === 2 ? 320 : 420,
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
                    background: '#fff', border: `1px solid ${c.border}`,
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
                        border: `1px ${slot.filled ? 'solid' : 'dashed'} ${slot.filled ? '#e6e6e6' : c.border}`,
                        cursor: slot.filled ? 'grab' : 'pointer',
                        touchAction: 'none',
                        display: slot.filled ? undefined : 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      {!slot.filled && (
                        <>
                          <IconPlus s={icon(c.accent, current.cols >= 4 ? 14 : 22)} />
                          {current.cols < 4 && (
                            <span style={{ fontSize: 9, color: c.textMuted, textAlign: 'center', padding: '0 6px' }}>Adicionar foto</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Remover */}
                    {slot.filled && (
                      <button
                        onClick={(e) => { e.stopPropagation(); clearSlot(i); }}
                        style={{
                          position: 'absolute', top: 2, right: 2, width: current.cols >= 4 ? 16 : 22, height: current.cols >= 4 ? 16 : 22, borderRadius: '50%',
                          background: 'rgba(220,53,69,0.92)', color: '#fff', border: 'none', cursor: 'pointer',
                          fontSize: 10, lineHeight: current.cols >= 4 ? '16px' : '22px', padding: 0, zIndex: 3,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <IconTrash s={icon('#fff', current.cols >= 4 ? 8 : 11)} />
                      </button>
                    )}

                    {/* Hint de arraste — oculto em grids muito pequenos */}
                    {slot.filled && current.cols < 4 && (
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
                <label style={{ fontSize: 12, color: c.textMuted, marginBottom: 4, display: 'block' }}>
                  Borda de corte
                </label>
                <select
                  value={borderColor}
                  onChange={e => setBorderColor(e.target.value as any)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, fontSize: 13, minWidth: 160,
                    background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.text, outline: 'none',
                  }}
                >
                  <option value="#9aa0a6">Cinza (recomendado)</option>
                  <option value="#000000">Preto</option>
                  <option value="none">Sem borda</option>
                </select>
              </div>
            </div>

            {/* Dica */}
            <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.5, padding: '10px 12px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <strong style={{ color: c.text }}>Dica:</strong> a foto preenche todo o quadro sem distorcer.
              Se ela for retangular, arraste para escolher o que aparece. A borda marca onde cortar.
            </div>

            <button
              onClick={handleGenerate}
              disabled={filledCount === 0}
              style={{
                ...btnPrimary,
                background: filledCount > 0 ? c.accent : c.border,
                cursor:     filledCount > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              <IconDownload s={icon('#fff', 16)} />
              Gerar PDF {pageSizeLabel}
            </button>

            <p style={{ fontSize: 11, color: c.textMuted, textAlign: 'center', margin: 0 }}>
              Gratuito · sem cobrança de créditos
            </p>
          </div>
        )}

        {/* Stage: generating */}
        {stage === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'pl-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>Gerando PDF...</p>
          </div>
        )}

        {/* Stage: result */}
        {stage === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600 }}>
              <span>PDF gerado e baixado!</span>
            </div>
            {resultName && <p style={{ fontSize: 12, color: c.textMuted, margin: 0 }}>{resultName}</p>}
            <p style={{ fontSize: 11, color: c.textMuted, margin: 0 }}>
              {resultCount} foto(s) · {current?.label} · {pageSizeLabel}
            </p>
            <button onClick={handleReset} style={{ padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 13, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconRefresh s={icon(c.textMuted, 14)} /> Gerar outro
            </button>
          </div>
        )}

        {/* Stage: error */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `1px solid ${c.error}`, color: c.error, fontSize: 14, lineHeight: 1.4 }}>
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

      <style>{`
        @keyframes pl-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
}