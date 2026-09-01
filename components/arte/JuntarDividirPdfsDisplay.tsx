'use client';

/**
 * JuntarDividirPdfsDisplay.tsx — ArteFinal
 *
 * Junta múltiplos PDFs em um só, ou divide um PDF em páginas separadas
 * (entregues em um .zip). 100% client-side, gratuito (sem cobrança).
 *
 * Detecção automática de modo: 1 arquivo enviado → modo "Dividir" (cada
 * página vira um PDF separado); 2+ arquivos → modo "Juntar" (mescla na
 * ordem, reordenável por arraste). O modo é fixado na primeira detecção —
 * adicionar mais arquivos depois não troca de modo (confirmado: reiniciar é
 * o caminho para trocar).
 *
 * Migrado para o padrão visual e arquitetura dos demais modais já
 * corrigidos (Adesivo, Folha de Recorte, Editar Imagem, etc):
 *  - Paleta CMYK padrão (accent = CMYK.cyan), header com "Fechar" em texto,
 *    bloco "Como funciona", card 640/900.
 *  - useModalVoiceCommand e CameraCapture REMOVIDOS — são específicos do
 *    assistente de voz da minhAi (microfone, câmera/QR de celular), que não
 *    se aplicam ao ArteFinal (confirmado em modais anteriores: Editar
 *    Imagem, por exemplo, teve a mesma remoção). Substituídos por um input
 *    de arquivo simples (clique ou arraste), igual aos demais modais.
 *  - Cobrança: REMOVIDA a chamada a decrementar_creditos (RPC proibida pelo
 *    guia — nunca usar para cobrar, e além disso esta função é gratuita,
 *    então não deveria cobrar nada de qualquer forma).
 *
 * function_key: 'juntar_dividir_pdfs' · gratuito.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PDFDocument } from 'pdf-lib';

type Stage = 'input' | 'organizing' | 'processing' | 'result' | 'error';
type Mode = 'juntar' | 'dividir' | null;

interface PdfFile {
  id: string;
  name: string;
  base64: string;
  pageCount: number;
  size: number;
}

interface Props {
  data: { companyId: string; prefillFile?: File };
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

const OPENING_TEXT = 'Junte vários PDFs em um só, ou envie um único PDF para dividir em páginas separadas.';
const AUTO_CLOSE = 60;

type P = { c: string; sz: number };
const icon = (color: string, size = 20): P => ({ c: color, sz: size });

const IconCheck = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>
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
const IconTrash = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const IconGrip = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2}>
    <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
  </svg>
);
const IconPlus = ({ s }: { s: P }) => (
  <svg width={s.sz} height={s.sz} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);

const isPdfBase64 = (b64: string) => b64.startsWith('JVBERi');

export default function JuntarDividirPdfsDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const c = isDark ? DARK : LIGHT;

  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [mode, setMode] = useState<Mode>(null); // fixado na 1ª detecção

  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [resultIsZip, setResultIsZip] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  const hasSpoken = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const interval = setInterval(() => {
      setTimeLeft((prev) => { if (prev <= 1) { onClose(); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, onClose]);

useEffect(() => {
  if (hasSpoken.current) return;
  hasSpoken.current = true;
  window.speechSynthesis?.cancel();

  // Se o arquivo já vem anexado (input principal), pula a etapa de upload
  // e processa direto — mesma validação de tipo do handleFileSelected.
  if (data.prefillFile) {
    handleFileSelected(data.prefillFile);
    playText('Imagem recebida! Ajuste o corte, o brilho ou a rotação como preferir.').catch(() => {});
  } else {
    playText(OPENING_TEXT).catch(() => {});
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // ── Leitura de arquivos (1 = define modo Dividir; 2+ = modo Juntar) ───────────

  const readPdfFile = useCallback((file: File): Promise<PdfFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          if (!isPdfBase64(base64)) { reject(new Error(`"${file.name}" não parece ser um PDF válido.`)); return; }
          const pdfBytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
          const pdfDoc = await PDFDocument.load(pdfBytes);
          resolve({
            id: `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: file.name,
            base64,
            pageCount: pdfDoc.getPageCount(),
            size: file.size,
          });
        } catch (e: any) {
          reject(new Error(`Não foi possível ler "${file.name}". ${e.message ?? ''}`));
        }
      };
      reader.onerror = () => reject(new Error(`Falha ao carregar "${file.name}".`));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!files.length) { setErrorMsg('Envie arquivos PDF.'); setStage('error'); return; }

    try {
      const newPdfs = await Promise.all(files.map(readPdfFile));
      setPdfFiles((prev) => [...prev, ...newPdfs]);
      // Modo fixado na primeira vez que sabemos o total de arquivos — calculado
      // fora do updater de setPdfFiles, que deve ser puro (sem side-effects).
      if (mode === null) {
        const totalAfter = pdfFiles.length + newPdfs.length;
        setMode(totalAfter === 1 ? 'dividir' : 'juntar');
      }
      setStage('organizing');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Erro ao processar os arquivos.');
      setStage('error');
    }
  }, [mode, pdfFiles, readPdfFile]);

  const handleRemovePdf = useCallback((id: string) => {
    setPdfFiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleDragStartItem = useCallback((index: number) => setDraggedIndex(index), []);
  const handleDragOverItem = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setPdfFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDraggedIndex(index);
  }, [draggedIndex]);
  const handleDragEndItem = useCallback(() => setDraggedIndex(null), []);

  // ── Juntar ─────────────────────────────────────────────────────────────────────

  const handleMerge = useCallback(async () => {
    if (pdfFiles.length < 2) { setErrorMsg('Adicione pelo menos 2 PDFs para juntar.'); setStage('error'); return; }
    setStage('processing'); setProgressPercent(10); setProgressText('Iniciando mesclagem...');

    try {
      const merged = await PDFDocument.create();
      for (let i = 0; i < pdfFiles.length; i++) {
        setProgressPercent(10 + (i / pdfFiles.length) * 70);
        setProgressText(`Processando PDF ${i + 1} de ${pdfFiles.length}...`);
        const bytes = Uint8Array.from(atob(pdfFiles[i].base64), (ch) => ch.charCodeAt(0));
        const pdf = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      setProgressPercent(90); setProgressText('Gerando PDF final...');
      const bytes = await merged.save();
      setResultBlob(new Blob([bytes], { type: 'application/pdf' }));
      setResultFileName(`pdfs_unidos_${Date.now()}.pdf`);
      setResultIsZip(false);
      setProgressPercent(100);
      setStage('result');
      playText('PDFs unidos com sucesso!').catch(() => {});
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Erro ao juntar os PDFs.');
      setStage('error');
    }
  }, [pdfFiles, playText]);

  // ── Dividir (cada página em um PDF, entregues em .zip) ────────────────────────

  const handleSplit = useCallback(async () => {
    if (pdfFiles.length !== 1) return;
    setStage('processing'); setProgressPercent(10); setProgressText('Lendo o PDF...');

    try {
      const source = pdfFiles[0];
      const bytes = Uint8Array.from(atob(source.base64), (ch) => ch.charCodeAt(0));
      const srcDoc = await PDFDocument.load(bytes);
      const total = srcDoc.getPageCount();

      if (total <= 1) { setErrorMsg('Esse PDF tem apenas 1 página — não há o que dividir.'); setStage('error'); return; }

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const baseName = source.name.replace(/\.pdf$/i, '');

      for (let i = 0; i < total; i++) {
        setProgressPercent(10 + (i / total) * 80);
        setProgressText(`Separando página ${i + 1} de ${total}...`);
        const single = await PDFDocument.create();
        const [page] = await single.copyPages(srcDoc, [i]);
        single.addPage(page);
        const singleBytes = await single.save();
        const pad = String(i + 1).padStart(String(total).length, '0');
        zip.file(`${baseName}_pagina_${pad}.pdf`, singleBytes);
      }

      setProgressPercent(95); setProgressText('Compactando arquivos...');
      const zipBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE' });
      setResultBlob(zipBlob);
      setResultFileName(`${baseName}_dividido_${Date.now()}.zip`);
      setResultIsZip(true);
      setProgressPercent(100);
      setStage('result');
      playText('PDF dividido com sucesso!').catch(() => {});
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Erro ao dividir o PDF.');
      setStage('error');
    }
  }, [pdfFiles, playText]);

  const handleProcess = useCallback(() => {
    if (mode === 'juntar') handleMerge();
    else if (mode === 'dividir') handleSplit();
  }, [mode, handleMerge, handleSplit]);

  const handleDownload = useCallback(() => {
    if (!resultBlob || !resultFileName) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url; a.download = resultFileName; a.click();
    URL.revokeObjectURL(url);
  }, [resultBlob, resultFileName]);

  const handleReset = useCallback(() => {
    setStage('input'); setMode(null); setPdfFiles([]);
    setResultBlob(null); setResultFileName(''); setResultIsZip(false); setErrorMsg(null);
  }, []);

  const totalPages = pdfFiles.reduce((s, p) => s + p.pageCount, 0);
  const totalSize = pdfFiles.reduce((s, p) => s + p.size, 0);

  const label: React.CSSProperties = { fontSize: 11, color: c.textMuted };
  const btnPrimary: React.CSSProperties = { padding: 12, borderRadius: 8, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: stage === 'organizing' ? 700 : (stage === 'result' ? 900 : 640), background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, color: c.text, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Juntar / Dividir PDFs</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', border: `1px solid ${c.border}`, borderRadius: 8, background: 'transparent', color: c.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fechar</button>
        </div>

        {/* INPUT */}
        {stage === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: c.text }}>Como funciona</p>
              <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                Envie <strong>2 ou mais PDFs</strong> para juntá-los em um só, na ordem que você escolher.
                Ou envie <strong>1 único PDF</strong> para dividir cada página em um arquivo separado,
                entregues em um .zip. Totalmente gratuito.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); }}
              style={{ border: `2px dashed ${isDragging ? c.accent : c.border}`, borderRadius: 12, padding: '46px 20px', textAlign: 'center', background: isDragging ? 'rgba(0,174,239,0.06)' : c.bgSecondary, cursor: 'pointer', color: c.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
            >
              <IconUpload s={icon(c.accent, 28)} />
              <span style={{ fontSize: 15, fontWeight: 600, color: c.text }}>Clique ou arraste os PDFs aqui</span>
              <span style={{ fontSize: 12 }}>1 arquivo para dividir · 2+ arquivos para juntar</span>
            </div>
            <input ref={fileInputRef} type="file" accept="application/pdf" multiple style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.currentTarget.value = ''; }} />
          </div>
        )}

        {/* ORGANIZING */}
        {stage === 'organizing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ padding: '10px 12px', borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, fontSize: 12, color: c.textMuted, textAlign: 'center' }}>
              Modo detectado: <strong style={{ color: c.accent }}>{mode === 'dividir' ? 'Dividir (1 arquivo → várias páginas)' : 'Juntar (vários arquivos → 1 PDF)'}</strong>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}`, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 13 }}>
              <div style={{ textAlign: 'center' }}><div style={label}>PDFs</div><div style={{ fontWeight: 600 }}>{pdfFiles.length}</div></div>
              <div style={{ textAlign: 'center' }}><div style={label}>Total páginas</div><div style={{ fontWeight: 600 }}>{totalPages}</div></div>
              <div style={{ textAlign: 'center' }}><div style={label}>Tamanho</div><div style={{ fontWeight: 600 }}>{(totalSize / 1024 / 1024).toFixed(1)} MB</div></div>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>
                {mode === 'juntar' ? 'Ordem dos PDFs (arraste para reordenar)' : 'Arquivo a dividir'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pdfFiles.map((pdf, index) => (
                  <div
                    key={pdf.id}
                    draggable={mode === 'juntar'}
                    onDragStart={() => handleDragStartItem(index)}
                    onDragOver={(e) => handleDragOverItem(e, index)}
                    onDragEnd={handleDragEndItem}
                    style={{
                      padding: 12, borderRadius: 8, border: `1px solid ${c.border}`,
                      background: draggedIndex === index ? 'rgba(0,174,239,0.08)' : c.bg,
                      cursor: mode === 'juntar' ? 'move' : 'default',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    {mode === 'juntar' && <IconGrip s={icon(c.textMuted, 14)} />}
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: c.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdf.name}</div>
                      <div style={{ fontSize: 11, color: c.textMuted }}>{pdf.pageCount} página{pdf.pageCount > 1 ? 's' : ''}</div>
                    </div>
                    {mode === 'juntar' && (
                      <button onClick={() => handleRemovePdf(pdf.id)} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', color: c.error, cursor: 'pointer', display: 'flex' }}>
                        <IconTrash s={icon(c.error, 14)} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {mode === 'juntar' && (
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: 10, borderRadius: 8, border: `1px dashed ${c.border}`, background: 'transparent', color: c.text, cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <IconPlus s={icon(c.text, 16)} /> Adicionar mais PDFs
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="application/pdf" multiple style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.currentTarget.value = ''; }} />

            <button
              onClick={handleProcess}
              disabled={mode === 'juntar' && pdfFiles.length < 2}
              style={{ ...btnPrimary, background: (mode === 'juntar' && pdfFiles.length < 2) ? c.border : c.accent, cursor: (mode === 'juntar' && pdfFiles.length < 2) ? 'not-allowed' : 'pointer' }}
            >
              <IconDownload s={icon('#fff', 16)} />
              {mode === 'juntar' ? `Juntar ${pdfFiles.length} PDFs` : `Dividir em ${pdfFiles[0]?.pageCount ?? 0} páginas`}
            </button>
          </div>
        )}

        {/* PROCESSING */}
        {stage === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '34px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${c.border}`, borderTopColor: c.accent, animation: 'jd-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>{progressText}</p>
            <div style={{ width: '100%', height: 8, background: c.bgSecondary, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: c.accent, transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: c.textMuted }}>{Math.round(progressPercent)}%</p>
          </div>
        )}

        {/* RESULT */}
        {stage === 'result' && resultBlob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: `1px solid ${c.success}`, color: c.success, fontSize: 14, fontWeight: 600 }}>
              <IconCheck s={icon(c.success, 16)} />
              <span>{mode === 'dividir' ? 'PDF dividido com sucesso!' : 'PDFs unidos com sucesso!'}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8 }}>{(resultBlob.size / 1024).toFixed(1)} KB</span>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: c.bgSecondary, border: `1px solid ${c.border}` }}>
              <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>
                Arquivo: <strong style={{ color: c.text }}>{resultFileName}</strong>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: c.textMuted }}>
                {mode === 'dividir' ? `${pdfFiles[0]?.pageCount ?? 0} páginas separadas, compactadas em .zip` : `${pdfFiles.length} PDFs unidos · ${totalPages} páginas`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDownload} style={{ ...btnPrimary, flex: 1 }}>
                <IconDownload s={icon('#fff', 16)} /> Baixar {resultIsZip ? '.zip' : 'PDF'}
              </button>
              <button onClick={handleReset} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSecondary, color: c.text, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <IconRefresh s={icon(c.textMuted, 14)} /> Novo
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: c.textMuted, margin: 0 }}>Fecha automaticamente em {timeLeft}s</p>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: `1px solid ${c.error}`, color: c.error, fontSize: 14, lineHeight: 1.4 }}>
              {errorMsg}
            </div>
            <button onClick={handleReset} style={{ ...btnPrimary, background: c.error }}>
              <IconRefresh s={icon('#fff', 15)} /> Tentar novamente
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes jd-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
}