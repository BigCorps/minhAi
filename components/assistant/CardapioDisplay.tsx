'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UtensilsCrossed, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';

interface CardapioDisplayProps {
  data: {
    menuUrl: string;           // link do PDF ou cardápio digital
    companyName?: string;
    menuDescription?: string;  // ex: "Cardápio completo com pratos e bebidas"
    autoCloseDuration?: number;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function CardapioDisplay({
  data,
  onClose,
  theme = 'dark',
}: CardapioDisplayProps) {
  const AUTO_CLOSE = data.autoCloseDuration ?? 30;
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const { menuUrl, companyName, menuDescription } = data;

  const isPdf = menuUrl?.toLowerCase().includes('.pdf');

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

  // Gerar QR Code do link
  useEffect(() => {
    if (menuUrl) {
      const size = 300;
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(menuUrl)}&margin=10`;
      setQrCodeUrl(url);
    }
  }, [menuUrl]);

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
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    window.open(menuUrl, '_blank');
  };

  // URL de preview via Microlink (funciona para sites e PDFs públicos)
  const previewUrl = !previewError
    ? `https://api.microlink.io?url=${encodeURIComponent(menuUrl)}&screenshot=true&meta=false&embed=screenshot.url`
    : null;

  const isDark = theme === 'dark';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300
          ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
              <UtensilsCrossed className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Cardápio {companyName ? `· ${companyName}` : ''}
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
        <div className="p-8">

          {/* ====== LAYOUT DESKTOP: Grid 2 colunas ====== */}
          <div className="hidden md:grid md:grid-cols-[300px_1fr] gap-8">

            {/* COLUNA ESQUERDA */}
            <div className="flex flex-col gap-5">

              {/* QR Code */}
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-2xl bg-white shadow-lg">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code Cardápio" className="w-44 h-44 object-contain" />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
                    </div>
                  )}
                </div>
                <p className={`text-xs text-center ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Escaneie para acessar o cardápio
                </p>
              </div>

              {/* Descrição */}
              {menuDescription && (
                <p className={`text-sm leading-relaxed text-center ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  {menuDescription}
                </p>
              )}

              {/* Link */}
              <div className={`rounded-xl p-3 flex items-center gap-2 ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                <QrCode className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                <span className={`text-xs truncate flex-1 font-mono ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  {menuUrl}
                </span>
              </div>

              {/* Botões */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopy}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all inline-flex items-center justify-center gap-2
                    ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Link Copiado!' : 'Copiar Link'}
                </button>
                <button
                  onClick={handleOpen}
                  className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-sm font-semibold transition-all inline-flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {isPdf ? 'Abrir PDF' : 'Abrir Cardápio'}
                </button>
              </div>
            </div>

            {/* COLUNA DIREITA: Preview */}
            <div className={`rounded-xl overflow-hidden border h-full min-h-[420px] ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              {isPdf ? (
                // PDF: usar iframe embed direto
                <iframe
                  src={`${menuUrl}#toolbar=0&navpanes=0`}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '420px' }}
                  title="Cardápio PDF"
                  onError={() => setPreviewError(true)}
                />
              ) : previewUrl ? (
                // Site: screenshot via Microlink
                <div className={`relative w-full h-full min-h-[420px] flex items-center justify-center p-4 ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                  <img
                    src={previewUrl}
                    alt="Preview do cardápio"
                    className="w-full h-auto rounded-lg shadow-2xl border-2 border-white/10 max-h-[400px] object-contain"
                    onError={() => setPreviewError(true)}
                  />
                </div>
              ) : (
                // Fallback: sem preview
                <div className={`w-full h-full min-h-[420px] flex flex-col items-center justify-center gap-4 p-8 ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                    <UtensilsCrossed className="w-8 h-8 text-white" />
                  </div>
                  <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Preview não disponível
                  </p>
                  <p className={`text-sm text-center ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Use o QR Code ou clique em "Abrir Cardápio"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ====== LAYOUT MOBILE: Vertical ====== */}
          <div className="md:hidden flex flex-col items-center gap-5">

            {/* QR Code */}
            <div className="p-3 rounded-2xl bg-white shadow-lg">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code Cardápio" className="w-40 h-40 object-contain" />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
                </div>
              )}
            </div>

            {menuDescription && (
              <p className={`text-sm text-center ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                {menuDescription}
              </p>
            )}

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleCopy}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2
                  ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Link Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={handleOpen}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold transition-all inline-flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                {isPdf ? 'Abrir PDF' : 'Abrir Cardápio'}
              </button>
            </div>
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
