'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Film, Upload, File, Copy, Trash2, Loader2, AlertCircle } from 'lucide-react';

const ACCEPTED_EXTENSIONS = '.mp4,.mov,.webm,.mp3,.m4a,.wav';
const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}min ${s > 0 ? `${s}s` : ''}`.trim();
}

async function getFileDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement('video');
    media.preload = 'metadata';
    media.src = url;
    media.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(media.duration || 0); };
    media.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
  });
}

interface FileInfo {
  file: File;
  duration: number;
  credits: number;
}

interface Props {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function TranscreverVideoDisplay({ data, onClose, theme = 'dark' }: Props) {
  const { companyId } = data;
  const isDark = theme === 'dark';

  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDuration, setLoadingDuration] = useState(false);
  const [transcricao, setTranscricao] = useState('');
  const [apiError, setApiError] = useState('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'warning') => {
    setToast({ message, type });
  };

  async function processFile(file: File) {
    setFileError('');
    setTranscricao('');
    setApiError('');
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const validExts = ['mp4', 'mov', 'webm', 'mp3', 'm4a', 'wav'];
    if (!validExts.includes(ext)) {
      setFileError(`Formato não suportado (.${ext}). Use: MP4, MOV, WEBM, MP3, M4A ou WAV.`);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setFileError(`Arquivo muito grande (${formatBytes(file.size)}). Máximo: ${MAX_SIZE_MB}MB.`);
      return;
    }
    setLoadingDuration(true);
    const duration = await getFileDuration(file);
    setLoadingDuration(false);
    const duracaoSegundos = duration > 0 ? Math.ceil(duration) : 60;
    const credits = Math.max(2, Math.ceil(duracaoSegundos / 60));
    setFileInfo({ file, duration: duracaoSegundos, credits });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); }

  function handleRemove() {
    setFileInfo(null);
    setTranscricao('');
    setApiError('');
    setFileError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function handleTranscrever() {
    if (!fileInfo || loading) return;
    setLoading(true);
    setApiError('');
    try {
      const form = new FormData();
      form.append('company_id', companyId ?? '');
      form.append('duration_seconds', String(fileInfo.duration));
      form.append('file', fileInfo.file, fileInfo.file.name);
      const res = await fetch(`${supabaseUrl}/functions/v1/transcrever-video`, {
        method: 'POST',
        body: form,
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Erro ao transcrever');
      setTranscricao(result.transcricao);
      showToast('✅ Transcrição concluída!', 'success');
    } catch (e: any) {
      setApiError(e.message);
      showToast(e.message || 'Erro ao transcrever', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(transcricao);
    setCopied(true);
    showToast('✅ Transcrição copiada!', 'success');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadPDF() {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const margin = 20;
      const pageW = doc.internal.pageSize.getWidth() - margin * 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Transcrição — minhAi', margin, margin + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Arquivo: ${fileInfo?.file.name ?? ''} · ${new Date().toLocaleString('pt-BR')}`, margin, margin + 12);
      doc.setTextColor(30);
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(transcricao, pageW);
      doc.text(lines, margin, margin + 24);
      doc.save(`transcricao-minhai-${Date.now()}.pdf`);
    });
  }

  function handleReset() { handleRemove(); }

  if (!mounted) return null;

  const hasResult = !!transcricao;
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const surfaceBg = isDark ? 'bg-slate-800' : 'bg-gray-100';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3
            ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-400'}
            animate-in slide-in-from-top duration-300`}>
          {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />}
          {toast.type === 'success' && <Check className="w-5 h-5 text-white flex-shrink-0" />}
          {toast.type === 'error' && <X className="w-5 h-5 text-white flex-shrink-0" />}
          <p className="text-white font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Modal */}
      <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300 flex flex-col`}>

        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-indigo-950/40' : 'bg-indigo-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Transcrever Vídeo</h2>
                <p className={`text-sm ${textMuted}`}>OpenAI Whisper · pt-BR · até 25MB</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">

          {hasResult ? (
            /* ── Resultado ── */
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border flex items-center justify-between
                ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                <p className={`text-sm font-semibold ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                  ✅ Transcrição concluída
                </p>
                <p className={`text-xs ${textMuted}`}>
                  {fileInfo?.credits} crédito{(fileInfo?.credits ?? 0) > 1 ? 's' : ''} utilizados
                </p>
              </div>

              <div className={`p-4 rounded-lg border max-h-72 overflow-y-auto ${surfaceBg} ${border}`}>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${textPrimary}`}>
                  {transcricao}
                </p>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-semibold text-sm transition
                    ${copied
                      ? isDark ? 'border-green-600 text-green-400 bg-green-900/20' : 'border-green-500 text-green-600 bg-green-50'
                      : isDark ? 'border-indigo-600 text-indigo-400 hover:bg-indigo-900/30' : 'border-indigo-500 text-indigo-600 hover:bg-indigo-50'}`}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copiado!' : 'Copiar texto'}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
                >
                  📄 Baixar PDF
                </button>
              </div>

              <button
                onClick={handleReset}
                className={`w-full px-4 py-2 rounded-lg border ${border} ${textMuted} text-sm font-medium hover:opacity-80 transition`}
              >
                Transcrever outro arquivo
              </button>
            </div>
          ) : (
            /* ── Upload ── */
            <>
              {!fileInfo ? (
                <div
                  ref={dropRef}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => inputRef.current?.click()}
                  className={`flex flex-col items-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition
                    ${fileError
                      ? 'border-red-500 bg-red-500/5'
                      : isDark ? 'border-slate-600 hover:border-indigo-500 bg-slate-800/50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'}`}
                >
                  <Upload className={`w-8 h-8 ${fileError ? 'text-red-500' : textMuted}`} />
                  <div className="text-center">
                    <p className={`font-semibold text-sm ${textPrimary}`}>Clique ou arraste o arquivo aqui</p>
                    <p className={`text-xs mt-1 ${textMuted}`}>MP4, MOV, WEBM, MP3, M4A, WAV · máx. {MAX_SIZE_MB}MB</p>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Card do arquivo */}
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${surfaceBg} ${border}`}>
                    <File className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${textPrimary}`}>{fileInfo.file.name}</p>
                      <p className={`text-xs mt-0.5 ${textMuted}`}>
                        {formatBytes(fileInfo.file.size)}
                        {loadingDuration ? ' · calculando duração...' : fileInfo.duration > 0 ? ` · ${formatDuration(fileInfo.duration)}` : ''}
                      </p>
                    </div>
                    <button onClick={handleRemove} title="Remover arquivo" className={`p-1 flex-shrink-0 ${textMuted} hover:text-red-500 transition`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Custo */}
                  {!loadingDuration && (
                    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border
                      ${isDark ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-200'}`}>
                      <div>
                        <span className={`text-sm ${textMuted}`}>
                          {Math.ceil(fileInfo.duration / 60)} minuto{Math.ceil(fileInfo.duration / 60) > 1 ? 's' : ''} de áudio
                        </span>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-indigo-400/60' : 'text-indigo-400'}`}>
                          1 crédito/min · mín. 2 · arredondado para cima
                        </p>
                      </div>
                      <span className={`text-base font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {fileInfo.credits} crédito{fileInfo.credits > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Erros */}
              {fileError && (
                <div className={`px-4 py-3 rounded-lg border text-sm
                  ${isDark ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {fileError}
                </div>
              )}
              {apiError && (
                <div className={`px-4 py-3 rounded-lg border text-sm
                  ${isDark ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {apiError}
                </div>
              )}

              {/* Botão transcrever */}
              <button
                onClick={handleTranscrever}
                disabled={!fileInfo || loadingDuration || loading}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Transcrevendo... pode levar alguns segundos</>
                ) : fileInfo ? (
                  <>🔵 Transcrever — {fileInfo.credits} crédito{fileInfo.credits > 1 ? 's' : ''}</>
                ) : (
                  <>🔵 Selecione um arquivo para continuar</>
                )}
              </button>

              <p className={`text-xs text-center ${textMuted}`}>
                Os créditos são descontados somente após a transcrição ser concluída com sucesso.
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
