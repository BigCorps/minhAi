'use client';

import { useState, useCallback, useEffect } from 'react';

export interface UseCameraCaptureReturn {
  mode: 'idle' | 'webcam' | 'mobile' | 'upload';
  setMode: (mode: 'idle' | 'webcam' | 'mobile' | 'upload') => void;
  capturedImage: string | null;
  isCapturing: boolean;
  setIsCapturing: (v: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  stream: MediaStream | null;
  startWebcam: () => Promise<void>;
  stopWebcam: () => void;
  captureFromWebcam: (videoRef: React.RefObject<HTMLVideoElement>) => string | null;
  handleFileUpload: (file: File) => void;
  handleMobileCapture: (file: File) => void;
  clearCapture: () => void;
}

export function useCameraCapture(): UseCameraCaptureReturn {
  const [mode, setMode] = useState<'idle' | 'webcam' | 'mobile' | 'upload'>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Limpar stream ao desmontar
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const startWebcam = useCallback(async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(s);
      setMode('webcam');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Permissão de câmera negada. Permita o acesso nas configurações do browser.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada neste dispositivo.');
      } else {
        setError('Erro ao acessar câmera: ' + err.message);
      }
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setMode('idle');
  }, [stream]);

  const captureFromWebcam = useCallback(
    (videoRef: React.RefObject<HTMLVideoElement>): string | null => {
      if (!videoRef.current) return null;
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      setCapturedImage(base64);
      stopWebcam();
      return base64;
    },
    [stopWebcam]
  );

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    const base64 = await fileToBase64(file);
    setCapturedImage(base64);
    setMode('upload');
  }, []);

  const handleMobileCapture = useCallback(async (file: File) => {
    const base64 = await fileToBase64(file);
    setCapturedImage(base64);
    setMode('mobile');
  }, []);

  const clearCapture = useCallback(() => {
    setCapturedImage(null);
    setMode('idle');
    setError(null);
  }, []);

  return {
    mode,
    setMode,
    capturedImage,
    isCapturing,
    setIsCapturing,
    error,
    setError,
    stream,
    startWebcam,
    stopWebcam,
    captureFromWebcam,
    handleFileUpload,
    handleMobileCapture,
    clearCapture,
  };
}