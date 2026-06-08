'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ── Palette ─────────────────────────────────────────────
const DARK = {
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  border: '#2a2a2a',
  borderFocus: '#0000ff',
  text: '#f0f0f0',
  textMuted: '#888',
  textDim: '#555',
  accent: '#0000ff',
  accentHover: '#0033cc',
  accentSoft: 'rgba(0,0,255,0.1)',
  danger: '#ff4444',
  success: '#22c55e',
  successSoft: 'rgba(34,197,94,0.1)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245,158,11,0.1)',
};
const LIGHT = {
  bg: '#ffffff',
  surface: '#f5f5f5',
  border: '#e0e0e0',
  borderFocus: '#0000ff',
  text: '#111111',
  textMuted: '#666',
  textDim: '#aaa',
  accent: '#0000ff',
  accentHover: '#0033cc',
  accentSoft: 'rgba(0,0,255,0.07)',
  danger: '#dc2626',
  success: '#16a34a',
  successSoft: 'rgba(22,163,74,0.08)',
  warning: '#d97706',
  warningSoft: 'rgba(217,119,6,0.08)',
};

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav'];
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
    media.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(media.duration || 0);
    };
    media.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

// ── SVG Icons ────────────────────────────────────────────
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconUpload = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const IconFile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const IconCopy = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

// ── Component ────────────────────────────────────────────
interface FileInfo {
  file: File;
  duration: number; // segundos
  credits: number;
}

interface Props {
  data: {
    companyId: string;
  };
  onClose: () => void;
  isDark?: boolean;
}

export default function TranscreverVideoDisplay({ data, onClose, isDark = true }: Props) {
  const P = isDark ? DARK : LIGHT;
  const { companyId } = data;

  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDuration, setLoadingDuration] = useState(false);
  const [transcricao, setTranscricao] = useState('');
  const [apiError, setApiError] = useState('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  async function processFile(file: File) {
    setFileError('');
    setTranscricao('');
    setApiError('');

    // Validar tipo
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const validExts = ['mp4', 'mov', 'webm', 'mp3', 'm4a', 'wav'];
    if (!validExts.includes(ext)) {
      setFileError(`Formato não suportado (.${ext}). Use: MP4, MOV, WEBM, MP3, M4A ou WAV.`);
      return;
    }

    // Validar tamanho
    if (file.size > MAX_SIZE_BYTES) {
      setFileError(`Arquivo muito grande (${formatBytes(file.size)}). Máximo: ${MAX_SIZE_MB}MB.`);
      return;
    }

    setLoadingDuration(true);
    const duration = await getFileDuration(file);
    setLoadingDuration(false);

    const duracaoSegundos = duration > 0 ? Math.ceil(duration) : 60; // fallback 1min se não ler
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
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro ao transcrever');
      setTranscricao(data.transcricao);
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(transcricao);
    setCopied(true);
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

  function handleReset() {
    handleRemove();
  }

  if (!mounted) return null;

  const hasResult = !!transcricao;

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: P.bg,
          borderRadius: '16px',
          border: `1px solid ${P.border}`,
          width: '100%', maxWidth: '580px',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${P.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: P.accentSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>🔵</div>
            <div>
              <div style={{ color: P.text, fontWeight: 700, fontSize: '16px' }}>Transcrever Vídeo</div>
              <div style={{ color: P.textMuted, fontSize: '12px' }}>OpenAI Whisper · pt-BR · até 25MB</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: P.textMuted, padding: '4px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Resultado */}
          {hasResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: P.successSoft,
                border: `1px solid ${P.success}`,
                borderRadius: '10px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ color: P.success, fontWeight: 600, fontSize: '14px' }}>
                  ✓ Transcrição concluída
                </div>
                <div style={{ color: P.textMuted, fontSize: '12px' }}>
                  {fileInfo?.credits} crédito{(fileInfo?.credits ?? 0) > 1 ? 's' : ''} utilizados
                </div>
              </div>

              {/* Texto da transcrição */}
              <div style={{
                background: P.surface, border: `1px solid ${P.border}`,
                borderRadius: '10px', padding: '16px',
                maxHeight: '300px', overflowY: 'auto',
              }}>
                <div style={{
                  color: P.text, fontSize: '14px', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {transcricao}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 14px', borderRadius: '8px',
                    background: copied ? P.successSoft : P.accentSoft,
                    border: `1px solid ${copied ? P.success : P.accent}`,
                    color: copied ? P.success : P.accent,
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <IconCopy /> {copied ? 'Copiado!' : 'Copiar texto'}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 14px', borderRadius: '8px',
                    background: P.accent, border: 'none',
                    color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  📄 Baixar PDF
                </button>
              </div>

              <button
                onClick={handleReset}
                style={{
                  background: 'none', border: `1px solid ${P.border}`,
                  borderRadius: '8px', padding: '10px',
                  color: P.textMuted, fontSize: '13px', cursor: 'pointer',
                }}
              >
                Transcrever outro arquivo
              </button>
            </div>
          ) : (
            <>
              {/* Zona de upload */}
              {!fileInfo ? (
                <div
                  ref={dropRef}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => inputRef.current?.click()}
                  style={{
                    border: `2px dashed ${fileError ? P.danger : P.border}`,
                    borderRadius: '12px',
                    padding: '36px 24px',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '12px',
                    cursor: 'pointer',
                    background: P.surface,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ color: fileError ? P.danger : P.textMuted }}>
                    <IconUpload />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: P.text, fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                      Clique ou arraste o arquivo aqui
                    </div>
                    <div style={{ color: P.textMuted, fontSize: '12px' }}>
                      MP4, MOV, WEBM, MP3, M4A, WAV · máx. {MAX_SIZE_MB}MB
                    </div>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                /* Arquivo selecionado — resumo + confirmação */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Card do arquivo */}
                  <div style={{
                    background: P.surface, border: `1px solid ${P.border}`,
                    borderRadius: '10px', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <div style={{ color: P.accent, flexShrink: 0 }}>
                      <IconFile />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: P.text, fontWeight: 600, fontSize: '13px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {fileInfo.file.name}
                      </div>
                      <div style={{ color: P.textMuted, fontSize: '12px', marginTop: '2px' }}>
                        {formatBytes(fileInfo.file.size)}
                        {loadingDuration
                          ? ' · calculando duração...'
                          : fileInfo.duration > 0
                            ? ` · ${formatDuration(fileInfo.duration)}`
                            : ''}
                      </div>
                    </div>
                    <button
                      onClick={handleRemove}
                      title="Remover arquivo"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: P.textMuted, padding: '4px', flexShrink: 0,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <IconTrash />
                    </button>
                  </div>

                  {/* Custo em créditos — linguagem simples */}
                  {!loadingDuration && (
                    <div style={{
                      background: P.accentSoft,
                      border: `1px solid ${P.accent}`,
                      borderRadius: '8px', padding: '12px 16px',
                      display: 'flex', flexDirection: 'column', gap: '4px',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ color: P.textMuted, fontSize: '13px' }}>
                          {Math.ceil(fileInfo.duration / 60)} minuto{Math.ceil(fileInfo.duration / 60) > 1 ? 's' : ''} de áudio
                        </span>
                        <span style={{ color: P.accent, fontWeight: 700, fontSize: '15px' }}>
                          {fileInfo.credits} crédito{fileInfo.credits > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div style={{ color: P.textDim, fontSize: '11px' }}>
                        1 crédito por minuto · mínimo 2 · arredondado para cima
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Erro de arquivo */}
              {fileError && (
                <div style={{
                  background: 'rgba(255,68,68,0.08)',
                  border: `1px solid ${P.danger}`,
                  borderRadius: '8px', padding: '10px 14px',
                  color: P.danger, fontSize: '13px',
                }}>
                  {fileError}
                </div>
              )}

              {/* Erro da API */}
              {apiError && (
                <div style={{
                  background: 'rgba(255,68,68,0.08)',
                  border: `1px solid ${P.danger}`,
                  borderRadius: '8px', padding: '10px 14px',
                  color: P.danger, fontSize: '13px',
                }}>
                  {apiError}
                </div>
              )}

              {/* Botão transcrever */}
              <button
                onClick={handleTranscrever}
                disabled={!fileInfo || loadingDuration || loading}
                style={{
                  padding: '13px', borderRadius: '10px',
                  background: !fileInfo || loadingDuration || loading ? P.surface : P.accent,
                  border: `1.5px solid ${!fileInfo || loadingDuration || loading ? P.border : P.accent}`,
                  color: !fileInfo || loadingDuration || loading ? P.textMuted : '#fff',
                  fontSize: '15px', fontWeight: 700,
                  cursor: !fileInfo || loadingDuration || loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      display: 'inline-block', width: 16, height: 16,
                      border: '2px solid #ffffff44', borderTop: '2px solid #fff',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    }} />
                    Transcrevendo... pode levar alguns segundos
                  </>
                ) : fileInfo ? (
                  <>🔵 Transcrever — {fileInfo.credits} crédito{fileInfo.credits > 1 ? 's' : ''}</>
                ) : (
                  <>🔵 Selecione um arquivo para continuar</>
                )}
              </button>

              <div style={{ color: P.textDim, fontSize: '11px', textAlign: 'center' }}>
                Os créditos são descontados somente após a transcrição ser concluída com sucesso.
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(modal, document.body);
}
