'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// ───────────────────────────────────────────────────────────────────────────
// Editar Imagem — ArteFinal
//
// function_key: 'editar_imagem' · 1 crédito (sem PDFRest, sem IA — só canvas
// client-side: crop/rotação/flip/brilho/contraste/saturação. Custo real ≈ 0,
// mas como qualquer função paga do registry, cobra via RPC, não é gratuita).
//
// Fluxo: preview/edição é livre e sem login (crop, filtros, rotação não
// custam nada até aqui). Login e cobrança só acontecem no clique de
// "Salvar Edições" — mesmo padrão de custo escondido do guia.
//
// Migrado para o padrão visual dos demais modais (paleta CMYK, header com
// "Fechar" em texto, bloco "Como funciona") — accent = CMYK.cyan.
//
// CORRIGIDO — 2 bugs reais:
//
// 1) Crop não correspondia à área selecionada visualmente. A lib
//    react-image-crop reporta crop.x/y/width/height em pixels RENDERIZADOS
//    da <img> na tela (afetados por maxWidth/maxHeight), não em pixels da
//    imagem NATURAL. createFilteredCanvas usava esses valores direto no
//    ctx.drawImage, sem nenhuma conversão de escala — recortava uma área na
//    proporção errada toda vez que a imagem era exibida menor que o tamanho
//    real (praticamente sempre, por causa do maxHeight: 70vh). Corrigido
//    aplicando scaleX = image.naturalWidth/image.width e scaleY equivalente
//    antes de usar os valores do crop — mesma fórmula da documentação oficial
//    da lib (confirmada via múltiplos exemplos independentes).
//
// 2) "Reset" não voltava para a imagem original — só zerava brilho/contraste/
//    saturação/rotação/flip, nunca tocava em imageSrc. E pior: handleApplyCrop
//    SUBSTITUÍA imageSrc pelo resultado do crop, destruindo a imagem original
//    para sempre — depois de aplicar 1 corte, não havia como desfazer.
//    Corrigido guardando a imagem original em um estado separado
//    (originalImageSrc), nunca sobrescrito. "Aplicar" agora só atualiza uma
//    PRÉVIA (imageSrc) a partir da original; "Resetar tudo" volta imageSrc
//    para a original e zera os filtros — reset completo de verdade.
// ───────────────────────────────────────────────────────────────────────────

type Stage = 'input' | 'editing' | 'processing' | 'result' | 'error';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
  onRequireLogin: () => void;
}

const CMYK = { cyan: '#00AEEF', magenta: '#EC008C', yellow: '#FFD500', key: '#1A1A1A' };
const DARK = {
  bg: '#1e293b', bgSecondary: '#0f172a', border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0', textMuted: '#94a3b8', success: '#10b981', error: '#ef4444', accent: CMYK.cyan, warn: CMYK.yellow,
};
const LIGHT = {
  bg: '#ffffff', bgSecondary: '#f8fafc', border: '#e2e8f0',
  text: '#0f172a', textMuted: '#64748b', success: '#059669', error: '#dc2626', accent: CMYK.cyan, warn: '#d97706',
};

const OPENING_TEXT = 'Carregue a imagem que deseja editar para começar.';
const AUTO_CLOSE = 60;
const CREDITS_COST = 1;

// SVG Icons (sem lucide-react dentro do modal)
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);
const IconLoader = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'ei-spin 1s linear infinite' }}>
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);
const IconRotate = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"></polyline>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
  </svg>
);
const IconFlipH = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="3" x2="12" y2="21"></line>
    <polyline points="5 9 1 12 5 15"></polyline>
    <polyline points="19 9 23 12 19 15"></polyline>
  </svg>
);
const IconFlipV = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <polyline points="9 5 12 1 15 5"></polyline>
    <polyline points="9 19 12 23 15 19"></polyline>
  </svg>
);
const IconCrop = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path>
    <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path>
  </svg>
);
const IconUpload = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// Converte coordenadas do crop (relativas ao tamanho RENDERIZADO da <img>)
// para pixels da imagem NATURAL antes de desenhar no canvas — sem essa
// conversão, o recorte sai errado sempre que a imagem é exibida em tamanho
// diferente do natural (maxWidth/maxHeight), que é o caso normal aqui.
function createFilteredCanvas(
  image: HTMLImageElement,
  crop: PixelCrop,
  brightness: number,
  contrast: number,
  saturation: number,
  rotation: number = 0,
  flip: { horizontal: boolean; vertical: boolean } = { horizontal: false, vertical: false }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Fator de escala entre o tamanho renderizado (image.width/height, em CSS
  // px) e o tamanho real da imagem (naturalWidth/naturalHeight) — fórmula
  // padrão da documentação oficial do react-image-crop.
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const hasCrop = crop.width > 0 && crop.height > 0;
  const srcX = hasCrop ? crop.x * scaleX : 0;
  const srcY = hasCrop ? crop.y * scaleY : 0;
  const srcW = hasCrop ? crop.width * scaleX : image.naturalWidth;
  const srcH = hasCrop ? crop.height * scaleY : image.naturalHeight;

  const scaleXFlip = flip.horizontal ? -1 : 1;
  const scaleYFlip = flip.vertical ? -1 : 1;

  canvas.width = srcW;
  canvas.height = srcH;

  ctx.translate(srcW / 2, srcH / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.scale(scaleXFlip, scaleYFlip);

  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  ctx.drawImage(
    image,
    srcX, srcY, srcW, srcH,
    -srcW / 2, -srcH / 2, srcW, srcH
  );

  return canvas;
}

export default function EditarImagemDisplay({ data, onClose, theme = 'dark', playText, onRequireLogin }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;

  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [isDragging, setIsDragging] = useState(false);

  // originalImageSrc nunca é sobrescrita após o upload — é a fonte de
  // verdade para qualquer reset. imageSrc é o que está sendo exibido no
  // editor agora (pode já ter um crop/filtro "aplicado" como prévia).
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });

  const [imageInfo, setImageInfo] = useState({ width: 0, height: 0 });

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');
  const [resultBase64, setResultBase64] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const hasSpoken = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Auto-close timer no resultado
  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, onClose]);

  // Áudio só no mount — nunca em handler de registry
  useEffect(() => {
    if (hasSpoken.current) return;
    hasSpoken.current = true;
    window.speechSynthesis?.cancel();
    playText(OPENING_TEXT).catch(() => {});
  }, []);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // naturalWidth/naturalHeight (dimensões reais), não width/height
    // (dimensões renderizadas) — o painel "Dimensões" deve mostrar o
    // tamanho real do arquivo, não o tamanho na tela.
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImageInfo({ width: naturalWidth, height: naturalHeight });

    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90, height: 90 }, width / height, width, height),
      width,
      height
    );
    setCrop(newCrop);
    setCompletedCrop(undefined);
  }, []);

  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

  const handleFileSelected = useCallback((file: File | null | undefined) => {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMsg('Formato não suportado. Envie uma imagem JPG, PNG ou WebP.');
      setStage('error');
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      setOriginalImageSrc(url);
      setImageSrc(url);
      setStage('editing');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao processar imagem.');
      setStage('error');
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelected(e.target.files?.[0]);
    e.target.value = '';
  }, [handleFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelected(e.dataTransfer.files?.[0]);
  }, [handleFileSelected]);

  const handleRotate = useCallback((degrees: number) => {
    setRotation(prev => (prev + degrees) % 360);
  }, []);

  const handleFlip = useCallback((direction: 'horizontal' | 'vertical') => {
    setFlip(prev => ({ ...prev, [direction]: !prev[direction] }));
  }, []);

  // Reset completo: volta a IMAGEM para a original (desfaz crops já
  // "aplicados" como prévia) e zera todos os filtros/transformações.
  const handleResetFilters = useCallback(() => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setFlip({ horizontal: false, vertical: false });
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (originalImageSrc) setImageSrc(originalImageSrc);
  }, [originalImageSrc]);

  // "Aplicar" agora só atualiza a PRÉVIA — sempre recortando a partir da
  // imagem ORIGINAL (nunca da já-editada), para não perder qualidade nem
  // tornar o reset impossível em aplicações sucessivas.
  const handleApplyCrop = useCallback(async () => {
    if (!imgRef.current || !completedCrop || !originalImageSrc) return;
    setIsProcessing(true);

    try {
      const canvas = createFilteredCanvas(imgRef.current, completedCrop, brightness, contrast, saturation, rotation, flip);
      const dataUrl = canvas.toDataURL('image/png');

      setImageSrc(dataUrl);
      setImageInfo({ width: canvas.width, height: canvas.height });

      setCrop(undefined);
      setCompletedCrop(undefined);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setRotation(0);
      setFlip({ horizontal: false, vertical: false });
    } catch {
      setErrorMsg('Erro ao aplicar edições.');
      setStage('error');
    } finally {
      setIsProcessing(false);
    }
  }, [brightness, contrast, saturation, rotation, flip, completedCrop, originalImageSrc]);

  // Salvar = ponto de cobrança. Preview/edição continuam livres até aqui.
  const handleSave = useCallback(async () => {
    if (!imgRef.current || !imageSrc) return;

    try {
      // Login só é exigido aqui — mesmo padrão de custo escondido.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        onRequireLogin();
        return;
      }

      setStage('processing');

      // company lazy — cobrar crédito exige company existente
      let cid = data.companyId;
      if (!cid) {
        const { data: ensured } = await supabase.rpc('ensure_my_arte_company');
        cid = (ensured as string) ?? '';
      }
      if (!cid) {
        setErrorMsg('Não foi possível identificar sua empresa. Tente novamente.');
        setStage('error');
        return;
      }

      const finalCrop = completedCrop || {
        x: 0,
        y: 0,
        width: imgRef.current.width,
        height: imgRef.current.height,
        unit: 'px' as const,
      };

      const canvas = createFilteredCanvas(imgRef.current, finalCrop, brightness, contrast, saturation, rotation, flip);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Falha ao gerar imagem.'));
        }, 'image/png');
      });

      const fileName = `editada_${Date.now()}.png`;

      // base64 ANTES de cobrar — o arquivo já precisa existir quando a cobrança roda (fail-closed)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Falha ao ler imagem gerada.'));
        reader.readAsDataURL(blob);
      });

      // Cobrar por último, via RPC correta — nunca decrementar_creditos
      const { data: raw, error: rpcError } = await supabase.rpc('cobrar_credito_se_suficiente', {
        p_company_id: cid,
        p_function_key: 'editar_imagem',
        p_credits: CREDITS_COST,
        p_metadata: { fileName },
      });
      if (rpcError) throw new Error(rpcError.message);

      // RPC retorna TABLE → vem como array (bug do 402-com-saldo)
      const cobranca = Array.isArray(raw) ? raw[0] : raw;
      if (!cobranca?.sucesso) {
        setErrorMsg('Créditos insuficientes para salvar a edição.');
        setStage('error');
        return;
      }

      setResultBase64(base64);
      setResultBlob(blob);
      setResultFileName(fileName);
      setStage('result');
    } catch (error: any) {
      setErrorMsg(error.message ?? 'Erro ao salvar imagem.');
      setStage('error');
    }
  }, [imageSrc, brightness, contrast, saturation, rotation, flip, completedCrop, data.companyId, supabase, onRequireLogin]);

  const handleDownload = useCallback(() => {
    if (!resultBlob || !resultFileName) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultFileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [resultBlob, resultFileName]);

  const handleReset = useCallback(() => {
    setStage('input');
    setOriginalImageSrc(null);
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setFlip({ horizontal: false, vertical: false });
    setResultBlob(null);
    setErrorMsg(null);
  }, []);

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
    transform: `rotate(${rotation}deg) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`,
  };

  const label: React.CSSProperties = { fontSize: 11, color: c.textMuted, display: 'block', marginBottom: 4 };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{
        width: '100%',
        maxWidth: stage === 'editing' || stage === 'result' ? 900 : 640,
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Editar Imagem</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

        {/* Stage: input */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
              <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                Carregue uma imagem para cortar, girar, espelhar e ajustar brilho, contraste e saturação.
                Você pode testar livremente e resetar quantas vezes quiser — o arquivo editado só é
                disponibilizado e cobrado depois que você clicar em salvar.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '40px 20px', borderRadius: 12, border: `2px dashed ${isDragging ? c.accent : c.border}`,
                background: isDragging ? 'rgba(0,174,239,0.06)' : c.bgSecondary, color: c.textMuted, cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <IconUpload />
              <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                Clique para selecionar ou arraste a imagem aqui
              </span>
              <span style={{ fontSize: 12 }}>JPG, PNG ou WebP</span>
            </div>

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleInputChange} style={{ display: 'none' }} />
          </div>
        )}

        {/* Stage: editing */}
        {stage === 'editing' && imageSrc && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <div className="ei-editing-container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

              <div style={{
                background: c.bgSecondary, borderRadius: 8, padding: 16, minHeight: 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
              }}>
                {isProcessing && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)', borderRadius: 8, zIndex: 10,
                  }}>
                    <IconLoader />
                  </div>
                )}

                <ReactCrop crop={crop} onChange={cr => setCrop(cr)} onComplete={cr => setCompletedCrop(cr)} aspect={undefined}>
                  <img
                    ref={imgRef}
                    alt="Edição"
                    src={imageSrc}
                    style={{ ...filterStyle, maxWidth: '100%', maxHeight: '70vh', display: 'block' }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: c.textMuted }}>Dimensões:</span>
                    <span style={{ fontWeight: 500 }}>{imageInfo.width} × {imageInfo.height}px</span>
                  </div>
                </div>

                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, margin: 0 }}>Transformações</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                    <button onClick={() => handleRotate(-90)} style={{
                      padding: 8, borderRadius: 6, border: `1px solid ${c.border}`, background: c.bg, color: c.text,
                      cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                      <IconRotate /> -90°
                    </button>
                    <button onClick={() => handleRotate(90)} style={{
                      padding: 8, borderRadius: 6, border: `1px solid ${c.border}`, background: c.bg, color: c.text,
                      cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                      <IconRotate /> +90°
                    </button>
                    <button onClick={() => handleFlip('horizontal')} style={{
                      padding: 8, borderRadius: 6, border: `1px solid ${c.border}`,
                      background: flip.horizontal ? c.accent : c.bg, color: flip.horizontal ? '#fff' : c.text,
                      cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                      <IconFlipH /> Flip H
                    </button>
                    <button onClick={() => handleFlip('vertical')} style={{
                      padding: 8, borderRadius: 6, border: `1px solid ${c.border}`,
                      background: flip.vertical ? c.accent : c.bg, color: flip.vertical ? '#fff' : c.text,
                      cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                      <IconFlipV /> Flip V
                    </button>
                  </div>
                </div>

                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, margin: 0 }}>Ajustes</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    <div>
                      <label style={label}>Brilho: {brightness}%</label>
                      <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                    </div>
                    <div>
                      <label style={label}>Contraste: {contrast}%</label>
                      <input type="range" min="50" max="200" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                    </div>
                    <div>
                      <label style={label}>Saturação: {saturation}%</label>
                      <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} style={{ width: '100%', accentColor: c.accent }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 8, borderTop: `1px solid ${c.border}` }}>
                  <button onClick={handleApplyCrop} disabled={!completedCrop || isProcessing} style={{
                    padding: 10, borderRadius: 8, border: 'none',
                    background: completedCrop && !isProcessing ? c.accent : c.border,
                    color: '#fff', cursor: completedCrop && !isProcessing ? 'pointer' : 'not-allowed',
                    fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <IconCrop /> Aplicar
                  </button>
                  <button onClick={handleResetFilters} style={{
                    padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text,
                    cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  }}>
                    Resetar tudo
                  </button>
                </div>

                <button onClick={handleSave} disabled={isProcessing} title={`${CREDITS_COST} crédito`} style={{
                  padding: 12, borderRadius: 8, border: 'none',
                  background: isProcessing ? c.border : c.accent,
                  color: '#fff', cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <IconDownload /> Salvar Edições · {CREDITS_COST} crédito
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage: processing */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <IconLoader />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>Salvando edições...</p>
          </div>
        )}

        {/* Stage: result */}
        {stage === 'result' && resultBlob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8,
              background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600,
            }}>
              <IconCheck />
              <span>Imagem editada com sucesso!</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8 }}>
                {(resultBlob.size / 1024).toFixed(1)} KB
              </span>
            </div>

            <div style={{ display: 'flex', gap: 16 }} className="ei-result-container">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>
                    Arquivo: <strong style={{ color: c.text }}>{resultFileName}</strong>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: c.textMuted }}>Formato: PNG</p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDownload} style={{
                    flex: 1, padding: 10, borderRadius: 8, border: 'none', background: c.accent, color: '#fff',
                    cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <IconDownload /> Baixar
                  </button>
                  <button onClick={handleReset} style={{
                    flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text,
                    cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <IconRefresh /> Nova
                  </button>
                </div>
              </div>

              <div className="ei-qr-desktop" style={{ display: 'none', flexShrink: 0, width: 224 }}>
                <ResultDownloadQR companyId={data.companyId} fileName={resultFileName} fileType={resultBlob.type} fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
              </div>
            </div>

            <div className="ei-qr-mobile" style={{ display: 'block' }}>
              <ResultDownloadQR companyId={data.companyId} fileName={resultFileName} fileType={resultBlob.type} fileBase64={resultBase64} isDark={isDark} enabled={stage === 'result' && !!resultBase64} />
            </div>
          </div>
        )}

        {/* Stage: error */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `1px solid ${c.error}`, color: c.error, fontSize: 14, lineHeight: 1.4 }}>
              {errorMsg}
            </div>
            <button onClick={handleReset} style={{
              padding: 12, borderRadius: 8, border: 'none', background: c.error, color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <IconRefresh /> Tentar Novamente
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ei-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ei-result-container { display: flex; flex-direction: row; gap: 16px; }
        @media (max-width: 768px) {
          .ei-editing-container { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .ei-result-container { flex-direction: column !important; }
          .ei-qr-desktop { display: none !important; }
          .ei-qr-mobile { display: block !important; }
        }
        @media (min-width: 641px) {
          .ei-qr-desktop { display: flex !important; flex-direction: column; }
          .ei-qr-mobile { display: none !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}
