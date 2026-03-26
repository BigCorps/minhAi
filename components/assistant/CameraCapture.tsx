'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, Smartphone, ZapOff, QrCode, RefreshCw, Timer, Copy, Check, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { useCameraCapture } from '@/components/VoiceAssistant/hooks/useCameraCapture';
import { useCompanionUpload } from '@/components/VoiceAssistant/hooks/useCompanionUpload';
import { PDFDocument } from 'pdf-lib';

// ─────────────────────────────────────────────────────────────
// Mescla múltiplos arquivos (PDFs + imagens) em 1 PDF único.
// Retorna o base64 puro do PDF resultante (sem prefixo data:).
// ─────────────────────────────────────────────────────────────
async function mergeFilesToPDF(files: File[]): Promise<string> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));

    } else if (file.type.startsWith('image/')) {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // pdf-lib suporta JPG e PNG nativamente — sem jsPDF
      let image;
      if (file.type === 'image/png') {
        image = await mergedPdf.embedPng(bytes);
      } else {
        // JPEG, WEBP e demais tratados como JPEG
        image = await mergedPdf.embedJpg(bytes);
      }

      // Página A4 em pontos (72 DPI): 595 x 842
      const page = mergedPdf.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();
      const imgDims = image.scaleToFit(width, height);

      page.drawImage(image, {
        x: (width - imgDims.width) / 2,
        y: (height - imgDims.height) / 2,
        width: imgDims.width,
        height: imgDims.height,
      });
    }
  }

  const pdfBytes = await mergedPdf.save();
  // btoa em chunks para evitar estouro de stack em arquivos grandes
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < pdfBytes.length; i += chunkSize) {
    binary += String.fromCharCode(...pdfBytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// ─────────────────────────────────────────────────────────────

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
  theme?: 'dark' | 'light';
  acceptedTypes?: string;
  instructions?: string;
  companyId: string;
  defaultTab?: Tab;
  enabledTabs?: Tab[];
  acceptPdf?: boolean;
  allowMultiple?: boolean; // ← NOVO: habilita seleção de múltiplos arquivos
  allowUrl?: boolean;       // habilita aba de URL (só para IdentificarFraude)
  onUrlCapture?: (url: string) => void;  // callback separado para URL
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  captureRef?: React.MutableRefObject<(() => void) | null>;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

type Tab = 'companion' | 'webcam' | 'mobile' | 'upload' | 'url';

export default function CameraCapture(props: CameraCaptureProps) {
  const {
    onCapture,
    onCancel,
    theme = 'dark',
    acceptedTypes = 'image/*',
    instructions,
    companyId,
    allowMultiple = false,
  } = props;

  const isDark = theme === 'dark';
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = props.videoRef ?? internalVideoRef;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // ── Estado de progresso de mesclagem ─────────────────────
  const [processingFiles, setProcessingFiles] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const [internalTab, setInternalTab] = useState<Tab>(props.defaultTab ?? 'companion');
  const activeTab = props.activeTab ?? internalTab;
  const setActiveTab = (tab: Tab) => {
    setInternalTab(tab);
    props.onTabChange?.(tab);
  };

  const camera = useCameraCapture();
  const companion = useCompanionUpload({
    companyId,
    onImageReceived: (base64) => onCapture(base64),
  });

  useEffect(() => {
    if (activeTab === 'webcam') {
      camera.startWebcam();
    } else if (activeTab === 'companion') {
      companion.start();
    }
    return () => {
      camera.stopWebcam();
      companion.cancel();
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (camera.stream && videoRef.current) {
      videoRef.current.srcObject = camera.stream;
    }
  }, [camera.stream]);

  useEffect(() => {
    if (activeTab === 'webcam' && !camera.stream) {
      camera.startWebcam();
    }
    if (activeTab === 'companion' && companion.status === 'idle') {
      companion.start();
    }
    if (activeTab !== 'companion' && companion.status === 'waiting') {
      companion.cancel();
    }
  }, [activeTab]); // eslint-disable-line

  useEffect(() => {
    if (camera.capturedImage) {
      onCapture(camera.capturedImage);
    }
  }, [camera.capturedImage, onCapture]);

  useEffect(() => {
    if (props.captureRef) {
      props.captureRef.current = () => {
        if (activeTab === 'webcam' && videoRef.current) {
          camera.setIsCapturing(true);
          camera.captureFromWebcam(videoRef as React.RefObject<HTMLVideoElement>);
          camera.setIsCapturing(false);
        }
      };
    }
  }, [activeTab, props.captureRef]); // eslint-disable-line

  const handleTabChange = (tab: Tab) => {
    if (tab !== 'webcam') camera.stopWebcam();
    if (tab !== 'companion') companion.cancel();
    setActiveTab(tab);
    if (tab === 'webcam') camera.startWebcam();
    if (tab === 'companion') companion.start();
    if (tab === 'mobile') mobileInputRef.current?.click();
  };

  // ── Handler de upload (único ou múltiplo) ─────────────────
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // limpa input para permitir re-seleção

    if (files.length === 0) return;

    // Arquivo único: comportamento original via hook
    if (!allowMultiple || files.length === 1) {
      camera.handleFileUpload(files[0]);
      return;
    }

    // Múltiplos arquivos: validar e mesclar
    const invalidFiles = files.filter(
      (f) => !f.type.startsWith('image/') && f.type !== 'application/pdf'
    );
    if (invalidFiles.length > 0) {
      alert('Apenas imagens (JPG/PNG) e PDFs são permitidos.');
      return;
    }

    try {
      setFileCount(files.length);
      setProcessingFiles(true);
      console.log(`📄 Mesclando ${files.length} arquivos...`);

      const mergedBase64 = await mergeFilesToPDF(files);
      onCapture(`data:application/pdf;base64,${mergedBase64}`);

      console.log('✅ Arquivos mesclados com sucesso');
    } catch (err: any) {
      console.error('❌ Erro ao mesclar arquivos:', err);
      alert(err?.message ?? 'Erro ao mesclar arquivos. Tente novamente.');
    } finally {
      setProcessingFiles(false);
      setFileCount(0);
    }
  };

  const tabClass = (active: boolean) =>
    `flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-lg transition-all ${
      active
        ? 'bg-indigo-600 text-white'
        : isDark
        ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  const formatCountdown = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  const allTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'companion', label: 'Celular', icon: <QrCode className="w-3.5 h-3.5" /> },
    { id: 'webcam',    label: 'Webcam',  icon: <Camera className="w-3.5 h-3.5" /> },
    ...(isMobile ? [{ id: 'mobile' as Tab, label: 'Câmera', icon: <Smartphone className="w-3.5 h-3.5" /> }] : []),
    { id: 'upload',    label: 'Upload',  icon: <Upload className="w-3.5 h-3.5" /> },
    ...(props.allowUrl ? [{ id: 'url' as Tab, label: 'Link', icon: <LinkIcon className="w-3.5 h-3.5" /> }] : []),
  ];
  const visibleTabs = props.enabledTabs
    ? allTabs.filter(t => props.enabledTabs!.includes(t.id))
    : allTabs;

  const CONTENT_H = 'min-h-[200px]';

  return (
    <div className="flex flex-col gap-3">
      {instructions && (
        <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {instructions}
        </p>
      )}

      <div className="flex flex-col gap-2">

        {/* Abas horizontais */}
        <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={tabClass(activeTab === tab.id) + ' flex-1'}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Área de conteúdo */}
        <div
          className={`relative rounded-xl overflow-hidden flex items-center justify-center ${CONTENT_H} ${
            isDark ? 'bg-slate-900/50' : 'bg-gray-50'
          }`}
        >
          {/* ── Overlay de mesclagem ── */}
          {processingFiles && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
              <div className={`rounded-xl p-6 text-center shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <RefreshCw className="w-10 h-10 mx-auto mb-3 text-indigo-400 animate-spin" />
                <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Mesclando {fileCount} arquivos...
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Isso pode levar alguns segundos
                </p>
              </div>
            </div>
          )}

          {/* ── Webcam ── */}
          {activeTab === 'webcam' && camera.stream && (
            <div className="relative w-full h-full">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-xl" />
              <button
                onClick={() => { camera.stopWebcam(); camera.flipCamera(); }}
                className="absolute top-2 right-2 bg-black/40 text-white p-2 rounded-full"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  camera.setIsCapturing(true);
                  camera.captureFromWebcam(videoRef as React.RefObject<HTMLVideoElement>);
                  camera.setIsCapturing(false);
                }}
                disabled={camera.isCapturing}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-900 font-bold px-6 py-2 rounded-full shadow-lg hover:bg-slate-100 transition-all disabled:opacity-50 text-sm"
              >
                {camera.isCapturing ? 'Capturando...' : 'Fotografar'}
              </button>
            </div>
          )}
          {activeTab === 'webcam' && !camera.stream && !camera.error && (
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Iniciando câmera...</p>
            </div>
          )}

          {/* ── Mobile ── */}
          {activeTab === 'mobile' && (
            <div className="flex flex-col items-center gap-3 p-4 text-center">
              <Smartphone className={`w-10 h-10 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Toque no botão para abrir a câmera.
              </p>
              <button
                onClick={() => mobileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all"
              >
                Abrir câmera
              </button>
            </div>
          )}

          {/* ── Upload ── */}
          {activeTab === 'upload' && (
            <div
              className="flex flex-col items-center gap-3 p-4 text-center w-full h-full justify-center"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const droppedFiles = Array.from(e.dataTransfer.files ?? []);
                if (droppedFiles.length === 0) return;
                if (!allowMultiple || droppedFiles.length === 1) {
                  camera.handleFileUpload(droppedFiles[0]);
                } else {
                  // Simular evento para reusar o handler
                  const dt = new DataTransfer();
                  droppedFiles.forEach(f => dt.items.add(f));
                  const fakeEvent = { target: { files: dt.files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleFileInputChange(fakeEvent);
                }
              }}
            >
              <Upload className={`w-10 h-10 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {allowMultiple
                  ? 'Arraste arquivos aqui ou clique para selecionar vários.'
                  : 'Arraste uma imagem aqui ou clique para selecionar.'}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all"
              >
                {allowMultiple ? 'Selecionar arquivos' : 'Selecionar arquivo'}
              </button>
            </div>
          )}

          {/* ── URL ── */}
          {activeTab === 'url' && (
            <div className="flex flex-col items-center gap-3 p-4 w-full">
              <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Cole o link suspeito para análise
              </p>
              <input
                type="url"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setUrlError(''); }}
                placeholder="https://exemplo.com"
                className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none font-mono ${
                  isDark
                    ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-indigo-500'
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-indigo-500'
                }`}
              />
              {urlError && (
                <p className="text-red-400 text-xs">{urlError}</p>
              )}
              <button
                onClick={() => {
                  const trimmed = urlInput.trim();
                  if (!trimmed) { setUrlError('Cole uma URL válida.'); return; }
                  const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
                  try { new URL(normalized); } catch { setUrlError('URL inválida.'); return; }
                  props.onUrlCapture?.(normalized);
                }}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all"
              >
                Analisar link
              </button>
            </div>
          )}

          {/* ── Companion ── */}
          {activeTab === 'companion' && (
            <div className="flex flex-col items-center gap-3 p-3 w-full justify-center">
              {companion.status === 'generating' && (
                <>
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Gerando QR Code...</p>
                </>
              )}

              {companion.status === 'waiting' && companion.qrCodeUrl && (
                <>
                  <div className={`p-2 rounded-2xl ${isDark ? 'bg-white' : 'bg-white border border-gray-200'}`}>
                    <Image
                      src={companion.qrCodeUrl}
                      alt="QR Code para upload"
                      width={160}
                      height={160}
                      unoptimized
                    />
                  </div>
                  {companion.uploadUrl && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <span className={`flex-1 text-xs font-mono truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {companion.uploadUrl}
                      </span>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(companion.uploadUrl!);
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }}
                        title="Copiar link"
                        className={`shrink-0 p-1.5 rounded-lg transition-all ${
                          isDark
                            ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                            : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        {copiedUrl
                          ? <Check className="w-3.5 h-3.5 text-green-400" />
                          : <Copy className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  )}

                  <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <Timer className="w-3.5 h-3.5 shrink-0" />
                    <span>Expira em {formatCountdown(companion.timeLeft)}</span>
                  </div>
                  <div className={`w-full h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(companion.timeLeft / 600) * 100}%` }}
                    />
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    Aguardando envio do celular...
                  </p>
                </>
              )}

              {companion.status === 'received' && (
                <>
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
                    <Camera className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <p className={`text-sm font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>Imagem recebida!</p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Processando...</p>
                </>
              )}

              {companion.status === 'expired' && (
                <>
                  <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>QR Code expirado.</p>
                  <button
                    onClick={() => companion.start()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
                  >
                    <RefreshCw className="w-4 h-4" />Gerar novo QR Code
                  </button>
                </>
              )}

              {companion.error && (
                <div className={`px-3 py-2 rounded-xl text-xs w-full ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                  {companion.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inputs ocultos */}
      <input
        ref={mobileInputRef}
        type="file"
        accept={acceptedTypes}
        capture="environment"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) camera.handleMobileCapture(file);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={props.acceptPdf ? 'image/*,application/pdf' : (acceptedTypes ?? 'image/*')}
        multiple={allowMultiple}
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Erro de câmera */}
      {camera.error && (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          <ZapOff className="w-4 h-4 shrink-0 mt-0.5" />
          {camera.error}
        </div>
      )}
    </div>
  );
}