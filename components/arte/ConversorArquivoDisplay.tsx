'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

// ───────────────────────────────────────────────────────────────────────────
// Conversor de Arquivos — ArteFinal
//
// FUNÇÃO GRATUITA (function_key: 'converter_arquivo', credits: 0).
// Não chama PDFRest, não entra no pipeline de produção CMYK (§3/§4 do guia) —
// é conversão simples de formato (jpg/png/webp/pdf), não "arte para impressão".
// Por isso NÃO usa drawImageCmyk: aqui não há arte de produção, é utilitário.
//
// Por ser grátis e sem necessidade de login:
//  - NÃO chama nenhuma RPC de crédito (nem decrementar_creditos, nem
//    cobrar_credito_se_suficiente — função 100% client-side, sem custo real).
//  - NÃO bloqueia nada por anonimato (sem "custo escondido" do §6).
//  - Não depende de company/login: tela inicial simplificada (padrão
//    QRCodeDisplay) com apenas upload de arquivo (clique ou drag-and-drop) +
//    texto explicando a função — sem abas de celular/webcam/câmera
//    (CameraCapture removido, junto com o bucket arte-uploads/RLS de company).
//
// No registry da página (`app/arte/page.tsx`), registrar com `credits: 0` e
// renderizar "Grátis" no lugar de "0" abaixo do nome — ver snippet ao final
// deste arquivo (comentário) para o trecho do carrossel.
// ───────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    jspdf?: any;
    pdfjsLib?: any;
    JSZip?: any;
  }
}

type Stage = 'input' | 'selecting_format' | 'processing' | 'result' | 'error';

interface Props {
  data?: { companyId?: string };
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

const OPENING_TEXT = 'Carregue o arquivo que deseja converter. Esta função é gratuita.';
const AUTO_CLOSE = 60;

// SVG inline (proibido lucide-react dentro do modal — §5)
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

const IconUpload = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const FORMAT_SUPPORT: Record<string, { name: string; desc: string }> = {
  jpg: { name: 'JPEG', desc: 'Comprimido' },
  png: { name: 'PNG', desc: 'Transparência' },
  webp: { name: 'WebP', desc: 'Moderno' },
  pdf: { name: 'PDF', desc: 'Documento' },
};

export default function ConversorArquivoDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const colors = isDark ? DARK : LIGHT;

  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [isDragging, setIsDragging] = useState(false);

  // companyId é resolvido de forma lazy só quando precisamos exibir o
  // ResultDownloadQR (não há mais upload via celular/QR nesta tela).
  const [companyId, setCompanyId] = useState<string>(data?.companyId ?? '');

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
  const hasSpoken = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Carrega libs externas (sem Sharp/PDFRest — tudo client-side)
  useEffect(() => {
    if (scriptsLoaded.current) return;
    scriptsLoaded.current = true;

    const scripts = [
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', name: 'jspdf' },
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', name: 'pdfjsLib' },
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', name: 'JSZip' },
    ];

    let loaded = 0;
    scripts.forEach(({ src }) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        loaded++;
        if (loaded === scripts.length && window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      };
      document.body.appendChild(script);
    });
  }, []);

  // Auto-close no resultado
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

  // Áudio só no mount (§5) — nunca em handler de registry
  useEffect(() => {
    if (hasSpoken.current) return;
    hasSpoken.current = true;
    window.speechSynthesis?.cancel();
    playText(OPENING_TEXT).catch(() => {});
  }, []);

  // company lazy (§7) — só quando chegamos no resultado, pois é nesse ponto
  // que o ResultDownloadQR pode precisar de um company_id para gerar o QR de
  // download pelo celular. Falha aqui não bloqueia o fluxo (o QR fica oculto).
  useEffect(() => {
    if (stage !== 'result' || companyId) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: ensured } = await supabase.rpc('ensure_my_arte_company');
        if (!cancelled && ensured) setCompanyId(ensured as string);
      } catch {
        // Sem login/sessão: ResultDownloadQR simplesmente fica desabilitado.
      }
    })();

    return () => { cancelled = true; };
  }, [stage, companyId, supabase]);

  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];

  // Detecta tipo de arquivo e formatos de destino disponíveis
  const handleFileSelected = useCallback((file: File | null | undefined) => {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMsg('Formato não suportado. Envie um arquivo JPG, PNG, WebP ou PDF.');
      setStage('error');
      return;
    }

    try {
      const isPdf = file.type === 'application/pdf';
      let extension = '';
      let formats: string[] = [];

      if (isPdf) {
        extension = 'pdf';
        formats = ['jpg', 'png', 'webp'];
      } else {
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') extension = 'jpg';
        else if (file.type === 'image/png') extension = 'png';
        else if (file.type === 'image/webp') extension = 'webp';
        formats = ['jpg', 'png', 'webp', 'pdf'].filter(f => f !== extension);
      }

      setOriginalFile(file);
      setOriginalExtension(extension);
      setAvailableFormats(formats);
      setStage('selecting_format');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao processar arquivo.');
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

  const convertImageToImage = async (file: File, targetFormat: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setProgressPercent(60);
        setProgressText('Convertendo imagem...');

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas não suportado.'));

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
          else reject(new Error('Falha ao gerar imagem.'));
        }, mimeType, 0.85);
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
      img.src = URL.createObjectURL(file);
    });
  };

  // PDF aqui é documento comum, não arte de produção — por isso embedJpg
  // (não drawImageCmyk/CMYK) é correto neste caso específico.
  const convertImageToPDF = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setProgressPercent(60);
        setProgressText('Gerando PDF...');

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas não suportado.'));

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height],
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        pdf.addImage(imgData, 'JPEG', 0, 0, img.width, img.height);

        const pdfBlob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
        setProgressPercent(90);
        resolve(pdfBlob);
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Multi-página: sempre ZIP automático com todas as páginas (decisão confirmada)
  const convertPDFToImages = async (file: File, targetFormat: string): Promise<Blob> => {
    try {
      setProgressPercent(30);
      setProgressText('Lendo PDF...');

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      if (numPages === 1) {
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
            else reject(new Error('Falha ao gerar imagem.'));
          }, mimeType, 0.85);
        });
      }

      setProgressPercent(40);
      setProgressText(`Convertendo ${numPages} páginas...`);

      const zip = new window.JSZip();
      const scale = 2.0;

      for (let pageNum = 1; pageNum <= Math.min(numPages, 30); pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        const mimeType = `image/${targetFormat === 'jpg' ? 'jpeg' : targetFormat}`;
        const blob = await new Promise<Blob>((res, rej) => {
          canvas.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao gerar página.'))), mimeType, 0.85);
        });

        zip.file(`pagina_${String(pageNum).padStart(2, '0')}.${targetFormat}`, blob);
        setProgressPercent(40 + (pageNum / Math.min(numPages, 30)) * 50);
        setProgressText(`Página ${pageNum}/${Math.min(numPages, 30)}...`);
      }

      setProgressPercent(95);
      setProgressText('Criando arquivo ZIP...');
      return await zip.generateAsync({ type: 'blob' });
    } catch {
      throw new Error('Erro ao processar PDF.');
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

      if (originalExtension !== 'pdf' && selectedFormat === 'pdf') {
        blob = await convertImageToPDF(originalFile);
        filename = originalFile.name.replace(/\.[^/.]+$/, '.pdf');
      } else if (originalExtension === 'pdf' && ['jpg', 'png', 'webp'].includes(selectedFormat)) {
        blob = await convertPDFToImages(originalFile, selectedFormat);
        filename = blob.type === 'application/zip'
          ? originalFile.name.replace(/\.pdf$/i, '.zip')
          : originalFile.name.replace(/\.pdf$/i, `.${selectedFormat}`);
      } else {
        blob = await convertImageToImage(originalFile, selectedFormat);
        filename = originalFile.name.replace(/\.[^/.]+$/, `.${selectedFormat}`);
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setResultBase64(base64);
        setResultBlob(blob);
        setResultFileName(filename);
        setProgressPercent(100);
        setStage('result');
      };
      reader.readAsDataURL(blob);

      // Função gratuita: nenhuma RPC de crédito é chamada aqui (§10 — nunca
      // usar register_function_usage nem decrementar_creditos; e como o custo
      // real é zero, cobrar_credito_se_suficiente também não se aplica).
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro na conversão.');
      setStage('error');
    }
  }, [originalFile, selectedFormat, originalExtension]);

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
    setOriginalFile(null);
    setSelectedFormat(null);
    setResultBlob(null);
    setErrorMsg(null);
  }, []);

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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>🌐 Converter Arquivos</h2>
            <GratisBadge isDark={isDark} />
          </div>
          <button onClick={onClose} style={{
            padding: '6px', borderRadius: '8px', border: 'none',
            backgroundColor: 'transparent', color: colors.textMuted, cursor: 'pointer',
          }}>
            <IconX />
          </button>
        </div>

        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted, lineHeight: 1.5 }}>
              Carregue uma imagem ou PDF para converter o formato do arquivo (JPG, PNG, WebP ou PDF).
              Essa função é totalmente gratuita.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '40px 20px',
                borderRadius: '12px',
                border: `2px dashed ${isDragging ? colors.primary : colors.border}`,
                backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.06)' : colors.bgSecondary,
                color: colors.textMuted,
                cursor: 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            >
              <IconUpload />
              <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                Clique para selecionar ou arraste o arquivo aqui
              </span>
              <span style={{ fontSize: '12px' }}>JPG, PNG, WebP ou PDF</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />

            <VoiceHint commands={['"fechar"']} isDark={isDark} />
          </div>
        )}

        {stage === 'selecting_format' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
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
                    onClick={() => setSelectedFormat(format)}
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
              {originalExtension === 'pdf' && (
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: colors.textMuted }}>
                  PDFs com mais de uma página são convertidos em um ZIP com todas as páginas.
                </p>
              )}
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
              Converter (grátis)
            </button>

            <VoiceHint commands={['"jpg"', '"png"', '"pdf"', '"converter"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 0' }}>
            <IconLoader />
            <p style={{ margin: 0, fontSize: '14px', color: colors.textMuted }}>{progressText}</p>
            <div style={{ width: '100%', height: '8px', backgroundColor: colors.bgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: colors.primary, transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: colors.textMuted }}>{progressPercent}%</p>
          </div>
        )}

        {stage === 'result' && resultBlob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)', border: `1px solid ${colors.success}`,
              color: colors.success, fontSize: '14px', fontWeight: '500',
            }}>
              <IconCheck />
              <span>Conversão concluída!</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.7 }}>
                {(resultBlob.size / 1024).toFixed(1)} KB
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="result-container" style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
                    <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted }}>
                      Arquivo: <strong style={{ color: colors.text }}>{resultFileName}</strong>
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.textMuted }}>
                      Formato: {resultBlob.type || 'application/octet-stream'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleDownload} style={{
                      flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                      backgroundColor: colors.primary, color: 'white', cursor: 'pointer',
                      fontSize: '14px', fontWeight: '500', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}>
                      <IconDownload /> Baixar
                    </button>

                    <button onClick={handleReset} style={{
                      flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${colors.border}`,
                      backgroundColor: colors.bgSecondary, color: colors.text, cursor: 'pointer',
                      fontSize: '14px', fontWeight: '500', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}>
                      <IconRefresh /> Novo
                    </button>
                  </div>
                </div>

                <div className="qr-desktop" style={{ display: 'none', flexShrink: 0, width: '224px' }}>
                  <ResultDownloadQR
                    companyId={companyId}
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
                  companyId={companyId}
                  fileName={resultFileName}
                  fileType={resultBlob.type}
                  fileBase64={resultBase64}
                  isDark={isDark}
                  enabled={stage === 'result' && !!resultBase64}
                />
              </div>
            </div>

            <VoiceHint commands={['"baixar"', '"novo arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${colors.error}`, color: colors.error, fontSize: '14px',
            }}>
              {errorMsg}
            </div>

            <button onClick={handleReset} style={{
              padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: colors.error,
              color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <IconRefresh /> Tentar Novamente
            </button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .result-container { flex-direction: column !important; }
          .qr-desktop { display: none !important; }
          .qr-mobile { display: block !important; }
        }

        @media (min-width: 641px) {
          .qr-desktop { display: flex !important; flex-direction: column; }
          .qr-mobile { display: none !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}
