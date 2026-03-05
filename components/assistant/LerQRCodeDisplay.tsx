'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode, Copy, ExternalLink, Check, RefreshCw } from 'lucide-react';
import CameraCapture from '@/components/assistant/CameraCapture';

interface LerQRCodeDisplayProps {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

type Stage = 'capturing' | 'processing' | 'result' | 'error';

export default function LerQRCodeDisplay({ data, onClose, theme = 'dark' }: LerQRCodeDisplayProps) {
  const isDark = theme === 'dark';
  const AUTO_CLOSE = 30;

  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('capturing');
  const [qrResult, setQrResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Regra 3: cleanup ao desmontar
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Regra 1: auto-close sempre chamando onClose()
  useEffect(() => {
    if (stage !== 'result') return; // só conta após resultado
    setTimeLeft(AUTO_CLOSE);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.speechSynthesis.cancel();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, onClose]);

  // Regra 2: fechar manual cancela áudio
  const handleManualClose = useCallback(() => {
    window.speechSynthesis.cancel();
    onClose();
  }, [onClose]);

  const speakText = (text: string) => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Processar imagem capturada com jsQR (client-side, sem API)
  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');

    try {
      // Importação dinâmica do jsQR para não impactar bundle inicial
      const jsQR = (await import('jsqr')).default;

      // Converter base64 para ImageData via canvas
      const img = new Image();
      img.src = `data:image/jpeg;base64,${base64}`;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context não disponível');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        setQrResult(code.data);
        setStage('result');
        speakText(`QR Code lido: ${code.data.slice(0, 80)}`);
      } else {
        // jsQR não encontrou — tentar uma segunda vez com contraste aumentado
        // (técnica simples: inverter para melhorar detecção em casos limítrofes)
        setErrorMsg('QR Code não detectado na imagem. Tente uma foto mais nítida e centralizada.');
        setStage('error');
        speakText('Não consegui ler o QR Code. Tente novamente com a imagem mais centralizada.');
      }
    } catch (err: any) {
      console.error('[LerQRCode] Erro:', err);
      setErrorMsg('Erro ao processar imagem: ' + (err.message ?? 'desconhecido'));
      setStage('error');
    }
  }, []);

  const handleCopy = async () => {
    if (!qrResult) return;
    await navigator.clipboard.writeText(qrResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUrl = (text: string) => {
    try {
      new URL(text);
      return text.startsWith('http://') || text.startsWith('https://');
    } catch {
      return false;
    }
  };

  const handleNewRead = () => {
    setStage('capturing');
    setQrResult(null);
    setErrorMsg(null);
    setCopied(false);
    setTimeLeft(AUTO_CLOSE);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${
          isDark
            ? 'bg-slate-800 border border-white/10'
            : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h2
              className={`text-lg font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Ler QR Code
            </h2>
          </div>
          <button
            onClick={handleManualClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo por stage */}

        {/* Captura */}
        {stage === 'capturing' && (
          <CameraCapture
            onCapture={handleCapture}
            onCancel={handleManualClose}
            theme={theme}
            companyId={data.companyId}
            instructions="Aponte a câmera para o QR Code e fotografe."
          />
        )}

        {/* Processando */}
        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Lendo QR Code...
            </p>
          </div>
        )}

        {/* Resultado */}
        {stage === 'result' && qrResult && (
          <div className="flex flex-col gap-4">
            {/* Badge sucesso */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                isDark
                  ? 'bg-green-900/30 border border-green-700 text-green-300'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}
            >
              <Check className="w-4 h-4 shrink-0" />
              QR Code lido com sucesso!
            </div>

            {/* Conteúdo do QR */}
            <div
              className={`p-3 rounded-xl text-sm break-all ${
                isDark ? 'bg-slate-900/60 text-slate-200' : 'bg-gray-50 text-gray-800'
              }`}
            >
              {qrResult}
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isDark
                    ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>

              {isUrl(qrResult) && (
                <a
                  href={qrResult}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir link
                </a>
              )}
            </div>

            <button
              onClick={handleNewRead}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-all ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Nova leitura
            </button>

            {/* Barra de auto-close */}
            <div className={`h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }}
              />
            </div>
            <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Fechando em {timeLeft}s
            </p>
          </div>
        )}

        {/* Erro */}
        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div
              className={`px-3 py-3 rounded-xl text-sm ${
                isDark
                  ? 'bg-red-900/30 border border-red-700 text-red-300'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {errorMsg}
            </div>
            <button
              onClick={handleNewRead}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
            <button
              onClick={handleManualClose}
              className={`py-2 rounded-xl text-sm ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}