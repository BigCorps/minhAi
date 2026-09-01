'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';
import CameraCapture from '@/components/assistant/CameraCapture';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';
import { PDFDocument } from 'pdf-lib';

type Stage = 'input' | 'organizing' | 'processing' | 'result' | 'error';
type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';

interface PdfFile {
  id: string;
  name: string;
  base64: string;
  pageCount: number;
  size: number;
}

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

const OPENING_TEXT = 'Selecione os arquivos PDF para juntar. Você pode enviar múltiplos arquivos. Diga: celular, arquivo ou fechar.';
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

const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const IconGripVertical = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="5" r="1"></circle>
    <circle cx="9" cy="12" r="1"></circle>
    <circle cx="9" cy="19" r="1"></circle>
    <circle cx="15" cy="5" r="1"></circle>
    <circle cx="15" cy="12" r="1"></circle>
    <circle cx="15" cy="19" r="1"></circle>
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
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

export default function JuntarPdfsDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const colors = isDark ? DARK : LIGHT;
  
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [cameraTab, setCameraTab] = useState<Tab>('companion');
  
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
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

  const handleCapture = useCallback(async (base64: string, fileInfo?: { name?: string }) => {
    try {
      // Verificar se é PDF
      if (!base64.startsWith('JVBERi')) {
        throw new Error('Apenas arquivos PDF são suportados');
      }

      // Contar páginas
      const pdfBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      const newPdf: PdfFile = {
        id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: fileInfo?.name || `documento_${pdfFiles.length + 1}.pdf`,
        base64,
        pageCount,
        size: base64.length,
      };

      setPdfFiles(prev => [...prev, newPdf]);
      
      // Se já tem PDFs, vai direto para organizing
      if (pdfFiles.length > 0 || stage === 'organizing') {
        setStage('organizing');
      }
      
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao processar PDF.');
      setStage('error');
    }
  }, [pdfFiles.length, stage]);

  const handleRemovePdf = useCallback((id: string) => {
    setPdfFiles(prev => prev.filter(pdf => pdf.id !== id));
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...pdfFiles];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);

    setPdfFiles(newFiles);
    setDraggedIndex(index);
  }, [draggedIndex, pdfFiles]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleMergePdfs = useCallback(async () => {
    if (pdfFiles.length < 2) {
      setErrorMsg('Adicione pelo menos 2 PDFs para juntar.');
      setStage('error');
      return;
    }

    setStage('processing');
    setProgressPercent(10);
    setProgressText('Iniciando mesclagem...');

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < pdfFiles.length; i++) {
        setProgressPercent(10 + (i / pdfFiles.length) * 70);
        setProgressText(`Processando PDF ${i + 1} de ${pdfFiles.length}...`);

        const pdfBytes = Uint8Array.from(atob(pdfFiles[i].base64), c => c.charCodeAt(0));
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }

      setProgressPercent(85);
      setProgressText('Gerando PDF final...');

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const fileName = `pdfs_unidos_${Date.now()}.pdf`;

      // Converter para base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setResultBase64(base64);
        setResultBlob(blob);
        setResultFileName(fileName);
        setProgressPercent(100);
        setStage('result');
      };
      reader.readAsDataURL(blob);

      // Cobrar créditos
      await supabase.rpc('decrementar_creditos', {
        p_company_id: data.companyId,
        p_amount: 2
      });

    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao juntar PDFs.');
      setStage('error');
    }
  }, [pdfFiles, data.companyId, supabase]);

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
    setPdfFiles([]);
    setResultBlob(null);
    setErrorMsg(null);
  }, []);

  const totalPages = pdfFiles.reduce((sum, pdf) => sum + pdf.pageCount, 0);
  const totalSize = pdfFiles.reduce((sum, pdf) => sum + pdf.size, 0);

  // Voice commands
  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);
      
      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }
      
      if (stage === 'input' || stage === 'organizing') {
        const TAB_MAP: Record<string, Tab> = {
          celular: 'companion', qrcode: 'companion',
          arquivo: 'upload', upload: 'upload',
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

        if (['juntar', 'mesclar', 'unir', 'processar'].some(c => t.includes(c))) {
          handleMergePdfs(); return;
        }
      }
      
      if (stage === 'result') {
        if (['baixar', 'download', 'salvar'].some(c => t.includes(c))) {
          handleDownload(); return;
        }
        if (['novo', 'nova', 'outros pdfs'].some(c => t.includes(c))) {
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
        maxWidth: stage === 'organizing' ? '700px' : (stage === 'result' ? '900px' : '600px'),
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
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>🌐 Juntar PDFs</h2>
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
              instructions="Selecione os PDFs para juntar (pode enviar múltiplos)"
              acceptPdf={true}
              activeTab={cameraTab}
              onTabChange={setCameraTab}
            />
            
            {pdfFiles.length > 0 && (
              <button
                onClick={() => setStage('organizing')}
                style={{
                  padding: '12px',
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
                }}
              >
                Continuar ({pdfFiles.length} PDF{pdfFiles.length > 1 ? 's' : ''})
              </button>
            )}
            
            <VoiceHint commands={['"celular"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* Organizing Stage */}
        {stage === 'organizing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Info */}
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              fontSize: '13px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>PDFs</div>
                <div style={{ fontWeight: '600', color: colors.text }}>{pdfFiles.length}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>Total Páginas</div>
                <div style={{ fontWeight: '600', color: colors.text }}>{totalPages}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>Tamanho</div>
                <div style={{ fontWeight: '600', color: colors.text }}>
                  {(totalSize / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            </div>

            {/* Lista de PDFs (drag & drop) */}
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>
                  Ordem dos PDFs (arraste para reordenar)
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pdfFiles.map((pdf, index) => (
                  <div
                    key={pdf.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      backgroundColor: draggedIndex === index ? 'rgba(59, 130, 246, 0.1)' : colors.bg,
                      cursor: 'move',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <IconGripVertical />
                    
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '4px',
                      backgroundColor: colors.primary,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0,
                    }}>
                      {index + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: '500',
                        color: colors.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {pdf.name}
                      </div>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>
                        {pdf.pageCount} página{pdf.pageCount > 1 ? 's' : ''}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemovePdf(pdf.id)}
                      style={{
                        padding: '6px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: colors.error,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão adicionar mais */}
            <button
              onClick={() => setStage('input')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: `1px dashed ${colors.border}`,
                backgroundColor: 'transparent',
                color: colors.text,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <IconPlus /> Adicionar mais PDFs
            </button>

            {/* Botão juntar */}
            <button
              onClick={handleMergePdfs}
              disabled={pdfFiles.length < 2}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: pdfFiles.length >= 2 ? colors.success : colors.border,
                color: 'white',
                cursor: pdfFiles.length >= 2 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <IconDownload /> Juntar {pdfFiles.length} PDF{pdfFiles.length > 1 ? 's' : ''}
            </button>
            
            <VoiceHint commands={['"juntar"', '"adicionar mais"', '"fechar"']} isDark={isDark} />
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
              <span>PDFs unidos com sucesso!</span>
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
                    {pdfFiles.length} PDFs unidos · {totalPages} páginas
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