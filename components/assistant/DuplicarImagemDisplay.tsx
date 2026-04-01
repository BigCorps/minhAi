'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';
import CameraCapture from '@/components/assistant/CameraCapture';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

declare global {
  interface Window {
    jspdf?: any;
  }
}

type Stage = 'input' | 'configuring' | 'processing' | 'result' | 'error';
type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';
type Preset = 'grid_2x2' | 'grid_3x3' | 'grid_4x4' | 'a4_completo' | 'custom';

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

const OPENING_TEXT = 'Selecione a imagem para duplicar. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
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

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M12 1v6m0 6v6m-9-9h6m6 0h6"></path>
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

// Presets de configuração
const PRESETS: Record<Preset, { name: string; desc: string; cols: number; rows: number; size: number; spacing: number }> = {
  grid_2x2: { name: 'Grid 2×2', desc: '4 imagens', cols: 2, rows: 2, size: 8, spacing: 1 },
  grid_3x3: { name: 'Grid 3×3', desc: '9 imagens', cols: 3, rows: 3, size: 5.5, spacing: 0.8 },
  grid_4x4: { name: 'Grid 4×4', desc: '16 imagens', cols: 4, rows: 4, size: 4, spacing: 0.5 },
  a4_completo: { name: 'A4 Completo', desc: 'Máximo possível', cols: 0, rows: 0, size: 3, spacing: 0.5 },
  custom: { name: 'Avançado', desc: 'Personalizado', cols: 3, rows: 3, size: 5, spacing: 1 },
};

export default function DuplicarImagemDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const colors = isDark ? DARK : LIGHT;
  
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [cameraTab, setCameraTab] = useState<Tab>('companion');
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
  
  const [selectedPreset, setSelectedPreset] = useState<Preset>('grid_3x3');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Configurações avançadas
  const [maxSize, setMaxSize] = useState(5.5);
  const [spacing, setSpacing] = useState(0.8);
  const [borderWidth, setBorderWidth] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [manualCols, setManualCols] = useState(3);
  const [manualRows, setManualRows] = useState(3);
  
  const [layoutInfo, setLayoutInfo] = useState({
    finalWidth: 0,
    finalHeight: 0,
    perRow: 0,
    perColumn: 0,
    totalImages: 0,
    usedArea: 0
  });
  
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');
  const [resultBase64, setResultBase64] = useState<string>('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  
  const scriptsLoaded = useRef(false);
  const hasSpoken = useRef(false);
  const lastTabCommandRef = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const supabase = createClient();

  // Carregar jsPDF
  useEffect(() => {
    if (scriptsLoaded.current) return;
    scriptsLoaded.current = true;

    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.async = true;
    document.body.appendChild(script);

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

  // Calcular layout quando configurações mudarem
  useEffect(() => {
    if (!originalImage) return;
    
    let workingAspectRatio = imageAspectRatio;
    if (rotation === 90 || rotation === 270) {
      workingAspectRatio = 1 / imageAspectRatio;
    }
    
    const finalHeight = maxSize;
    const finalWidth = maxSize * workingAspectRatio;
    
    const spacingCm = spacing / 10;
    const availableWidth = 19;
    const availableHeight = 27.7;
    
    let perRow, perColumn;
    
    if (selectedPreset === 'custom' && showAdvanced) {
      perRow = manualCols;
      perColumn = manualRows;
      
      const maxCols = Math.floor((availableWidth + spacingCm) / (finalWidth + spacingCm));
      const maxRows = Math.floor((availableHeight + spacingCm) / (finalHeight + spacingCm));
      
      if (perRow > maxCols) perRow = maxCols;
      if (perColumn > maxRows) perColumn = maxRows;
    } else {
      const widthWithSpacing = finalWidth + spacingCm;
      const heightWithSpacing = finalHeight + spacingCm;
      
      perRow = Math.floor((availableWidth + spacingCm) / widthWithSpacing);
      perColumn = Math.floor((availableHeight + spacingCm) / heightWithSpacing);
    }
    
    const totalImages = perRow * perColumn;
    const usedWidth = (perRow * finalWidth) + ((perRow - 1) * spacingCm);
    const usedHeight = (perColumn * finalHeight) + ((perColumn - 1) * spacingCm);
    const usedPercentage = ((usedWidth * usedHeight) / (availableWidth * availableHeight) * 100);
    
    setLayoutInfo({
      finalWidth,
      finalHeight,
      perRow,
      perColumn,
      totalImages,
      usedArea: usedPercentage
    });
  }, [originalImage, maxSize, spacing, rotation, selectedPreset, showAdvanced, manualCols, manualRows, imageAspectRatio]);

  const handleCapture = useCallback(async (base64: string) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setOriginalImage(imageDataUrl);
        setImageAspectRatio(img.width / img.height);
        setStage('configuring');
      };
      
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/jpeg' });
      img.src = URL.createObjectURL(blob);
      
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao processar imagem.');
      setStage('error');
    }
  }, []);

  const handleSelectPreset = useCallback((preset: Preset) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setShowAdvanced(true);
    } else {
      setShowAdvanced(false);
      const config = PRESETS[preset];
      setMaxSize(config.size);
      setSpacing(config.spacing);
      if (preset !== 'a4_completo') {
        setManualCols(config.cols);
        setManualRows(config.rows);
      }
    }
  }, []);

  const handleGeneratePDF = useCallback(async () => {
    if (!originalImage || layoutInfo.totalImages === 0) {
      setErrorMsg('Configure o layout corretamente.');
      setStage('error');
      return;
    }

    setStage('processing');
    setProgressPercent(20);
    setProgressText('Gerando PDF...');

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('portrait', 'cm', 'a4');
      
      const borderWidthCm = borderWidth / 10;
      const spacingCm = spacing / 10;
      const marginX = 1;
      const marginY = 1;

      setProgressPercent(40);
      setProgressText(`Adicionando ${layoutInfo.totalImages} imagens...`);

      for (let row = 0; row < layoutInfo.perColumn; row++) {
        for (let col = 0; col < layoutInfo.perRow; col++) {
          const x = marginX + (col * (layoutInfo.finalWidth + spacingCm));
          const y = marginY + (row * (layoutInfo.finalHeight + spacingCm));

          if (borderWidthCm > 0) {
            doc.setDrawColor('#000000');
            doc.setLineWidth(borderWidthCm);
            doc.rect(x, y, layoutInfo.finalWidth, layoutInfo.finalHeight);
          }

          doc.addImage(originalImage, 'JPEG', x, y, layoutInfo.finalWidth, layoutInfo.finalHeight);
          
          const progress = 40 + ((row * layoutInfo.perRow + col + 1) / layoutInfo.totalImages) * 50;
          setProgressPercent(progress);
        }
      }

      setProgressPercent(95);
      setProgressText('Finalizando PDF...');

      const pdfBlob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
      const fileName = `duplicador_${layoutInfo.perRow}x${layoutInfo.perColumn}_${Date.now()}.pdf`;

      // Converter para base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setResultBase64(base64);
        setResultBlob(pdfBlob);
        setResultFileName(fileName);
        setProgressPercent(100);
        setStage('result');
      };
      reader.readAsDataURL(pdfBlob);

      // Cobrar créditos
      await supabase.rpc('decrementar_creditos', {
        p_company_id: data.companyId,
        p_amount: 2
      });

    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao gerar PDF.');
      setStage('error');
    }
  }, [originalImage, layoutInfo, borderWidth, spacing, data.companyId, supabase]);

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
    setOriginalImage(null);
    setSelectedPreset('grid_3x3');
    setShowAdvanced(false);
    setResultBlob(null);
    setErrorMsg(null);
  }, []);

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
      
      if (stage === 'configuring') {
        if (t.includes('2x2') || t.includes('dois por dois')) {
          handleSelectPreset('grid_2x2'); return;
        }
        if (t.includes('3x3') || t.includes('tres por tres')) {
          handleSelectPreset('grid_3x3'); return;
        }
        if (t.includes('4x4') || t.includes('quatro por quatro')) {
          handleSelectPreset('grid_4x4'); return;
        }
        if (t.includes('a4 completo') || t.includes('maximo')) {
          handleSelectPreset('a4_completo'); return;
        }
        if (t.includes('avancado') || t.includes('personalizado')) {
          handleSelectPreset('custom'); return;
        }
        if (['gerar', 'criar', 'processar', 'fazer pdf'].some(c => t.includes(c))) {
          handleGeneratePDF(); return;
        }
      }
      
      if (stage === 'result') {
        if (['baixar', 'download', 'salvar'].some(c => t.includes(c))) {
          handleDownload(); return;
        }
        if (['novo', 'nova', 'outro'].some(c => t.includes(c))) {
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
        maxWidth: stage === 'configuring' ? '700px' : (stage === 'result' ? '900px' : '600px'),
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
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>🌐 Duplicar Imagem</h2>
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
              instructions="Selecione a imagem para duplicar"
              acceptPdf={false}
              activeTab={cameraTab}
              onTabChange={setCameraTab}
            />
            <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* Configuring Stage */}
        {stage === 'configuring' && originalImage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Preview da imagem */}
            <div style={{ textAlign: 'center' }}>
              <img src={originalImage} alt="Preview" style={{ 
                maxWidth: '200px', 
                maxHeight: '150px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`
              }} />
            </div>

            {/* Presets */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Escolha o layout:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                {(Object.keys(PRESETS) as Preset[]).map(preset => (
                  <button
                    key={preset}
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: selectedPreset === preset ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      backgroundColor: selectedPreset === preset ? 'rgba(59, 130, 246, 0.1)' : colors.bgSecondary,
                      color: colors.text,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      textAlign: 'center',
                    }}
                  >
                    {PRESETS[preset].name}
                    <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
                      {PRESETS[preset].desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configurações Avançadas */}
            {showAdvanced && (
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <IconSettings />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Configurações Avançadas</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: colors.textMuted }}>
                      Tamanho (cm): {maxSize.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      step="0.5"
                      value={maxSize}
                      onChange={(e) => setMaxSize(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: colors.textMuted }}>
                      Espaçamento (mm): {spacing.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={spacing}
                      onChange={(e) => setSpacing(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: colors.textMuted }}>
                      Colunas: {manualCols}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={manualCols}
                      onChange={(e) => setManualCols(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: colors.textMuted }}>
                      Linhas: {manualRows}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={manualRows}
                      onChange={(e) => setManualRows(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Info do Layout */}
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              fontSize: '13px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>Tamanho</div>
                <div style={{ fontWeight: '600', color: colors.text }}>
                  {layoutInfo.finalWidth.toFixed(1)} × {layoutInfo.finalHeight.toFixed(1)}cm
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>Grid</div>
                <div style={{ fontWeight: '600', color: colors.text }}>
                  {layoutInfo.perRow} × {layoutInfo.perColumn}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>Total</div>
                <div style={{ fontWeight: '600', color: colors.text }}>
                  {layoutInfo.totalImages}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>Área</div>
                <div style={{ fontWeight: '600', color: colors.text }}>
                  {layoutInfo.usedArea.toFixed(1)}%
                </div>
              </div>
            </div>

            <button
              onClick={handleGeneratePDF}
              disabled={layoutInfo.totalImages === 0}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: layoutInfo.totalImages > 0 ? colors.primary : colors.border,
                color: 'white',
                cursor: layoutInfo.totalImages > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <IconDownload /> Gerar PDF para Impressão
            </button>
            
            <VoiceHint commands={['"2x2"', '"3x3"', '"4x4"', '"gerar"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* Processing Stage */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 0' }}>
            <IconLoader />
            <p style={{ margin: 0, fontSize: '14px', color: colors.textMuted }}>{progressText}</p>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: colors.bgSecondary,
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: colors.primary,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: colors.textMuted }}>{progressPercent}%</p>
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
              <span>PDF gerado com sucesso!</span>
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
                    {layoutInfo.totalImages} imagens em grid {layoutInfo.perRow}×{layoutInfo.perColumn}
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
                    <IconDownload /> Baixar PDF
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
                    <IconRefresh /> Novo
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
            
            <VoiceHint commands={['"baixar"', '"novo"', '"fechar"']} isDark={isDark} />
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
        
        .result-container {
          display: flex;
          flex-direction: row;
          gap: 16px;
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