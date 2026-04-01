'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';
import CameraCapture from '@/components/assistant/CameraCapture';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

type Stage = 'input' | 'processing' | 'result' | 'error';
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

const OPENING_TEXT = 'Selecione a imagem para remover o fundo. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
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

const IconMagicWand = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5"></path>
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

let removeBackgroundModule: any = null;

export default function RemoverFundoDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const colors = isDark ? DARK : LIGHT;
  
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [cameraTab, setCameraTab] = useState<Tab>('companion');
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  
  const [resultFileName, setResultFileName] = useState<string>('');
  const [resultBase64, setResultBase64] = useState<string>('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  
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

  const loadRemoveBackgroundLib = async () => {
    if (removeBackgroundModule) return removeBackgroundModule;
    
    try {
      setProgressPercent(10);
      setProgressText('Carregando biblioteca de IA...');
      
      const module = await import('@imgly/background-removal');
      removeBackgroundModule = module.removeBackground;
      
      setProgressPercent(30);
      setProgressText('Biblioteca carregada!');
      
      return removeBackgroundModule;
    } catch (error) {
      console.error('Erro ao carregar biblioteca:', error);
      throw new Error('Biblioteca de remoção de fundo não disponível');
    }
  };

  const optimizeImageSize = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        let { width, height } = img;
        const maxDimension = 1000;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: file.lastModified
            });
            resolve(optimizedFile);
          } else {
            resolve(file);
          }
        }, file.type, 0.85);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCapture = useCallback(async (base64: string) => {
    try {
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/jpeg' });
      const file = new File([blob], 'imagem.jpg', { type: 'image/jpeg' });
      
      setOriginalFile(file);
      const url = URL.createObjectURL(blob);
      setOriginalImage(url);
      
      // Iniciar processamento automaticamente
      await handleRemoveBackground(file);
      
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao processar imagem.');
      setStage('error');
    }
  }, []);

  const handleRemoveBackground = useCallback(async (file: File) => {
    setStage('processing');
    setProgressPercent(5);
    setProgressText('Iniciando processamento...');

    try {
      const removeBackground = await loadRemoveBackgroundLib();
      
      setProgressPercent(40);
      setProgressText('Otimizando imagem...');
      
      const optimizedFile = await optimizeImageSize(file);
      
      setProgressPercent(50);
      setProgressText('Removendo fundo com IA... (isso pode levar até 40 segundos)');
      
      const resultBlob = await removeBackground(optimizedFile);
      
      setProgressPercent(90);
      setProgressText('Finalizando...');

      const processedUrl = URL.createObjectURL(resultBlob);
      setProcessedImage(processedUrl);
      setProcessedBlob(resultBlob);
      
      const fileName = file.name.replace(/\.[^/.]+$/, '') + '_sem_fundo.png';
      setResultFileName(fileName);
      
      // Converter para base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setResultBase64(base64);
        setProgressPercent(100);
        setStage('result');
      };
      reader.readAsDataURL(resultBlob);

      // Cobrar créditos
      await supabase.rpc('decrementar_creditos', {
        p_company_id: data.companyId,
        p_amount: 2
      });

    } catch (error: any) {
      console.error('Erro ao processar:', error);
      setErrorMsg(error.message || 'Falha ao processar imagem. Tente novamente.');
      setStage('error');
    }
  }, [data.companyId, supabase]);

  const handleDownload = useCallback(() => {
    if (!processedBlob || !resultFileName) return;
    
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultFileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [processedBlob, resultFileName]);

  const handleReset = useCallback(() => {
    setStage('input');
    setOriginalImage(null);
    setOriginalFile(null);
    setProcessedImage(null);
    setProcessedBlob(null);
    setResultFileName('');
    setResultBase64('');
    setErrorMsg(null);
    setProgressPercent(0);
    setProgressText('');
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
      
      if (stage === 'result') {
        if (['baixar', 'download', 'salvar'].some(c => t.includes(c))) {
          handleDownload(); return;
        }
        if (['novo', 'nova', 'outra imagem'].some(c => t.includes(c))) {
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
        maxWidth: stage === 'result' ? '1000px' : '600px',
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
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconMagicWand /> Remover Fundo com IA
          </h2>
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
              instructions="Selecione a imagem para remover o fundo"
              acceptPdf={false}
              activeTab={cameraTab}
              onTabChange={setCameraTab}
            />
            
            {/* Info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: colors.text }}>
                  IA Avançada
                </div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>
                  Machine learning para detecção precisa
                </div>
              </div>
              
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: colors.text }}>
                  Alta Qualidade
                </div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>
                  Bordas suaves e detalhes preservados
                </div>
              </div>
            </div>
            
            <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* Processing Stage */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '40px 20px' }}>
            <div style={{ position: 'relative' }}>
              <IconLoader />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: `4px solid ${colors.border}`,
                borderTopColor: colors.primary,
                animation: 'spin 1s linear infinite',
              }} />
            </div>
            
            <div style={{ textAlign: 'center', width: '100%' }}>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                {progressText}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted }}>
                Processando com inteligência artificial...
              </p>
            </div>
            
            <div style={{ width: '100%', maxWidth: '400px' }}>
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
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '13px', textAlign: 'center', color: colors.textMuted }}>
                {progressPercent}%
              </p>
            </div>
          </div>
        )}

        {/* Result Stage */}
        {stage === 'result' && processedImage && originalImage && (
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
              <span>Fundo removido com sucesso!</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.7 }}>
                {processedBlob ? (processedBlob.size / 1024).toFixed(1) : '0'} KB
              </span>
            </div>

            {/* Preview lado a lado */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }} className="preview-container">
              
              {/* Original */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', margin: '0 0 8px 0', color: colors.text }}>
                  Original
                </h3>
                <div style={{
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'white',
                }}>
                  <img src={originalImage} alt="Original" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>

              {/* Processada */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', margin: '0 0 8px 0', color: colors.text }}>
                  Fundo Removido
                </h3>
                <div 
                  style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: `1px solid ${colors.border}`,
                    backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
                >
                  <img src={processedImage} alt="Processada" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>

            {/* Botões e QR Code */}
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
                    Formato: PNG transparente
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
                    <IconDownload /> Baixar PNG
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
                  fileType="image/png"
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
                fileType="image/png"
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
        
        .preview-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .result-container {
          display: flex;
          flex-direction: row;
          gap: 16px;
        }
        
        @media (max-width: 768px) {
          .preview-container {
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