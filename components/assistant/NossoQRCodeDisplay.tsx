'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode, Copy, Check } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';

interface NossoQRCodeDisplayProps {
  data: {
    qrContent: string;       // qualquer conteúdo: URL, texto, Pix, etc.
    qrLabel: string;         // texto curto que o assistente fala e exibe
    companyName?: string;
    autoCloseDuration?: number;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function NossoQRCodeDisplay({
  data,
  onClose,
  theme = 'dark',
}: NossoQRCodeDisplayProps) {
  const AUTO_CLOSE = data.autoCloseDuration ?? 30;
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const { qrContent, qrLabel, companyName } = data;

  // Regra 2
  const handleManualClose = () => {
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleManualClose);

  // Regra 3
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // Gerar QR Code
  useEffect(() => {
    if (qrContent) {
      const size = 400;
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrContent)}&margin=10`;
      setQrCodeUrl(url);
    }
  }, [qrContent]);

  // Regra 1: auto-close
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.speechSynthesis.cancel();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDark = theme === 'dark';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300
          ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
              <QrCode className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              QR Code {companyName ? `· ${companyName}` : ''}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
              {timeLeft}s
            </div>
            <button
              onClick={handleManualClose}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-8 flex flex-col items-center gap-6">

          {/* QR Code centralizado e grande */}
          <div className="p-4 rounded-2xl bg-white shadow-lg">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-56 h-56 object-contain" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
              </div>
            )}
          </div>

          {/* Texto/Label — falado pelo assistente */}
          <div className={`w-full rounded-xl px-5 py-4 text-center ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
            <p className={`text-base font-medium leading-relaxed ${isDark ? 'text-white/90' : 'text-gray-800'}`}>
              {qrLabel}
            </p>
          </div>

          {/* Conteúdo do QR (copiável) */}
          <div className={`w-full rounded-xl p-3 flex items-center gap-2 ${isDark ? 'bg-slate-700/30' : 'bg-gray-50 border border-gray-200'}`}>
            <span className={`text-xs truncate flex-1 font-mono ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {qrContent}
            </span>
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
                ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-white hover:bg-gray-200 text-gray-900 border border-gray-300'}`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-orange-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
