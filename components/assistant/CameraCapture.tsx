'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, Smartphone, ZapOff, QrCode, RefreshCw, Timer } from 'lucide-react';
import Image from 'next/image';
import { useCameraCapture } from '@/components/VoiceAssistant/hooks/useCameraCapture';
import { useCompanionUpload } from '@/components/VoiceAssistant/hooks/useCompanionUpload';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
  theme?: 'dark' | 'light';
  acceptedTypes?: string;
  instructions?: string;
  companyId: string;
  // NOVO — aba inicial
  defaultTab?: Tab;
  // NOVO — quais abas mostrar
  enabledTabs?: Tab[];
  // NOVO — aceitar PDF no upload
  acceptPdf?: boolean;
  // NOVO — estado controlado externamente
  activeTab?: Tab;
  // NOVO — callback ao mudar aba
  onTabChange?: (tab: Tab) => void;
  // NOVO — para acionar captura externamente
  captureRef?: React.MutableRefObject<(() => void) | null>;
  // NOVO — ref do vídeo para scan automático no modal pai
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';

export default function CameraCapture(props: CameraCaptureProps) {
  const {
    onCapture,
    onCancel,
    theme = 'dark',
    acceptedTypes = 'image/*',
    instructions,
    companyId,
  } = props;

  const isDark = theme === 'dark';
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = props.videoRef ?? internalVideoRef;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Detectar mobile para mostrar/ocultar aba "Câmera"
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  // Estado controlado vs interno
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

  // Iniciar aba inicial na montagem + cleanup ao desmontar
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

  // Conectar stream ao vídeo quando disponível
  useEffect(() => {
    if (camera.stream && videoRef.current) {
      videoRef.current.srcObject = camera.stream;
    }
  }, [camera.stream]);

  // Reagir quando o pai muda activeTab via prop
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

  // Notificar quando câmera local capturou imagem
  useEffect(() => {
    if (camera.capturedImage) {
      onCapture(camera.capturedImage);
    }
  }, [camera.capturedImage, onCapture]);

  // Expor captureRef para o modal pai acionar "fotografar" por voz
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
    // upload: sem auto-click
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

  // Lista de abas — aba "Câmera" só aparece em mobile
  const allTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'companion', label: 'Celular', icon: <QrCode className="w-3.5 h-3.5" /> },
    { id: 'webcam',    label: 'Webcam',  icon: <Camera className="w-3.5 h-3.5" /> },
    ...(isMobile ? [{ id: 'mobile' as Tab, label: 'Câmera', icon: <Smartphone className="w-3.5 h-3.5" /> }] : []),
    { id: 'upload',    label: 'Upload',  icon: <Upload className="w-3.5 h-3.5" /> },
  ];
  const visibleTabs = props.enabledTabs
    ? allTabs.filter(t => props.enabledTabs!.includes(t.id))
    : allTabs;

  // Altura fixa da área de conteúdo para não mudar o tamanho do card entre abas
  const CONTENT_H = 'h-[240px]';

  return (
    <div className="flex flex-col gap-3">
      {instructions && (
        <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {instructions}
        </p>
      )}

      {/* Layout: abas à esquerda (coluna), conteúdo à direita */}
      <div className="flex gap-3 items-start">

        {/* Coluna de abas — largura fixa, altura igual ao conteúdo */}
        <div className={`flex flex-col gap-1 p-1 rounded-xl shrink-0 w-24 ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={tabClass(activeTab === tab.id)}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Área de conteúdo — altura fixa para não variar entre abas */}
        <div
          className={`flex-1 relative rounded-xl overflow-hidden flex items-center justify-center ${CONTENT_H} ${
            isDark ? 'bg-slate-900/50' : 'bg-gray-50'
          }`}
        >
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

          {/* ── Mobile (só aparece em dispositivos mobile) ── */}
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
                const file = e.dataTransfer.files?.[0];
                if (file) camera.handleFileUpload(file);
              }}
            >
              <Upload className={`w-10 h-10 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Arraste uma imagem aqui ou clique para selecionar.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all"
              >
                Selecionar arquivo
              </button>
            </div>
          )}

          {/* ── Companion ── */}
          {activeTab === 'companion' && (
            <div className="flex flex-col items-center gap-3 p-3 w-full h-full justify-center overflow-y-auto">
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
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) camera.handleFileUpload(file);
          e.target.value = '';
        }}
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


interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
  theme?: 'dark' | 'light';
  acceptedTypes?: string;
  instructions?: string;
  companyId: string;
  // NOVO — aba inicial
  defaultTab?: Tab;
  // NOVO — quais abas mostrar
  enabledTabs?: Tab[];
  // NOVO — aceitar PDF no upload
  acceptPdf?: boolean;
  // NOVO — estado controlado externamente
  activeTab?: Tab;
  // NOVO — callback ao mudar aba
  onTabChange?: (tab: Tab) => void;
  // NOVO — para acionar captura externamente
  captureRef?: React.MutableRefObject<(() => void) | null>;
  // NOVO — ref do vídeo para scan automático no modal pai
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';

export default function CameraCapture(props: CameraCaptureProps) {
  const {
    onCapture,
    onCancel,
    theme = 'dark',
    acceptedTypes = 'image/*',
    instructions,
    companyId,
  } = props;

  const isDark = theme === 'dark';
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = props.videoRef ?? internalVideoRef;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // MUDANÇA 2: estado controlado vs interno
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

  // Conectar stream ao vídeo quando disponível
  useEffect(() => {
    if (camera.stream && videoRef.current) {
      videoRef.current.srcObject = camera.stream;
    }
  }, [camera.stream]);

  // Gerenciar companion ao entrar/sair da aba
  useEffect(() => {
    if (activeTab === 'companion' && companion.status === 'idle') {
      companion.start();
    }
    if (activeTab !== 'companion' && companion.status === 'waiting') {
      companion.cancel();
    }
  }, [activeTab]); // eslint-disable-line

  // Notificar quando câmera local capturou imagem
  useEffect(() => {
    if (camera.capturedImage) {
      onCapture(camera.capturedImage);
    }
  }, [camera.capturedImage, onCapture]);

  // Parar webcam ao desmontar
  useEffect(() => {
    return () => {
      camera.stopWebcam();
    };
  }, []); // eslint-disable-line

  // MUDANÇA 3: expor captureRef para o modal pai acionar "fotografar" por voz
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
    setActiveTab(tab);

    if (tab === 'webcam') {
      camera.startWebcam();
    }
    if (tab === 'mobile') {
      mobileInputRef.current?.click();
    }
    // upload: NÃO chamar click — usuário arrasta ou clica no botão
  };

  const handleCancel = () => {
    camera.stopWebcam();
    camera.clearCapture();
    companion.cancel();
    onCancel();
  };

  const tabClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1 py-2 px-1 text-xs font-medium rounded-lg transition-all ${
      active
        ? 'bg-indigo-600 text-white'
        : isDark
        ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  const formatCountdown = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  // MUDANÇA 4: lista de abas filtrada por enabledTabs
  const visibleTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'companion' as const, label: 'Celular', icon: <QrCode className="w-3.5 h-3.5" /> },
    { id: 'webcam'   as const, label: 'Webcam',  icon: <Camera className="w-3.5 h-3.5" /> },
    { id: 'mobile'   as const, label: 'Câmera',  icon: <Smartphone className="w-3.5 h-3.5" /> },
    { id: 'upload'   as const, label: 'Upload',  icon: <Upload className="w-3.5 h-3.5" /> },
  ].filter(t => !props.enabledTabs || props.enabledTabs.includes(t.id));

  return (
    <div className="flex flex-col gap-4">
      {instructions && (
        <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {instructions}
        </p>
      )}

      {/* MUDANÇA 5: layout responsivo — abas em cima no mobile, à esquerda no desktop */}
      <div className="flex flex-col sm:flex-row sm:gap-4 sm:items-start">
        {/* Abas */}
        <div className={`
          flex gap-1 p-1 rounded-xl
          sm:flex-col sm:w-36 sm:shrink-0
          ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}
        `}>
          {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={tabClass(activeTab === tab.id)}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Área de conteúdo */}
        <div
          className={`flex-1 relative rounded-xl overflow-hidden flex items-center justify-center min-h-[200px] ${
            isDark ? 'bg-slate-900/50' : 'bg-gray-50'
          }`}
        >
          {/* ── Webcam ── */}
          {activeTab === 'webcam' && camera.stream && (
            <div className="relative w-full">
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
              {/* MUDANÇA 6: botão "Virar câmera" */}
              <button
                onClick={() => {
                  camera.stopWebcam();
                  camera.flipCamera();
                }}
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
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-900 font-bold px-6 py-2 rounded-full shadow-lg hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                {camera.isCapturing ? 'Capturando...' : 'Fotografar'}
              </button>
            </div>
          )}
          {activeTab === 'webcam' && !camera.stream && !camera.error && (
            <div className="flex flex-col items-center gap-2 p-6">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Iniciando câmera...</p>
            </div>
          )}

          {/* ── Mobile ── */}
          {activeTab === 'mobile' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <Smartphone className={`w-12 h-12 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Toque no botão para abrir a câmera do celular.
              </p>
              <button
                onClick={() => mobileInputRef.current?.click()}
                className="mt-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all"
              >
                Abrir câmera
              </button>
            </div>
          )}

          {/* ── Upload ── */}
          {activeTab === 'upload' && (
            <div
              className="flex flex-col items-center gap-3 p-6 text-center w-full h-full"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) camera.handleFileUpload(file);
              }}
            >
              <Upload className={`w-12 h-12 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Arraste uma imagem aqui ou clique para selecionar.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all"
              >
                Selecionar arquivo
              </button>
            </div>
          )}

          {/* ── Companion ── */}
          {activeTab === 'companion' && (
            <div className="flex flex-col items-center gap-4 p-4 w-full">
              {companion.status === 'generating' && (
                <>
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Gerando QR Code...</p>
                </>
              )}

              {companion.status === 'waiting' && companion.qrCodeUrl && (
                <>
                  <p className={`text-sm font-medium text-center ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Aponte o celular para o QR Code
                  </p>
                  <div className={`p-3 rounded-2xl ${isDark ? 'bg-white' : 'bg-white border border-gray-200'}`}>
                    <Image
                      src={companion.qrCodeUrl}
                      alt="QR Code para upload"
                      width={200}
                      height={200}
                      unoptimized
                    />
                  </div>
                  {companion.uploadUrl && (
                    <p className={`text-xs text-center break-all px-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {companion.uploadUrl}
                    </p>
                  )}
                  <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <span>⏱</span>
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
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-500/20 text-2xl">✅</div>
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
      {/* MUDANÇA 8: aceitar PDF quando acceptPdf=true */}
      <input
        ref={fileInputRef}
        type="file"
        accept={props.acceptPdf ? 'image/*,application/pdf' : (acceptedTypes ?? 'image/*')}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) camera.handleFileUpload(file);
          e.target.value = '';
        }}
      />

      {/* Erro de câmera */}
      {camera.error && (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          <ZapOff className="w-4 h-4 shrink-0 mt-0.5" />
          {camera.error}
        </div>
      )}

      {/* MUDANÇA 7: botão Cancelar removido — o X no header do modal pai é suficiente */}
    </div>
  );
}