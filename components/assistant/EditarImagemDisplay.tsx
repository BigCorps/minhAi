'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';
import CameraCapture from '@/components/assistant/CameraCapture';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

type Stage = 'input' | 'editing' | 'processing' | 'result' | 'error';
type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

const DARK = {
  bg: '#1e293b',
  bgSecondary: '#0f172a',
  border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  success: '#10b981',
  error: '#ef4444',
  primary: '#3b82f6',
};

const LIGHT = {
  bg: '#ffffff',
  bgSecondary: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  success: '#059669',
  error: '#dc2626',
  primary: '#2563eb',
};

const OPENING_TEXT = 'Selecione a imagem para editar. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
const AUTO_CLOSE = 60;

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

// SVG Icons
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
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

const IconMic = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
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

function VoiceHint({ commands, isDark }: { commands: string[]; isDark: boolean }) {
  const colors = isDark ? DARK : LIGHT;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(249, 250, 251, 1)',
      color: colors.textMuted,
    }}>
      <IconMic />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {commands.map(cmd => (
          <span key={cmd} style={{
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '11px',
            backgroundColor: isDark ? 'rgba(51, 65, 85, 1)' : 'rgba(229, 231, 235, 1)',
            color: isDark ? 'rgba(147, 197, 253, 1)' : 'rgba(29, 78, 216, 1)',
          }}>
            {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}

// Função para aplicar filtros e transformações no canvas
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
  if (!ctx) throw new Error("Could not get canvas context");

  const scaleX = flip.horizontal ? -1 : 1;
  const scaleY = flip.vertical ? -1 : 1;
  
  const finalWidth = crop.width > 0 ? crop.width : image.naturalWidth;
  const finalHeight = crop.height > 0 ? crop.height : image.naturalHeight;

  canvas.width = finalWidth;
  canvas.height = finalHeight;

  ctx.translate(finalWidth / 2, finalHeight / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.scale(scaleX, scaleY);
  
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  
  const drawX = crop.width > 0 ? -crop.width / 2 : -image.naturalWidth / 2;
  const drawY = crop.height > 0 ? -crop.height / 2 : -image.naturalHeight / 2;
  
  ctx.drawImage(
    image,
    crop.x, 
    crop.y, 
    crop.width || image.naturalWidth, 
    crop.height || image.naturalHeight, 
    drawX, 
    drawY, 
    crop.width || image.naturalWidth, 
    crop.height || image.naturalHeight
  );

  return canvas;
}

export default function EditarImagemDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const colors = isDark ? DARK : LIGHT;
  
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [cameraTab, setCameraTab] = useState<Tab>('companion');
  
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
  const lastTabCommandRef = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    return () => {
      if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
    };
  }, []);

  // Auto-close timer
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

  // Falar apenas uma vez
  useEffect(() => {
    if (hasSpoken.current) return;
    hasSpoken.current = true;
    
    window.speechSynthesis?.cancel();
    playText(OPENING_TEXT).catch(() => {});
  }, []);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    setImageInfo({ width, height });

    const newCrop = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90, height: 90 },
        width / height,
        width,
        height
      ),
      width,
      height
    );
    setCrop(newCrop);
    setCompletedCrop(undefined);
  }, []);

  const handleCapture = useCallback(async (base64: string) => {
    try {
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      
      setImageSrc(url);
      setStage('editing');
      
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao processar imagem.');
      setStage('error');
    }
  }, []);

  const handleRotate = useCallback((degrees: number) => {
    setRotation(prev => (prev + degrees) % 360);
  }, []);

  const handleFlip = useCallback((direction: 'horizontal' | 'vertical') => {
    setFlip(prev => ({
      ...prev,
      [direction]: !prev[direction]
    }));
  }, []);

  const handleApplyCrop = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;
    setIsProcessing(true);

    try {
      const canvas = createFilteredCanvas(
        imgRef.current,
        completedCrop,
        brightness,
        contrast,
        saturation,
        rotation,
        flip
      );

      setImageSrc(canvas.toDataURL('image/png'));
      setImageInfo({ width: canvas.width, height: canvas.height });
      
      setCrop(undefined);
      setCompletedCrop(undefined);
      handleResetFilters();

    } catch (error) {
      setErrorMsg('Erro ao aplicar edições.');
      setStage('error');
    } finally {
      setIsProcessing(false);
    }
  }, [brightness, contrast, saturation, rotation, flip, completedCrop]);

  const handleSave = useCallback(async () => {
    if (!imgRef.current || !imageSrc) return;

    setStage('processing');

    try {
      const finalCrop = completedCrop || {
        x: 0,
        y: 0,
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
        unit: 'px' as const
      };

      const canvas = createFilteredCanvas(
        imgRef.current,
        finalCrop,
        brightness,
        contrast,
        saturation,
        rotation,
        flip
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Falha ao gerar imagem'));
        }, 'image/png');
      });

      const fileName = `editada_${Date.now()}.png`;

      // Converter para base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setResultBase64(base64);
        setResultBlob(blob);
        setResultFileName(fileName);
        setStage('result');
      };
      reader.readAsDataURL(blob);

      // Cobrar créditos
      await supabase.rpc('decrementar_creditos', {
        p_company_id: data.companyId,
        p_amount: 2
      });

    } catch (error) {
      setErrorMsg('Erro ao salvar imagem.');
      setStage('error');
    }
  }, [imageSrc, brightness, contrast, saturation, rotation, flip, completedCrop, data.companyId, supabase]);

  const handleResetFilters = useCallback(() => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setFlip({ horizontal: false, vertical: false });
  }, []);

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
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    handleResetFilters();
    setResultBlob(null);
    setErrorMsg(null);
  }, [handleResetFilters]);

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
    transform: `rotate(${rotation}deg) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`
  };

  // Voice commands
  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);
      
      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }
      
      if (stage === 'input') {
        const TAB_MAP: Record<string, Tab> = {
          celular: 'companion', qrcode: 'companion',
          webcam: 'webcam', computador: 'webcam',
          camera: 'mobile', arquivo: 'upload',
        };
        
        for (const [trigger, tab] of Object.entries(TAB_MAP)) {
          if (t.includes(trigger)) {
            if (lastTabCommandRef.current === tab) return;
            lastTabCommandRef.current = tab;
            setCameraTab(tab as Tab);
            if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
            tabCommandTimeoutRef.current = setTimeout(() => {
              lastTabCommandRef.current = null;
            }, 4000);
            return;
          }
        }
      }
      
      if (stage === 'editing') {
        if (['resetar', 'reset', 'limpar filtros'].some(c => t.includes(c))) {
          handleResetFilters(); return;
        }
        if (['salvar', 'finalizar', 'concluir'].some(c => t.includes(c))) {
          handleSave(); return;
        }
      }
      
      if (stage === 'result') {
        if (['baixar', 'download', 'salvar'].some(c => t.includes(c))) {
          handleDownload(); return;
        }
        if (['novo', 'nova', 'editar outra'].some(c => t.includes(c))) {
          handleReset(); return;
        }
      }
      
      if (stage === 'error') {
        if (['tentar', 'novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
      }
    }
  });

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: '16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: stage === 'editing' ? '900px' : (stage === 'result' ? '900px' : '600px'),
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        color: colors.text,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>🌐 Editar Imagem</h2>
          <button onClick={onClose} style={{
            padding: '6px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: colors.textMuted,
            cursor: 'pointer',
          }}>
            <IconX />
          </button>
        </div>

        {/* Input Stage */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CameraCapture
              onCapture={handleCapture}
              onCancel={onClose}
              theme={theme}
              companyId={data.companyId}
              instructions="Selecione a imagem para editar"
              acceptPdf={false}
              activeTab={cameraTab}
              onTabChange={setCameraTab}
            />
            <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* Editing Stage */}
        {stage === 'editing' && imageSrc && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div className="editing-container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              
              {/* Preview da imagem com crop */}
              <div style={{
                backgroundColor: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                {isProcessing && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: '8px',
                    zIndex: 10,
                  }}>
                    <IconLoader />
                  </div>
                )}
                
                <ReactCrop 
                  crop={crop} 
                  onChange={c => setCrop(c)} 
                  onComplete={c => setCompletedCrop(c)}
                  aspect={undefined}
                >
                  <img 
                    ref={imgRef} 
                    alt="Edição" 
                    src={imageSrc} 
                    style={{
                      ...filterStyle,
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      display: 'block',
                    }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>

              {/* Controles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Info */}
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                  fontSize: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: colors.textMuted }}>Dimensões:</span>
                    <span style={{ fontWeight: '500' }}>{imageInfo.width} × {imageInfo.height}px</span>
                  </div>
                </div>

                {/* Transformações */}
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', margin: 0 }}>
                    Transformações
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button onClick={() => handleRotate(-90)} style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.bg,
                      color: colors.text,
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}>
                      <IconRotate /> -90°
                    </button>
                    <button onClick={() => handleRotate(90)} style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.bg,
                      color: colors.text,
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}>
                      <IconRotate /> +90°
                    </button>
                    <button onClick={() => handleFlip('horizontal')} style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      backgroundColor: flip.horizontal ? colors.primary : colors.bg,
                      color: flip.horizontal ? 'white' : colors.text,
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}>
                      <IconFlipH /> Flip H
                    </button>
                    <button onClick={() => handleFlip('vertical')} style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      backgroundColor: flip.vertical ? colors.primary : colors.bg,
                      color: flip.vertical ? 'white' : colors.text,
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}>
                      <IconFlipV /> Flip V
                    </button>
                  </div>
                </div>

                {/* Ajustes */}
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', margin: 0 }}>
                    Ajustes
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: colors.textMuted, display: 'block', marginBottom: '4px' }}>
                        Brilho: {brightness}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: colors.textMuted, display: 'block', marginBottom: '4px' }}>
                        Contraste: {contrast}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: colors.textMuted, display: 'block', marginBottom: '4px' }}>
                        Saturação: {saturation}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={saturation}
                        onChange={(e) => setSaturation(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: `1px solid ${colors.border}` }}>
                  <button onClick={handleApplyCrop} disabled={!completedCrop || isProcessing} style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: completedCrop && !isProcessing ? colors.primary : colors.border,
                    color: 'white',
                    cursor: completedCrop && !isProcessing ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}>
                    <IconCrop /> Aplicar
                  </button>
                  <button onClick={handleResetFilters} style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg,
                    color: colors.text,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}>
                    Reset
                  </button>
                </div>

                <button onClick={handleSave} disabled={isProcessing} style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isProcessing ? colors.border : colors.success,
                  color: 'white',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}>
                  <IconDownload /> Salvar Edições
                </button>
              </div>
            </div>
            
            <VoiceHint commands={['"resetar"', '"salvar"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* Processing Stage */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 0' }}>
            <IconLoader />
            <p style={{ margin: 0, fontSize: '14px', color: colors.textMuted }}>Salvando edições...</p>
          </div>
        )}

        {/* Result Stage */}
        {stage === 'result' && resultBlob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${colors.success}`,
              color: colors.success,
              fontSize: '14px',
              fontWeight: '500',
            }}>
              <IconCheck />
              <span>Imagem editada com sucesso!</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.7 }}>
                {(resultBlob.size / 1024).toFixed(1)} KB
              </span>
            </div>

            <div style={{ 
              display: 'flex', 
              flexDirection: 'row',
              gap: '16px',
            }} className="result-container">
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px', 
                flex: 1,
                minWidth: 0
              }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                }}>
                  <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted }}>
                    Arquivo: <strong style={{ color: colors.text }}>{resultFileName}</strong>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.textMuted }}>
                    Formato: PNG
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleDownload} style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: colors.primary,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}>
                    <IconDownload /> Baixar
                  </button>
                  
                  <button onClick={handleReset} style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bgSecondary,
                    color: colors.text,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}>
                    <IconRefresh /> Nova
                  </button>
                </div>
              </div>

              <div className="qr-desktop" style={{ 
                display: 'none',
                flexShrink: 0,
                width: '224px',
              }}>
                <ResultDownloadQR
                  companyId={data.companyId}
                  fileName={resultFileName}
                  fileType={resultBlob.type}
                  fileBase64={resultBase64}
                  isDark={isDark}
                  enabled={stage === 'result' && !!resultBase64}
                />
              </div>
            </div>

            <div className="qr-mobile" style={{ display: 'block' }}>
              <ResultDownloadQR
                companyId={data.companyId}
                fileName={resultFileName}
                fileType={resultBlob.type}
                fileBase64={resultBase64}
                isDark={isDark}
                enabled={stage === 'result' && !!resultBase64}
              />
            </div>
            
            <VoiceHint commands={['"baixar"', '"nova"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* Error Stage */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${colors.error}`,
              color: colors.error,
              fontSize: '14px',
            }}>
              {errorMsg}
            </div>
            
            <button onClick={handleReset} style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: colors.error,
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              <IconRefresh /> Tentar Novamente
            </button>
          </div>
        )}
        
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .editing-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }
        
        .result-container {
          display: flex;
          flex-direction: row;
          gap: 16px;
        }
        
        @media (max-width: 768px) {
          .editing-container {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (max-width: 640px) {
          .result-container {
            flex-direction: column !important;
          }
          .qr-desktop {
            display: none !important;
          }
          .qr-mobile {
            display: block !important;
          }
        }
        
        @media (min-width: 641px) {
          .qr-desktop {
            display: flex !important;
            flex-direction: column;
          }
          .qr-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}