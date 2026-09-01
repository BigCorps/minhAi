'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UtensilsCrossed, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

interface CardapioDisplayProps {
  data: {
    menuUrl: string;
    companyName?: string;
    menuDescription?: string;
    companyId?: string; 
    autoCloseDuration?: number;
  };
  onClose: () => void;
  playText: (text: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

const OPENING_TEXT = 'Aqui está o cardápio. Diga abrir para ver no navegador, copiar para copiar o link, ou fechar para sair.';

export default function CardapioDisplay({
  data,
  onClose,
  playText,
  theme = 'dark',
}: CardapioDisplayProps) {
  const AUTO_CLOSE = data.autoCloseDuration ?? 30;
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const { menuUrl, companyName, menuDescription, companyId } = data;

  const isPdf = menuUrl?.toLowerCase().includes('.pdf');

  const normalize = (text: string) =>
    text.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:]+/g, '');

  const handleManualClose = () => {
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleManualClose);

  useEffect(() => {
    if (menuUrl) {
      const size = 300;
      const url = `/api/qrcode?size=${size}&data=${encodeURIComponent(menuUrl)}&color=%23000080${companyId ? `&company_id=${companyId}` : ''}`;
      setQrCodeUrl(url);
    }
  }, [menuUrl]);

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

useModalVoiceCommand({
  active: true,
  onTranscript: (transcript) => {
    const t = normalize(transcript);

    if (['fechar', 'cancelar', 'sair', 'voltar', 'encerrar'].some(cmd => t.includes(cmd))) {
      onClose();
      return;
    }

    if (['repetir', 'repete', 'de novo'].some(cmd => t.includes(cmd))) {
      playText(OPENING_TEXT).catch(() => {});
      return;
    }

    if (['copiar', 'copia', 'copie'].some(cmd => t.includes(cmd))) {
      navigator.clipboard.writeText(menuUrl);
      playText('Link copiado.').catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    if (['abrir', 'abre', 'ver', 'abrir cardapio', 'abrir pdf'].some(cmd => t.includes(cmd))) {
      window.open(menuUrl, '_blank');
      playText('Abrindo o cardápio.').catch(() => {});
      return;
    }
  }
});

  const handleCopy = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    window.open(menuUrl, '_blank');
  };

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
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
              <UtensilsCrossed className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Cardápio {companyName ? `· ${companyName}` : ''}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
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

          {/* LAYOUT DESKTOP */}
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
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
                <QrCode className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
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
                  className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-semibold transition-all inline-flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {isPdf ? 'Abrir PDF' : 'Abrir Cardápio'}
                </button>
              </div>

              {/* Voice Hint */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                <span>🎤</span>
                <span>Diga <strong>"abrir"</strong>, <strong>"copiar"</strong>, <strong>"repetir"</strong> ou <strong>"fechar"</strong></span>
              </div>
            </div>

            {/* COLUNA DIREITA: Preview */}
            <div className={`rounded-xl overflow-hidden border h-full min-h-[420px] ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              {isPdf ? (
                <iframe
                  src={`${menuUrl}#toolbar=0&navpanes=0`}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '420px' }}
                  title="Cardápio PDF"
                  onError={() => setPreviewError(true)}
                />
              ) : previewUrl ? (
                <div className={`relative w-full h-full min-h-[420px] flex items-center justify-center p-4 ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                  <img
                    src={previewUrl}
                    alt="Preview do cardápio"
                    className="w-full h-auto rounded-lg shadow-2xl border-2 border-white/10 max-h-[400px] object-contain"
                    onError={() => setPreviewError(true)}
                  />
                </div>
              ) : (
                <div className={`w-full h-full min-h-[420px] flex flex-col items-center justify-center gap-4 p-8 ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
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

          {/* LAYOUT MOBILE */}
          <div className="md:hidden flex flex-col items-center gap-5">

            {/* QR Code */}
            <div className="p-3 rounded-2xl bg-white shadow-lg">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code Cardápio" className="w-40 h-40 object-contain" />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold transition-all inline-flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                {isPdf ? 'Abrir PDF' : 'Abrir Cardápio'}
              </button>
            </div>

            {/* Voice Hint mobile */}
            <div className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
              <span>Diga <strong>"abrir"</strong>, <strong>"copiar"</strong>, <strong>"repetir"</strong> ou <strong>"fechar"</strong></span>
            </div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
