'use client';

import { useEffect, useRef } from 'react';
import { Camera, Upload, Smartphone, X, ZapOff, QrCode, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useCameraCapture } from '@/components/VoiceAssistant/hooks/useCameraCapture';
import { useCompanionUpload } from '@/components/VoiceAssistant/hooks/useCompanionUpload';
import { useState } from 'react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
  theme?: 'dark' | 'light';
  acceptedTypes?: string;
  instructions?: string;
  companyId: string; // obrigatório para a aba "Enviar do Celular"
}

type Tab = 'webcam' | 'mobile' | 'upload' | 'companion';

export default function CameraCapture({
  onCapture,
  onCancel,
  theme = 'dark',
  acceptedTypes = 'image/*',
  instructions,
  companyId,
}: CameraCaptureProps) {
  const isDark = theme === 'dark';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const [activeTab, setActiveTab] = useState<Tab>(isMobile ? 'mobile' : 'webcam');

  const camera = useCameraCapture();
  const companion = useCompanionUpload({
    companyId,
    onImageReceived: (base64) => {
      onCapture(base64);
    },
  });

  // Conectar stream ao vídeo
  useEffect(() => {
    if (camera.stream && videoRef.current) {
      videoRef.current.srcObject = camera.stream;
    }
  }, [camera.stream]);

  // Iniciar companion ao entrar na aba; cancelar ao sair
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

  const handleTabChange = (tab: Tab) => {
    if (tab !== 'webcam') camera.stopWebcam();
    setActiveTab(tab);
    if (tab === 'webcam') camera.startWebcam();
    if (tab === 'mobile') mobileInputRef.current?.click();
    if (tab === 'upload') fileInputRef.current?.click();
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

  return (
    <div className="flex flex-col gap-4">
      {/* Instruções */}
      {instructions && (
        <p className={`text-sm text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {instructions}
        </p>
      )}

      {/* Abas */}
      <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
        <button onClick={() => handleTabChange('webcam')} className={tabClass(activeTab === 'webcam')}>
          <Camera className="w-3.5 h-3.5" /><span>Webcam</span>
        </button>
        <button onClick={() => handleTabChange('mobile')} className={tabClass(activeTab === 'mobile')}>
          <Smartphone className="w-3.5 h-3.5" /><span>Câmera</span>
        </button>
        <button onClick={() => handleTabChange('upload')} className={tabClass(activeTab === 'upload')}>
          <Upload className="w-3.5 h-3.5" /><span>Upload</span>
        </button>
        <button onClick={() => handleTabChange('companion')} className={tabClass(activeTab === 'companion')}>
          <QrCode className="w-3.5 h-3.5" /><span>Celular</span>
        </button>
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
        accept={acceptedTypes}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) camera.handleFileUpload(file);
          e.target.value = '';
        }}
      />

      {/* Área de conteúdo */}
      <div
        className={`relative rounded-xl overflow-hidden flex items-center justify-center min-h-[200px] ${
          isDark ? 'bg-slate-900/50' : 'bg-gray-50'
        }`}
      >
        {/* ── Webcam ── */}
        {activeTab === 'webcam' && camera.stream && (
          <div className="relative w-full">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
            <button
              onClick={() => {
                camera.setIsCapturing(true);
                camera.captureFromWebcam(videoRef as React.RefObject<HTMLVideoElement>);
                camera.setIsCapturing(false);
              }}
              disabled={camera.isCapturing}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-900 font-bold px-6 py-2 rounded-full shadow-lg hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              {camera.isCapturing ? 'Capturando...' : '📸 Fotografar'}
            </button>
          </div>
        )}
        {activeTab === 'webcam' && !camera.stream && (
          <div className="flex flex-col items-center gap-2 p-6">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Iniciando câmera...</p>
          </div>
        )}

        {/* ── Mobile / Upload (idle) ── */}
        {(activeTab === 'mobile' || activeTab === 'upload') && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            {activeTab === 'mobile'
              ? <Smartphone className={`w-12 h-12 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              : <Upload className={`w-12 h-12 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
            }
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {activeTab === 'mobile'
                ? 'Toque abaixo para abrir a câmera do celular.'
                : 'Toque abaixo para selecionar um arquivo.'}
            </p>
            <button
              onClick={() => activeTab === 'mobile' ? mobileInputRef.current?.click() : fileInputRef.current?.click()}
              className="mt-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all"
            >
              {activeTab === 'mobile' ? '📷 Abrir câmera' : '📁 Selecionar arquivo'}
            </button>
          </div>
        )}

        {/* ── Companion — Enviar do Celular ── */}
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

      {/* Erro de câmera */}
      {camera.error && (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          <ZapOff className="w-4 h-4 shrink-0 mt-0.5" />
          {camera.error}
        </div>
      )}

      {/* Cancelar */}
      <button
        onClick={handleCancel}
        className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        <X className="w-4 h-4" />Cancelar
      </button>
    </div>
  );
}