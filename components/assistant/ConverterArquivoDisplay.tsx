'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createClient } from '@/lib/supabase-browser';
import CameraCapture from '@/components/assistant/CameraCapture';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

// Declarações globais para bibliotecas carregadas dinamicamente
declare global {
  interface Window {
    jspdf?: any;
    pdfjsLib?: any;
    JSZip?: any;
    mammoth?: any;
    XLSX?: any;
  }
}

type Stage = 'input' | 'selecting_format' | 'processing' | 'result' | 'error';
type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

// Paletas de cores (inline styles para evitar Tailwind dinâmico)
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

const OPENING_TEXT = 'Selecione o arquivo para converter. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
const AUTO_CLOSE = 60;

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

// SVG Icons inline
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
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

// Formatos disponíveis por categoria
const FORMAT_SUPPORT: Record<string, { name: string; desc: string }> = {
  jpg: { name: 'JPEG', desc: 'Comprimido' },
  png: { name: 'PNG', desc: 'Transparência' },
  webp: { name: 'WebP', desc: 'Moderno' },
  pdf: { name: 'PDF', desc: 'Documento' },
  txt: { name: 'TXT', desc: 'Texto' },
};

export default function ConverterArquivoDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const colors = isDark ? DARK : LIGHT;
  
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [cameraTab, setCameraTab] = useState<Tab>('companion');
  
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalExtension, setOriginalExtension] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);
  
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');
  const [resultBase64, setResultBase64] = useState<string>('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  
  const scriptsLoaded = useRef(false);
  const lastTabCommandRef = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const supabase = createClient();

  // Carregar bibliotecas externas
  useEffect(() => {
    if (scriptsLoaded.current) return;
    scriptsLoaded.current = true;

    const scripts = [
      { src: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", name: 'jspdf' },
      { src: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", name: 'pdfjsLib' },
      { src: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", name: 'JSZip' },
      { src: "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js", name: 'mammoth' },
      { src: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", name: 'XLSX' },
    ];

    let loaded = 0;
    scripts.forEach(({ src, name }) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        loaded++;
        if (loaded === scripts.length && window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.js';
        }
      };
      document.body.appendChild(script);
    });

    return () => {
      if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
    };
  }, []);

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

  // Falar texto de abertura
  useEffect(() => {
    window.speechSynthesis?.cancel();
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  // Detectar arquivo e formatos disponíveis
  const handleCapture = useCallback(async (base64: string) => {
    try {
      // Detectar tipo de arquivo
      const isPdf = base64.startsWith('JVBERi');
      const isImage = base64.startsWith('/9j/') || base64.startsWith('iVBORw') || base64.startsWith('UklGR');
      
      let extension = '';
      let formats: string[] = [];
      
      if (isPdf) {
        extension = 'pdf';
        formats = ['jpg', 'png', 'webp'];
      } else if (isImage) {
        // Detectar formato da imagem
        if (base64.startsWith('/9j/')) extension = 'jpg';
        else if (base64.startsWith('iVBORw')) extension = 'png';
        else if (base64.startsWith('UklGR')) extension = 'webp';
        else extension = 'jpg';
        
        formats = ['jpg', 'png', 'webp', 'pdf'].filter(f => f !== extension);
      } else {
        throw new Error('Formato de arquivo não suportado');
      }
      
      // Criar File object
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const mimeType = isPdf ? 'application/pdf' : `image/${extension}`;
      const blob = new Blob([ab], { type: mimeType });
      const file = new File([blob], `arquivo.${extension}`, { type: mimeType });
      
      setOriginalFile(file);
      setOriginalExtension(extension);
      setAvailableFormats(formats);
      setStage('selecting_format');
      
      playText(`Arquivo ${extension.toUpperCase()} detectado. Para qual formato deseja converter?`).catch(() => {});
      
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao processar arquivo.');
      setStage('error');
    }
  }, [playText]);

  // Conversões
  const convertImageToImage = async (file: File, targetFormat: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setProgressPercent(60);
        setProgressText('Convertendo imagem...');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas não suportado'));
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (targetFormat === 'jpg') {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        
        const mimeType = `image/${targetFormat === 'jpg' ? 'jpeg' : targetFormat}`;
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao gerar imagem'));
        }, mimeType, 0.85);
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.src = URL.createObjectURL(file);
    });
  };

  const convertImageToPDF = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setProgressPercent(60);
        setProgressText('Gerando PDF...');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas não suportado'));
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height]
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        pdf.addImage(imgData, 'JPEG', 0, 0, img.width, img.height);
        
        const pdfBlob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
        setProgressPercent(90);
        resolve(pdfBlob);
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.src = URL.createObjectURL(file);
    });
  };

  const convertPDFToImages = async (file: File, targetFormat: string): Promise<Blob> => {
    try {
      setProgressPercent(30);
      setProgressText('Lendo PDF...');
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      
      if (numPages === 1) {
        // Uma página só - retornar imagem única
        const page = await pdf.getPage(1);
        const scale = 2.0;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        setProgressPercent(60);
        setProgressText('Renderizando página...');
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        return new Promise((resolve, reject) => {
          const mimeType = `image/${targetFormat === 'jpg' ? 'jpeg' : targetFormat}`;
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Falha ao gerar imagem'));
          }, mimeType, 0.85);
        });
        
      } else {
        // Múltiplas páginas - retornar ZIP
        setProgressPercent(40);
        setProgressText(`Convertendo ${numPages} páginas...`);
        
        const zip = new window.JSZip();
        const scale = 2.0;
        
        for (let pageNum = 1; pageNum <= Math.min(numPages, 20); pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport }).promise;
          
          const mimeType = `image/${targetFormat === 'jpg' ? 'jpeg' : targetFormat}`;
          const blob = await new Promise<Blob>((res, rej) => {
            canvas.toBlob((b) => b ? res(b) : rej(new Error('Falha')), mimeType, 0.85);
          });
          
          zip.file(`pagina_${pageNum}.${targetFormat}`, blob);
          setProgressPercent(40 + (pageNum / Math.min(numPages, 20)) * 50);
          setProgressText(`Página ${pageNum}/${Math.min(numPages, 20)}...`);
        }
        
        setProgressPercent(95);
        setProgressText('Criando arquivo ZIP...');
        return await zip.generateAsync({ type: 'blob' });
      }
      
    } catch (error) {
      throw new Error('Erro ao processar PDF');
    }
  };

  const handleConvert = useCallback(async () => {
    if (!originalFile || !selectedFormat) return;
    
    setStage('processing');
    setProgressPercent(10);
    setProgressText('Iniciando conversão...');
    
    try {
      let blob: Blob;
      let filename: string;
      
      const isMultiPagePDF = originalExtension === 'pdf' && originalFile.size > 100000; // Assume multi-page se > 100KB
      
      if (originalExtension !== 'pdf' && selectedFormat === 'pdf') {
        // Imagem → PDF
        blob = await convertImageToPDF(originalFile);
        filename = originalFile.name.replace(/\.[^/.]+$/, '.pdf');
        
      } else if (originalExtension === 'pdf' && ['jpg', 'png', 'webp'].includes(selectedFormat)) {
        // PDF → Imagem(ns)
        blob = await convertPDFToImages(originalFile, selectedFormat);
        
        if (blob.type === 'application/zip') {
          filename = originalFile.name.replace(/\.pdf$/i, '.zip');
        } else {
          filename = originalFile.name.replace(/\.pdf$/i, `.${selectedFormat}`);
        }
        
      } else {
        // Imagem → Imagem
        blob = await convertImageToImage(originalFile, selectedFormat);
        filename = originalFile.name.replace(/\.[^/.]+$/, `.${selectedFormat}`);
      }
      
      // Converter para base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setResultBase64(base64);
        setResultBlob(blob);
        setResultFileName(filename);
        setProgressPercent(100);
        setStage('result');
        
        playText(`Arquivo convertido com sucesso para ${selectedFormat.toUpperCase()}.`).catch(() => {});
      };
      reader.readAsDataURL(blob);
      
      // Cobrar créditos
      await supabase.rpc('decrementar_creditos', {
        p_company_id: data.companyId,
        p_amount: 2
      });
      
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro na conversão.');
      setStage('error');
      playText('Erro ao converter arquivo.').catch(() => {});
    }
  }, [originalFile, selectedFormat, originalExtension, data.companyId, supabase, playText]);

  const handleDownload = useCallback(() => {
    if (!resultBlob || !resultFileName) return;
    
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultFileName;
    a.click();
    URL.revokeObjectURL(url);
    
    playText('Download iniciado.').catch(() => {});
  }, [resultBlob, resultFileName, playText]);

  const handleReset = useCallback(() => {
    setStage('input');
    setOriginalFile(null);
    setSelectedFormat(null);
    setResultBlob(null);
    setErrorMsg(null);
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

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
          celular: 'companion', qrcode: 'companion', 'qr code': 'companion',
          webcam: 'webcam', computador: 'webcam',
          camera: 'mobile', camara: 'mobile',
          arquivo: 'upload', upload: 'upload', galeria: 'upload',
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
      
      if (stage === 'selecting_format') {
        const formatMap: Record<string, string> = {
          'jpg': 'jpg', 'jpeg': 'jpg', 'jota pe ge': 'jpg',
          'png': 'png', 'pe ene ge': 'png',
          'webp': 'webp', 'web pe': 'webp',
          'pdf': 'pdf', 'pe de efe': 'pdf',
        };
        
        for (const [trigger, format] of Object.entries(formatMap)) {
          if (t.includes(trigger) && availableFormats.includes(format)) {
            setSelectedFormat(format);
            playText(`Formato ${format.toUpperCase()} selecionado. Diga converter para iniciar.`).catch(() => {});
            return;
          }
        }
        
        if (['converter', 'iniciar', 'comecar', 'processar'].some(c => t.includes(c))) {
          if (selectedFormat) handleConvert();
          return;
        }
      }
      
      if (stage === 'result') {
        if (['baixar', 'download', 'salvar'].some(c => t.includes(c))) {
          handleDownload(); return;
        }
        if (['novo', 'nova', 'outro arquivo'].some(c => t.includes(c))) {
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
        maxWidth: stage === 'result' ? '900px' : '600px',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        color: colors.text,
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>🌐 Converter Arquivos</h2>
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
              instructions="Selecione o arquivo para converter"
              acceptPdf={true}
              activeTab={cameraTab}
              onTabChange={setCameraTab}
            />
            <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* Selecting Format Stage */}
        {stage === 'selecting_format' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: colors.textMuted }}>
                Arquivo: <strong style={{ color: colors.text }}>{originalExtension.toUpperCase()}</strong>
              </p>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Converter para:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                {availableFormats.map(format => (
                  <button
                    key={format}
                    onClick={() => {
                      setSelectedFormat(format);
                      playText(`Formato ${format.toUpperCase()} selecionado.`).catch(() => {});
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: selectedFormat === format ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      backgroundColor: selectedFormat === format ? 'rgba(59, 130, 246, 0.1)' : colors.bgSecondary,
                      color: colors.text,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      textAlign: 'center',
                    }}
                  >
                    {FORMAT_SUPPORT[format]?.name || format.toUpperCase()}
                    <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
                      {FORMAT_SUPPORT[format]?.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleConvert}
              disabled={!selectedFormat}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: selectedFormat ? colors.primary : colors.border,
                color: 'white',
                cursor: selectedFormat ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              Converter
            </button>
            
            <VoiceHint commands={['"jpg"', '"png"', '"pdf"', '"converter"', '"fechar"']} isDark={isDark} />
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
              <span>Conversão concluída!</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.7 }}>
                Fecha em {timeLeft}s
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                    Tamanho: {(resultBlob.size / 1024).toFixed(1)} KB
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
                    <IconRefresh /> Novo
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'none', '@media (min-width: 640px)': { display: 'block' } }}>
                <ResultDownloadQR
                  companyId={data.companyId}
                  fileName={resultFileName}
                  fileType={resultBlob.type}
                  fileBase64={resultBase64}
                  isDark={isDark}
                  enabled={true}
                />
              </div>
            </div>
            
            <div style={{ display: 'block', '@media (min-width: 640px)': { display: 'none' } }}>
              <ResultDownloadQR
                companyId={data.companyId}
                fileName={resultFileName}
                fileType={resultBlob.type}
                fileBase64={resultBase64}
                isDark={isDark}
                enabled={true}
              />
            </div>
            
            <VoiceHint commands={['"baixar"', '"novo arquivo"', '"fechar"']} isDark={isDark} />
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
    </div>,
    document.body
  );
}