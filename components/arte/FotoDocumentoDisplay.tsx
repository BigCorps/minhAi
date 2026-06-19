'use client';

/**
 * FotoDocumentoDisplay.tsx — ArteFinal
 *
 * Gerador de fotos para documentos em PDF (2x2, 3x4, 5x7).
 * 3 etapas: upload + remoção de fundo → recorte → layout de impressão.
 * 100% client-side. Gratuito (sem cobrança de crédito).
 *
 * Dependências (npm):
 *   @imgly/background-removal   (remoção de fundo via WASM no browser)
 *   cropperjs                   (recorte interativo)
 *   jspdf                       (geração de PDF)
 *   @types/cropperjs            (dev)
 *
 * Convenções do guia v2:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta DARK/LIGHT
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - CSS do Cropper.js injetado via <style> no portal
 *  - eai:modalOpen/Close
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
const IconChevronRight = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconPhoto = ({ s }: { s: P }) => (
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
  input: '#0f172a', inputBorder: '#334155',
  overlay: 'rgba(0,0,0,0.8)',
};
const LIGHT = {
  bg: '#ffffff', surface: '#f8fafc', surfaceAlt: '#f1f5f9',
  border: '#e5e7eb', borderStrong: '#d1d5db',
  text: '#111827', sub: '#6b7280', muted: '#9ca3af',
  accent: '#e94560', blue: '#2563eb', blueDim: '#eff6ff', blueMuted: '#1d4ed8',
  green: '#16a34a', greenDim: '#dcfce7', greenMuted: '#166534',
  red: '#dc2626', redDim: '#fef2f2', redBorder: '#fecaca',
  input: '#f9fafb', inputBorder: '#d1d5db',
  overlay: 'rgba(0,0,0,0.65)',
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Stage = 'upload' | 'processing' | 'crop' | 'layout' | 'result' | 'error';

interface PhotoSize { label: string; w: number; h: number } // mm
interface LayoutConfig {
  paper:       'A4' | '10x15';
  orientation: 'portrait' | 'landscape';
  cols:        number;
  rows:        number;
  spacing:     number;     // mm
  borderWidth: number;     // mm
  borderColor: string;
}

const PHOTO_SIZES: PhotoSize[] = [
  { label: '3×4 cm',  w: 30, h: 40 },
  { label: '5×7 cm',  w: 50, h: 70 },
  { label: '2×2 cm',  w: 20, h: 20 },
];

const PAPER_DIMS: Record<string, { w: number; h: number }> = {
  A4:    { w: 210, h: 297 },
  '10x15': { w: 100, h: 150 },
};

const DEFAULT_LAYOUT: LayoutConfig = {
  paper: 'A4', orientation: 'portrait',
  cols: 4, rows: 5, spacing: 1, borderWidth: 0.2, borderColor: '#808080',
};

export interface FotoDocumentoDisplayProps {
  data?:           { companyId?: string };
  onClose:         () => void;
  onRequireLogin?: () => void;
  theme?:          'dark' | 'light';
  playText?:       (text: string) => Promise<void>;
}

// ─── CSS mínimo do Cropper.js (inline, sem import de CSS externo) ─────────────
// Subset necessário para o cropper funcionar no portal
const CROPPER_CSS = `
.cropper-container{direction:ltr;font-size:0;line-height:0;position:relative;touch-action:none;user-select:none}
.cropper-container img{display:block;height:100%;image-orientation:0deg;max-height:none!important;max-width:none!important;min-height:0!important;min-width:0!important;width:100%}
.cropper-wrap-box,.cropper-canvas,.cropper-drag-box,.cropper-crop-box,.cropper-modal{bottom:0;left:0;position:absolute;right:0;top:0}
.cropper-wrap-box,.cropper-canvas{overflow:hidden}
.cropper-drag-box{background-color:#fff;opacity:0;cursor:move}
.cropper-modal{background-color:#000;opacity:.5}
.cropper-view-box{display:block;height:100%;outline:1px solid #39f;outline-color:rgba(51,153,255,.75);overflow:hidden;width:100%}
.cropper-dashed{border:0 dashed #eee;display:block;opacity:.5;position:absolute}
.cropper-dashed.dashed-h{border-bottom-width:1px;border-top-width:1px;height:calc(100% / 3);left:0;top:calc(100% / 3);width:100%}
.cropper-dashed.dashed-v{border-left-width:1px;border-right-width:1px;height:100%;left:calc(100% / 3);top:0;width:calc(100% / 3)}
.cropper-center{display:block;height:0;left:50%;opacity:.75;position:absolute;top:50%;width:0}
.cropper-center::before,.cropper-center::after{background-color:#eee;content:" ";display:block;position:absolute}
.cropper-center::before{height:1px;left:-3px;top:0;width:7px}
.cropper-center::after{height:7px;left:0;top:-3px;width:1px}
.cropper-face,.cropper-line,.cropper-point{display:block;height:100%;opacity:.1;position:absolute;width:100%}
.cropper-face{background-color:#fff;left:0;top:0}
.cropper-line{background-color:#39f}
.cropper-line.line-e{cursor:ew-resize;right:-3px;top:0;width:5px}
.cropper-line.line-n{cursor:ns-resize;height:5px;left:0;top:-3px}
.cropper-line.line-w{cursor:ew-resize;left:-3px;top:0;width:5px}
.cropper-line.line-s{bottom:-3px;cursor:ns-resize;height:5px;left:0}
.cropper-point{background-color:#39f;height:5px;opacity:.75;width:5px}
.cropper-point.point-e{cursor:ew-resize;margin-top:-3px;right:-3px;top:50%}
.cropper-point.point-n{cursor:ns-resize;left:50%;margin-left:-3px;top:-3px}
.cropper-point.point-w{cursor:ew-resize;left:-3px;margin-top:-3px;top:50%}
.cropper-point.point-s{bottom:-3px;cursor:ns-resize;left:50%;margin-left:-3px}
.cropper-point.point-ne{cursor:nesw-resize;right:-3px;top:-3px}
.cropper-point.point-nw{cursor:nwse-resize;left:-3px;top:-3px}
.cropper-point.point-sw{bottom:-3px;cursor:nesw-resize;left:-3px}
.cropper-point.point-se{bottom:-3px;cursor:nwse-resize;height:20px;opacity:1;right:-3px;width:20px}
.cropper-invisible{opacity:0}
.cropper-bg{background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAADklEQVQI12P4z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==")}
.cropper-hide{display:block;height:1px;position:absolute;width:1px}
.cropper-move{cursor:move}
`;

// ─── Componente ───────────────────────────────────────────────────────────────

export default function FotoDocumentoDisplay({
  onClose, theme = 'dark', playText,
}: FotoDocumentoDisplayProps) {
  const C = theme === 'dark' ? DARK : LIGHT;

  // ── Estado ───────────────────────────────────────────────────────────────────

  const [stage,       setStage]       = useState<Stage>('upload');
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [photoSize,   setPhotoSize]   = useState<PhotoSize>(PHOTO_SIZES[0]);
  const [layout,      setLayout]      = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [brightness,  setBrightness]  = useState(1);
  const [zoom,        setZoom]        = useState(0.5);
  const [croppedUrl,  setCroppedUrl]  = useState<string | null>(null);
  const [resultName,  setResultName]  = useState('');

  // Refs
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const cropImgRef    = useRef<HTMLImageElement>(null);
  const cropperRef    = useRef<any>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropperInstanceRef = useRef<any>(null);
  const bgUrlRef      = useRef<string | null>(null); // URL.createObjectURL para cleanup

  // ── Mount ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    playText?.('Gerador de fotos para documentos. Envie sua foto e escolha o formato.').catch(() => {});
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
      window.speechSynthesis?.cancel();
      // Libera object URL do fundo removido
      if (bgUrlRef.current) URL.revokeObjectURL(bgUrlRef.current);
      cropperRef.current?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Inicializar Cropper quando entra na etapa crop ────────────────────────────

  useEffect(() => {
    if (stage !== 'crop' || !cropImgRef.current || !bgUrlRef.current) return;

    let cancelled = false;
    (async () => {
      const Cropper = (await import('cropperjs')).default;
      if (cancelled || !cropImgRef.current) return;

      cropperRef.current?.destroy();
      cropperRef.current = new Cropper(cropImgRef.current, {
        aspectRatio: photoSize.w / photoSize.h,
        viewMode: 2,
        dragMode: 'move',
        autoCropArea: 0.9,
        responsive: true,
        background: true,
        ready() {
          const cd = cropperRef.current.getContainerData();
          const cv = cropperRef.current.getCanvasData();
          const z  = Math.min(cd.width / cv.naturalWidth, cd.height / cv.naturalHeight);
          cropperRef.current.zoomTo(z);
          setZoom(z);
        },
      });
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Atualiza aspect ratio quando muda o tamanho
  useEffect(() => {
    cropperRef.current?.setAspectRatio(photoSize.w / photoSize.h);
  }, [photoSize]);

  // Zoom
  useEffect(() => {
  if (imageRef.current && imageUrl) {
    if (cropperInstanceRef.current) {
      cropperInstanceRef.current.destroy();
    }

    cropperInstanceRef.current = new Cropper(imageRef.current, {
      aspectRatio: 3 / 4,
      viewMode: 2,
      responsive: true,
      background: false,
    });
  }

  return () => {
    if (cropperInstanceRef.current) {
      cropperInstanceRef.current.destroy();
    }
  };
}, [imageUrl]);

const handleZoom = (val: number) => {
  if (cropperInstanceRef.current) {
    cropperInstanceRef.current.zoomTo(val);
  }
};

  // ── Upload + remoção de fundo ─────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setStage('processing');
    setErrorMsg(null);

    try {
      // Otimiza para max 1000px
      const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const max = 1000;
            let { width, height } = img;
            if (width > max || height > max) {
              if (width > height) { height = (height * max) / width; width = max; }
              else                { width = (width * max) / height;  height = max; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob falhou')), file.type, 0.9);
          };
          img.onerror = reject;
          img.src = e.target!.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Remoção de fundo — import dinâmico
      const { removeBackground } = await import('@imgly/background-removal');
      const bgBlob = await removeBackground(optimizedBlob);

      if (bgUrlRef.current) URL.revokeObjectURL(bgUrlRef.current);
      bgUrlRef.current = URL.createObjectURL(bgBlob);

      if (cropImgRef.current) cropImgRef.current.src = bgUrlRef.current;
      setStage('crop');
    } catch (err: any) {
      setErrorMsg('Erro ao processar a imagem. Tente outra foto ou formato diferente.');
      setStage('error');
    }
  }, []);

  // ── Confirmar recorte → ir para layout ───────────────────────────────────────

  const handleConfirmCrop = useCallback(() => {
    if (!cropperRef.current) return;

    const canvas = cropperRef.current.getCroppedCanvas({ width: 1000, imageSmoothingQuality: 'high' });
    const temp   = document.createElement('canvas');
    temp.width = canvas.width; temp.height = canvas.height;
    const ctx = temp.getContext('2d')!;
    ctx.filter = `brightness(${brightness})`;
    ctx.drawImage(canvas, 0, 0);
    setCroppedUrl(temp.toDataURL('image/png'));
    setStage('layout');
  }, [brightness]);

  // ── Calcular layout de impressão ──────────────────────────────────────────────

  const calcLayout = useCallback(() => {
    const paper = PAPER_DIMS[layout.paper];
    const pw = layout.orientation === 'portrait' ? paper.w : paper.h;
    const ph = layout.orientation === 'portrait' ? paper.h : paper.w;
    const margin = 5;
    const aw = pw - 2 * margin;
    const ah = ph - 2 * margin;
    const tsx = (layout.cols - 1) * layout.spacing;
    const tsy = (layout.rows - 1) * layout.spacing;
    const ar  = photoSize.w / photoSize.h;

    let photoW = (aw - tsx) / layout.cols;
    let photoH = photoW / ar;

    if (photoH * layout.rows + tsy > ah) {
      photoH = (ah - tsy) / layout.rows;
      photoW = photoH * ar;
    }

    return { paperW: pw, paperH: ph, margin, photoW, photoH };
  }, [layout, photoSize]);

  // ── Gerar PDF ─────────────────────────────────────────────────────────────────

  const handleGeneratePdf = useCallback(async () => {
    if (!croppedUrl) return;
    setStage('processing');

    try {
      const { jsPDF } = await import('jspdf') as any;
      const { paperW, paperH, margin, photoW, photoH } = calcLayout();

      const doc = new jsPDF(layout.orientation, 'mm', [paperW, paperH]);

      for (let r = 0; r < layout.rows; r++) {
        for (let c = 0; c < layout.cols; c++) {
          const x = margin + c * (photoW + layout.spacing);
          const y = margin + r * (photoH + layout.spacing);
          doc.addImage(croppedUrl, 'PNG', x, y, photoW, photoH);
          if (layout.borderColor !== 'none' && layout.borderWidth > 0) {
            doc.setDrawColor(layout.borderColor);
            doc.setLineWidth(layout.borderWidth);
            doc.rect(x, y, photoW, photoH);
          }
        }
      }

      const name = `fotos_documento_${Date.now()}.pdf`;
      doc.save(name);
      setResultName(name);
      setStage('result');
      playText?.('PDF gerado e baixado!').catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao gerar PDF.');
      setStage('error');
    }
  }, [croppedUrl, layout, calcLayout, playText]);

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    cropperRef.current?.destroy();
    cropperRef.current = null;
    if (bgUrlRef.current) { URL.revokeObjectURL(bgUrlRef.current); bgUrlRef.current = null; }
    setCroppedUrl(null);
    setErrorMsg(null);
    setBrightness(1);
    setZoom(0.5);
    setPhotoSize(PHOTO_SIZES[0]);
    setLayout(DEFAULT_LAYOUT);
    setStage('upload');
  }, []);

  // ── Preview grid (layout stage) ───────────────────────────────────────────────

  const { photoW: prevW, photoH: prevH } = calcLayout();
  const previewAspect = prevW / prevH;

  // ─── Estilos base ─────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, outline: 'none', fontSize: 13,
    background: C.input, border: `1px solid ${C.inputBorder}`, color: C.text, boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 3, display: 'block' };

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 18px', borderRadius: 10, border: 'none',
    background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  const btnSecondary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 18px', borderRadius: 10, border: `1px solid ${C.border}`,
    background: 'transparent', color: C.sub, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };
  const btnGhost: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 0', borderRadius: 10, border: 'none', width: '100%',
    background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
    color: C.sub, fontSize: 12, cursor: 'pointer',
  };

  const stepBadge = (n: number, active: boolean): React.CSSProperties => ({
    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700,
    background: active ? C.accent : C.surface,
    color:      active ? '#fff'   : C.muted,
    border:     `1px solid ${active ? C.accent : C.border}`,
    flexShrink: 0,
  });

  const currentStep = { upload: 1, processing: 1, crop: 2, layout: 3, result: 3, error: 1 }[stage] ?? 1;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <>
      {/* CSS do Cropper.js injetado inline */}
      <style>{CROPPER_CSS}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.overlay, padding: 12,
      }}>
        <div style={{
          width: '100%',
          maxWidth: stage === 'crop' || stage === 'layout' ? 680 : 420,
          maxHeight: '95dvh', overflowY: 'auto',
          borderRadius: 20, padding: 22,
          background: C.bg, border: `1px solid ${C.border}`,
          boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
          transition: 'max-width 0.3s ease',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconPhoto s={icon(C.accent, 20)} />
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Fotos para Documentos</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <IconX s={icon(C.sub, 18)} />
            </button>
          </div>

          {/* Progresso */}
          {stage !== 'result' && stage !== 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              {[
                { n: 1, label: 'Foto' },
                { n: 2, label: 'Recorte' },
                { n: 3, label: 'Layout' },
              ].map(({ n, label }, i) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: i < 2 ? 1 : undefined }}>
                  <div style={stepBadge(n, currentStep >= n)}>{n}</div>
                  <span style={{ fontSize: 11, color: currentStep >= n ? C.text : C.muted, fontWeight: 600 }}>{label}</span>
                  {i < 2 && <div style={{ flex: 1, height: 1, background: currentStep > n ? C.accent : C.border }} />}
                </div>
              ))}
            </div>
          )}

          {/* ── Stage: upload ── */}
          {stage === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>
                Envie sua foto. O fundo será removido automaticamente.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                style={{
                  border: `2px dashed ${C.borderStrong}`, borderRadius: 14, padding: '48px 20px',
                  textAlign: 'center', background: C.surface, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  transition: 'background 0.15s',
                }}
              >
                <IconUpload s={icon(C.accent, 32)} />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Clique ou arraste a foto</span>
                <span style={{ fontSize: 12, color: C.muted }}>PNG, JPEG — máx. recomendado 5 MB</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
            </div>
          )}

          {/* ── Stage: processing ── */}
          {stage === 'processing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', animation: 'fd-spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 13, color: C.sub, margin: 0, textAlign: 'center' }}>
                Removendo o fundo… pode levar alguns segundos na primeira vez.
              </p>
              <style>{`@keyframes fd-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── Stage: crop ── */}
          {stage === 'crop' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 14 }}>

                {/* Cropper */}
                <div style={{ flex: 1, minWidth: 0, borderRadius: 10, overflow: 'hidden', background: C.surfaceAlt, minHeight: 320 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img ref={cropImgRef} alt="Foto para recorte" style={{ display: 'block', maxWidth: '100%' }} />
                </div>

                {/* Controles */}
                <div style={{ width: 180, display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>

                  {/* Tamanhos */}
                  <div>
                    <label style={lbl}>Formato</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {PHOTO_SIZES.map(s => (
                        <button key={s.label} onClick={() => setPhotoSize(s)} style={{
                          padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          border: `1px solid ${photoSize.label === s.label ? C.accent : C.border}`,
                          background: photoSize.label === s.label ? C.accent : C.surface,
                          color: photoSize.label === s.label ? '#fff' : C.sub,
                        }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zoom */}
                  <div>
                    <label style={lbl}>Zoom</label>
                    <input type="range" min={0} max={3} step={0.01} value={zoom}
                      onChange={e => setZoom(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: C.accent }} />
                  </div>

                  {/* Brilho */}
                  <div>
                    <label style={lbl}>Brilho</label>
                    <input type="range" min={0.5} max={1.5} step={0.01} value={brightness}
                      onChange={e => setBrightness(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: C.accent }} />
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={handleConfirmCrop} style={btnPrimary}>
                      <IconChevronRight s={icon('#fff', 15)} />
                      Avançar
                    </button>
                    <button onClick={handleReset} style={btnSecondary}>
                      <IconChevronLeft s={icon(C.sub, 15)} />
                      Voltar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Stage: layout ── */}
          {stage === 'layout' && (
            <div style={{ display: 'flex', gap: 16 }}>

              {/* Configurações */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lbl}>Papel</label>
                    <select style={inp} value={layout.paper}
                      onChange={e => setLayout(p => ({ ...p, paper: e.target.value as any }))}>
                      <option value="A4">A4</option>
                      <option value="10x15">10×15 cm</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Orientação</label>
                    <select style={inp} value={layout.orientation}
                      onChange={e => setLayout(p => ({ ...p, orientation: e.target.value as any }))}>
                      <option value="portrait">Retrato</option>
                      <option value="landscape">Paisagem</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lbl}>Colunas</label>
                    <input style={inp} type="number" min={1} max={20} value={layout.cols}
                      onChange={e => setLayout(p => ({ ...p, cols: Math.max(1, parseInt(e.target.value) || 1) }))} />
                  </div>
                  <div>
                    <label style={lbl}>Linhas</label>
                    <input style={inp} type="number" min={1} max={20} value={layout.rows}
                      onChange={e => setLayout(p => ({ ...p, rows: Math.max(1, parseInt(e.target.value) || 1) }))} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lbl}>Espaço (mm)</label>
                    <input style={inp} type="number" min={0} step={0.5} value={layout.spacing}
                      onChange={e => setLayout(p => ({ ...p, spacing: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label style={lbl}>Borda (mm)</label>
                    <input style={inp} type="number" min={0} step={0.1} value={layout.borderWidth}
                      onChange={e => setLayout(p => ({ ...p, borderWidth: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>

                <div>
                  <label style={lbl}>Cor da borda</label>
                  <select style={inp} value={layout.borderColor}
                    onChange={e => setLayout(p => ({ ...p, borderColor: e.target.value }))}>
                    <option value="#808080">Cinza</option>
                    <option value="#000000">Preto</option>
                    <option value="none">Sem borda</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setStage('crop')} style={btnSecondary}>
                    <IconChevronLeft s={icon(C.sub, 15)} /> Voltar
                  </button>
                  <button onClick={handleGeneratePdf} style={{ ...btnPrimary, flex: 1 }}>
                    <IconDownload s={icon('#fff', 15)} /> Gerar PDF
                  </button>
                </div>

                <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', margin: 0 }}>
                  Gratuito · sem cobrança de créditos
                </p>
              </div>

              {/* Preview */}
              <div style={{ width: 160, flexShrink: 0 }}>
                <label style={lbl}>Pré-visualização</label>
                <div style={{
                  background: '#ffffff', border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: 6, display: 'grid', gap: 2,
                  gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                }}>
                  {Array.from({ length: layout.cols * layout.rows }).map((_, i) => (
                    croppedUrl
                      ? <img key={i} src={croppedUrl} alt=""
                          style={{ width: '100%', aspectRatio: `${previewAspect}`, objectFit: 'cover', display: 'block', borderRadius: 1 }} />
                      : <div key={i} style={{ aspectRatio: `${previewAspect}`, background: C.accent, opacity: 0.5, borderRadius: 1 }} />
                  ))}
                </div>
                <p style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 6 }}>
                  {layout.cols}×{layout.rows} = {layout.cols * layout.rows} fotos
                </p>
              </div>
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
                {layout.cols * layout.rows} fotos · {photoSize.label} · {layout.paper}
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
              <button onClick={handleReset} style={btnPrimary}>
                <IconRefresh s={icon('#fff', 15)} /> Tentar novamente
              </button>
            </div>
          )}

        </div>
      </div>
    </>,
    document.body
  );
}
