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
  defaultTab?: Tab;
  enabledTabs?: Tab[];
  acceptPdf?: boolean;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  captureRef?: React.MutableRefObject<(() => void) | null>;
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

  const [isMobile, setIsMobile] = useState(false);
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
  ];
  const visibleTabs = props.enabledTabs
    ? allTabs.filter(t => props.enabledTabs!.includes(t.id))
    : allTabs;

  // MUDANÇA 2: altura mínima que cresce se precisar
  const CONTENT_H = 'min-h-[200px]';

  return (
    <div className="flex flex-col gap-3">
      {instructions && (
        <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {instructions}
        </p>
      )}

      {/* MUDANÇA 1: abas horizontais em cima, conteúdo embaixo */}
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
            /* MUDANÇA 3: removido overflow-y-auto e h-full */
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