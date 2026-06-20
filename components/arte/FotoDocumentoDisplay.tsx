'use client';

/**
 * FotoDocumentoDisplay.tsx — ArteFinal
 *
 * Gerador de fotos para documentos em PDF (2x2, 3x4, 5x7).
 * 3 etapas: upload (+ remoção de fundo opcional) → recorte → layout de impressão.
 * 100% client-side. Gratuito (sem cobrança de crédito).
 *
 * Migrado para o padrão visual dos demais modais (paleta CMYK, header com
 * "Fechar" em texto, bloco "Como funciona") — accent = CMYK.cyan.
 *
 * REESCRITO — cropperjs trocado por react-image-crop:
 *
 * cropperjs (importado via bundler React, diferente do CDN global usado num
 * HTML de referência) se comportava de forma instável aqui: aspect ratio
 * inicial saindo na orientação errada ao trocar formato, e o erro real
 * "getCroppedCanvas is not a function" — a instância criada não expunha os
 * métodos esperados nesse ambiente de import. Em vez de continuar depurando
 * uma dependência externa com comportamento imprevisível dentro do bundler,
 * a etapa de recorte foi reescrita usando react-image-crop — a mesma
 * biblioteca já validada e funcionando no EditarImagemDisplay, reaproveitando
 * a mesma função de recorte (createFilteredCanvas) e a mesma correção de
 * escala (crop.x/y/width/height vêm em pixels RENDERIZADOS da <img>, não em
 * pixels da imagem NATURAL — é preciso multiplicar por
 * naturalWidth/width e naturalHeight/height antes de usar no canvas).
 *
 * Diferença chave deste modal vs EditarImagemDisplay: aqui o aspect ratio do
 * crop é FIXO pelo formato escolhido (3×4, 5×7, 2×2) — o ReactCrop recebe
 * aspect={photoSize.w/photoSize.h} e trava a proporção; ao trocar de formato,
 * o crop é regerado do zero com o novo aspect (centerCrop), porque manter a
 * seleção anterior não faz sentido geometricamente.
 *
 * Bugs anteriores também corrigidos (mantidos desta versão):
 * - Fundo não aparecia removido / imagem quebrada: causa era mutar
 *   cropImgRef.current.src via ref ANTES do elemento existir no DOM
 *   (stage ainda era 'processing'). Corrigido com processedUrl como state —
 *   o <img src={processedUrl}> só monta quando a URL já existe.
 * - Painel de controles com largura fixa (180px/160px) quebrava o layout
 *   mobile quando a media query virava a coluna — corrigido com
 *   width: 100% !important nessas classes em telas pequenas.
 *
 * NOVO — escolha de fundo na etapa 1 (2 botões): "Já tem fundo branco" pula
 * a remoção automática (mais rápido) e "Remover fundo automaticamente"
 * continua o fluxo original via @imgly/background-removal.
 *
 * Dependências (npm):
 *   @imgly/background-removal   (remoção de fundo via WASM no browser)
 *   react-image-crop            (recorte interativo)
 *   jspdf                       (geração de PDF)
 *
 * Convenções do guia v2 ainda aplicadas:
 *  - createPortal → document.body, position:fixed, inset:0
 *  - Estilos 100% inline via paleta DARK/LIGHT
 *  - SVG inline (sem lucide-react)
 *  - playText() só no useEffect de mount
 *  - eai:modalOpen/Close
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// ─── Ícones SVG inline ────────────────────────────────────────────────────────

type P = { c: string; sz: number };
const icon = (color: string, size = 20): P => ({ c: color, sz: size });

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

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Stage = 'upload' | 'processing' | 'crop' | 'layout' | 'result' | 'error';
type BgMode = 'remove' | 'already_white';

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

const OPENING_TEXT = 'Gerador de fotos para documentos. Envie sua foto e escolha o formato.';

export interface FotoDocumentoDisplayProps {
  data?:           { companyId?: string };
  onClose:         () => void;
  onRequireLogin?: () => void;
  theme?:          'dark' | 'light';
  playText?:       (text: string) => Promise<void>;
}

// Converte coordenadas do crop (relativas ao tamanho RENDERIZADO da <img>)
// para pixels da imagem NATURAL antes de desenhar no canvas — mesma fórmula
// validada e em produção no EditarImagemDisplay.
function createFilteredCanvas(
  image: HTMLImageElement,
  crop: PixelCrop,
  brightness: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const hasCrop = crop.width > 0 && crop.height > 0;
  const srcX = hasCrop ? crop.x * scaleX : 0;
  const srcY = hasCrop ? crop.y * scaleY : 0;
  const srcW = hasCrop ? crop.width * scaleX : image.naturalWidth;
  const srcH = hasCrop ? crop.height * scaleY : image.naturalHeight;

  canvas.width = srcW;
  canvas.height = srcH;

  ctx.filter = `brightness(${brightness})`;
  ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

  return canvas;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function FotoDocumentoDisplay({
  onClose, theme = 'dark', playText,
}: FotoDocumentoDisplayProps) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;

  // ── Estado ───────────────────────────────────────────────────────────────────

  const [stage,       setStage]       = useState<Stage>('upload');
  const [bgMode,      setBgMode]      = useState<BgMode>('remove');
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [photoSize,   setPhotoSize]   = useState<PhotoSize>(PHOTO_SIZES[0]);
  const [layout,      setLayout]      = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [brightness,  setBrightness]  = useState(1);
  // Imagem já processada (com ou sem fundo removido), pronta para o recorte.
  // State (não ref) — garante que o <img src={processedUrl}> só monta no DOM
  // com a URL já correta.
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [croppedUrl,  setCroppedUrl]  = useState<string | null>(null);
  const [resultName,  setResultName]  = useState('');

  const cropImgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null); // para revogar no cleanup

  // ── Mount ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    playText?.(OPENING_TEXT).catch(() => {});
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
      window.speechSynthesis?.cancel();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Crop inicial centralizado, com o aspect do formato escolhido ─────────────

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90, height: 90 }, photoSize.w / photoSize.h, width, height),
      width,
      height
    );
    setCrop(newCrop);
    setCompletedCrop(undefined);
  }, [photoSize]);

  // Trocar o formato (3×4, 5×7, 2×2) regenera o crop do zero com o novo
  // aspect — manter a seleção anterior não faz sentido geometricamente, já
  // que a proporção muda.
  useEffect(() => {
    if (!cropImgRef.current || stage !== 'crop') return;
    const { width, height } = cropImgRef.current;
    if (!width || !height) return;
    const newCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90, height: 90 }, photoSize.w / photoSize.h, width, height),
      width,
      height
    );
    setCrop(newCrop);
    setCompletedCrop(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoSize]);

  // ── Upload (+ remoção de fundo, se escolhido) ─────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setStage('processing');
    setErrorMsg(null);

    try {
      // Otimiza para max 1000px (sempre, independente do modo de fundo)
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

      let finalBlob: Blob = optimizedBlob;

      // Só remove o fundo se o usuário não marcou "já tem fundo branco"
      if (bgMode === 'remove') {
        const { removeBackground } = await import('@imgly/background-removal');
        finalBlob = await removeBackground(optimizedBlob);
      }

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(finalBlob);
      objectUrlRef.current = url;

      setProcessedUrl(url);
      setStage('crop');
    } catch (err: any) {
      setErrorMsg('Erro ao processar a imagem. Tente outra foto ou formato diferente.');
      setStage('error');
    }
  }, [bgMode]);

  // ── Confirmar recorte → ir para layout ───────────────────────────────────────

  const handleConfirmCrop = useCallback(() => {
    if (!cropImgRef.current || !completedCrop) return;

    try {
      const finalCrop = completedCrop.width > 0 && completedCrop.height > 0
        ? completedCrop
        : {
            x: 0, y: 0,
            width: cropImgRef.current.width,
            height: cropImgRef.current.height,
            unit: 'px' as const,
          };
      const canvas = createFilteredCanvas(cropImgRef.current, finalCrop, brightness);
      setCroppedUrl(canvas.toDataURL('image/png'));
      setStage('layout');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao confirmar o recorte. Ajuste a área e tente novamente.');
      setStage('error');
    }
  }, [completedCrop, brightness]);

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
        for (let col = 0; col < layout.cols; col++) {
          const x = margin + col * (photoW + layout.spacing);
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
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    setProcessedUrl(null);
    setCroppedUrl(null);
    setErrorMsg(null);
    setBrightness(1);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setPhotoSize(PHOTO_SIZES[0]);
    setLayout(DEFAULT_LAYOUT);
    setBgMode('remove');
    setStage('upload');
  }, []);

  const handleBackToUpload = useCallback(() => {
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    setProcessedUrl(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setStage('upload');
  }, []);

  // ── Preview grid (layout stage) ───────────────────────────────────────────────

  const { photoW: prevW, photoH: prevH } = calcLayout();
  const previewAspect = prevW / prevH;

  // ─── Estilos derivados da paleta (mesma convenção dos demais modais) ──────────

  const label: React.CSSProperties = { fontSize: 12, color: c.textMuted, marginBottom: 4, display: 'block' };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, outline: 'none', fontSize: 13,
    background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.text, boxSizing: 'border-box',
  };

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, border: 'none', background: c.accent, color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
  };
  const btnSecondary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 16px', borderRadius: 8, border: `1px solid ${c.border}`,
    background: 'transparent', color: c.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };

  const stepBadge = (n: number, active: boolean): React.CSSProperties => ({
    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700,
    background: active ? c.accent : c.bgSecondary,
    color:      active ? '#fff'   : c.textMuted,
    border:     `1px solid ${active ? c.accent : c.border}`,
    flexShrink: 0,
  });

  const currentStep = { upload: 1, processing: 1, crop: 2, layout: 3, result: 3, error: 1 }[stage] ?? 1;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
        <div style={{
          width: '100%', maxWidth: stage === 'crop' || stage === 'layout' ? 760 : 640,
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text,
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Fotos para Documentos</h2>
            <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
          </div>

          {/* Progresso */}
          {stage !== 'result' && stage !== 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              {[
                { n: 1, txt: 'Foto' },
                { n: 2, txt: 'Recorte' },
                { n: 3, txt: 'Layout' },
              ].map(({ n, txt }, i) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: i < 2 ? 1 : undefined }}>
                  <div style={stepBadge(n, currentStep >= n)}>{n}</div>
                  <span style={{ fontSize: 11, color: currentStep >= n ? c.text : c.textMuted, fontWeight: 600 }}>{txt}</span>
                  {i < 2 && <div style={{ flex: 1, height: 1, background: currentStep > n ? c.accent : c.border }} />}
                </div>
              ))}
            </div>
          )}

          {/* Stage: upload */}
          {stage === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
                <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                  Envie sua foto, recorte no formato do documento (3×4, 5×7 ou 2×2) e escolha quantas
                  cópias por folha. O sistema gera um PDF pronto para imprimir, no papel e layout que
                  você definir.
                </p>
              </div>

              <div>
                <label style={label}>Fundo da foto</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    onClick={() => setBgMode('already_white')}
                    style={{
                      padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 600,
                      border: bgMode === 'already_white' ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                      background: bgMode === 'already_white' ? 'rgba(0,174,239,0.1)' : c.bgSecondary,
                      color: c.text,
                    }}
                  >
                    Já tem fundo branco
                  </button>
                  <button
                    onClick={() => setBgMode('remove')}
                    style={{
                      padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 600,
                      border: bgMode === 'remove' ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                      background: bgMode === 'remove' ? 'rgba(0,174,239,0.1)' : c.bgSecondary,
                      color: c.text,
                    }}
                  >
                    Remover fundo automaticamente
                  </button>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: c.textMuted }}>
                  {bgMode === 'already_white'
                    ? 'O processo é mais rápido — a foto vai direto para o recorte, sem remoção de fundo.'
                    : 'Pode levar alguns segundos na primeira vez — o fundo é removido automaticamente.'}
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                style={{
                  border: `2px dashed ${c.border}`, borderRadius: 12, padding: '40px 20px', textAlign: 'center',
                  background: c.bgSecondary, cursor: 'pointer', color: c.textMuted,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                }}
              >
                <IconUpload s={icon(c.accent, 28)} />
                <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>Clique ou arraste a foto</span>
                <span style={{ fontSize: 12 }}>PNG, JPEG — máx. recomendado 5 MB</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
            </div>
          )}

          {/* Stage: processing */}
          {stage === 'processing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'fd-spin 0.8s linear infinite' }} />
              <p style={{ margin: 0, fontSize: 14, color: c.textMuted, textAlign: 'center' }}>
                {bgMode === 'remove' && !croppedUrl ? 'Removendo o fundo... pode levar alguns segundos na primeira vez.' : 'Preparando...'}
              </p>
            </div>
          )}

          {/* Stage: crop */}
          {stage === 'crop' && processedUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fd-crop-layout" style={{ display: 'flex', gap: 14 }}>

                <div style={{ flex: 1, minWidth: 0, borderRadius: 8, overflow: 'hidden', background: c.bgSecondary, minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ReactCrop crop={crop} onChange={cr => setCrop(cr)} onComplete={cr => setCompletedCrop(cr)} aspect={photoSize.w / photoSize.h}>
                    <img
                      ref={cropImgRef}
                      src={processedUrl}
                      alt="Foto para recorte"
                      onLoad={onImageLoad}
                      style={{ filter: `brightness(${brightness})`, maxWidth: '100%', maxHeight: '60vh', display: 'block' }}
                    />
                  </ReactCrop>
                </div>

                <div className="fd-crop-controls" style={{ width: 180, display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
                  <div>
                    <label style={label}>Formato</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {PHOTO_SIZES.map(s => (
                        <button key={s.label} onClick={() => setPhotoSize(s)} style={{
                          padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          border: photoSize.label === s.label ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                          background: photoSize.label === s.label ? c.accent : c.bgSecondary,
                          color: photoSize.label === s.label ? '#fff' : c.textMuted,
                        }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={label}>Brilho: {Math.round(brightness * 100)}%</label>
                    <input type="range" min={0.5} max={1.5} step={0.01} value={brightness}
                      onChange={e => setBrightness(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: c.accent }} />
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={handleConfirmCrop} disabled={!completedCrop} style={{
                      ...btnPrimary,
                      background: completedCrop ? c.accent : c.border,
                      cursor: completedCrop ? 'pointer' : 'not-allowed',
                    }}>
                      <IconChevronRight s={icon('#fff', 15)} />
                      Avançar
                    </button>
                    <button onClick={handleBackToUpload} style={btnSecondary}>
                      <IconChevronLeft s={icon(c.textMuted, 15)} />
                      Voltar
                    </button>
                  </div>
                </div>
              </div>
              {!completedCrop && (
                <p style={{ margin: 0, fontSize: 11, color: c.textMuted, textAlign: 'center' }}>
                  Arraste as bordas da área marcada para ajustar o recorte.
                </p>
              )}
            </div>
          )}

          {/* Stage: layout */}
          {stage === 'layout' && (
            <div className="fd-layout-stage" style={{ display: 'flex', gap: 16 }}>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={label}>Papel</label>
                    <select style={inputStyle} value={layout.paper}
                      onChange={e => setLayout(p => ({ ...p, paper: e.target.value as any }))}>
                      <option value="A4">A4</option>
                      <option value="10x15">10×15 cm</option>
                    </select>
                  </div>
                  <div>
                    <label style={label}>Orientação</label>
                    <select style={inputStyle} value={layout.orientation}
                      onChange={e => setLayout(p => ({ ...p, orientation: e.target.value as any }))}>
                      <option value="portrait">Retrato</option>
                      <option value="landscape">Paisagem</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={label}>Colunas</label>
                    <input style={inputStyle} type="number" min={1} max={20} value={layout.cols}
                      onChange={e => setLayout(p => ({ ...p, cols: Math.max(1, parseInt(e.target.value) || 1) }))} />
                  </div>
                  <div>
                    <label style={label}>Linhas</label>
                    <input style={inputStyle} type="number" min={1} max={20} value={layout.rows}
                      onChange={e => setLayout(p => ({ ...p, rows: Math.max(1, parseInt(e.target.value) || 1) }))} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={label}>Espaço (mm)</label>
                    <input style={inputStyle} type="number" min={0} step={0.5} value={layout.spacing}
                      onChange={e => setLayout(p => ({ ...p, spacing: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label style={label}>Borda (mm)</label>
                    <input style={inputStyle} type="number" min={0} step={0.1} value={layout.borderWidth}
                      onChange={e => setLayout(p => ({ ...p, borderWidth: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>

                <div>
                  <label style={label}>Cor da borda</label>
                  <select style={inputStyle} value={layout.borderColor}
                    onChange={e => setLayout(p => ({ ...p, borderColor: e.target.value }))}>
                    <option value="#808080">Cinza</option>
                    <option value="#000000">Preto</option>
                    <option value="none">Sem borda</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setStage('crop')} style={btnSecondary}>
                    <IconChevronLeft s={icon(c.textMuted, 15)} /> Voltar
                  </button>
                  <button onClick={handleGeneratePdf} style={{ ...btnPrimary, flex: 1 }}>
                    <IconDownload s={icon('#fff', 15)} /> Gerar PDF
                  </button>
                </div>

                <p style={{ fontSize: 11, color: c.textMuted, textAlign: 'center', margin: 0 }}>
                  Gratuito · sem cobrança de créditos
                </p>
              </div>

              <div className="fd-layout-preview" style={{ width: 160, flexShrink: 0 }}>
                <label style={label}>Pré-visualização</label>
                <div style={{
                  background: '#ffffff', border: `1px solid ${c.border}`, borderRadius: 8,
                  padding: 6, display: 'grid', gap: 2,
                  gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                }}>
                  {Array.from({ length: layout.cols * layout.rows }).map((_, i) => (
                    croppedUrl
                      ? <img key={i} src={croppedUrl} alt=""
                          style={{ width: '100%', aspectRatio: `${previewAspect}`, objectFit: 'cover', display: 'block', borderRadius: 1 }} />
                      : <div key={i} style={{ aspectRatio: `${previewAspect}`, background: c.accent, opacity: 0.5, borderRadius: 1 }} />
                  ))}
                </div>
                <p style={{ fontSize: 10, color: c.textMuted, textAlign: 'center', marginTop: 6 }}>
                  {layout.cols}×{layout.rows} = {layout.cols * layout.rows} fotos
                </p>
              </div>
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
                {layout.cols * layout.rows} fotos · {photoSize.label} · {layout.paper}
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
              <button onClick={handleReset} style={btnPrimary}>
                <IconRefresh s={icon('#fff', 15)} /> Tentar novamente
              </button>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes fd-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .fd-crop-layout { flex-direction: column !important; }
          .fd-layout-stage { flex-direction: column !important; }
          .fd-crop-controls { width: 100% !important; }
          .fd-layout-preview { width: 100% !important; }
        }
      `}</style>
    </>,
    document.body
  );
}
