'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, ExternalLink, Link } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

interface CanalYoutubeDisplayProps {
  data: {
    channelUrl: string;
    channelName?: string;
    channelDescription?: string;
    autoCloseDuration?: number;
  };
  onClose: () => void;
  playText: (text: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

const OPENING_TEXT =
  'Aqui está o canal do YouTube. Diga abrir para visitar o canal, copiar para copiar o link, ou fechar para sair.';

export default function CanalYoutubeDisplay({
  data,
  onClose,
  playText,
  theme = 'dark',
}: CanalYoutubeDisplayProps) {
  const AUTO_CLOSE = data.autoCloseDuration ?? 30;
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const { channelUrl, channelName, channelDescription } = data;

  // Garante URL completa para APIs externas
  const normalizeUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };
  const fullChannelUrl = normalizeUrl(channelUrl);

  const normalize = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:]+/g, '');

  const handleManualClose = () => {
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleManualClose);

  // QR Code
  useEffect(() => {
    if (fullChannelUrl) {
      setQrCodeUrl(
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullChannelUrl)}&margin=10`
      );
    }
  }, [fullChannelUrl]);

  // OG Image via proxy Next.js — resolve bloqueio do YouTube no microlink
  useEffect(() => {
    if (!fullChannelUrl) return;
    fetch(`/api/og-image?url=${encodeURIComponent(fullChannelUrl)}`)
      .then((r) => r.json())
      .then((d) => { if (d.imageUrl) setPreviewImageUrl(d.imageUrl); })
      .catch(() => {});
  }, [fullChannelUrl]);

  // Countdown auto-close
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
      if (['fechar', 'cancelar', 'sair', 'voltar', 'encerrar'].some((cmd) => t.includes(cmd))) {
        onClose();
        return;
      }
      if (['repetir', 'repete', 'de novo'].some((cmd) => t.includes(cmd))) {
        playText(OPENING_TEXT).catch(() => {});
        return;
      }
      if (['copiar', 'copia', 'copie'].some((cmd) => t.includes(cmd))) {
        navigator.clipboard.writeText(channelUrl);
        playText('Link copiado.').catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      if (['abrir', 'abre', 'ver', 'inscrever', 'inscreva', 'inscricao'].some((cmd) => t.includes(cmd))) {
        window.open(channelUrl, '_blank');
        playText('Abrindo o canal do YouTube.').catch(() => {});
        return;
      }
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(channelUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => window.open(channelUrl, '_blank');

  const isDark = theme === 'dark';
  const displayHandle = channelUrl.match(/@[\w-]+/)?.[0] ?? channelUrl;

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
            <div className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#ef4444">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
              </svg>
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {channelName ? channelName : 'Canal do YouTube'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'}`}>
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
                    <img src={qrCodeUrl} alt="QR Code Canal YouTube" className="w-44 h-44 object-contain" />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                    </div>
                  )}
                </div>
                <p className={`text-xs text-center ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Escaneie para acessar o canal
                </p>
              </div>

              {/* Descrição */}
              {channelDescription && (
                <p className={`text-sm leading-relaxed text-center ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  {channelDescription}
                </p>
              )}

              {/* Handle/Link */}
              <div className={`rounded-xl p-3 flex items-center gap-2 ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                <Link className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                <span className={`text-xs truncate flex-1 font-mono ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  {displayHandle}
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
                  className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-sm font-semibold transition-all inline-flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Canal
                </button>
              </div>

              {/* Voice Hint */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slateate-400' : 'bg-gray-50 text-gray-500'}`}>
                <span>🎤</span>
                <span>Diga <strong>"abrir"</strong>, <strong>"inscrever"</strong>, <strong>"copiar"</strong> ou <strong>"fechar"</strong></span>
              </div>
            </div>

            {/* COLUNA DIREITA: OG Image do canal */}
            <div className={`rounded-xl overflow-hidden border h-full min-h-[420px] ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              {previewImageUrl ? (
                <div className={`relative w-full h-full min-h-[420px] flex items-center justify-center p-4 ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                  <img
                    src={previewImageUrl}
                    alt="Preview do canal"
                    className="w-full h-auto rounded-lg shadow-2xl max-h-[400px] object-contain"
                    onError={() => setPreviewImageUrl(null)}
                  />
                </div>
              ) : (
                <div className={`w-full h-full min-h-[420px] flex flex-col items-center justify-center gap-4 p-8 ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="white">
                      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
                    </svg>
                  </div>
                  <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {/* Mostra loading enquanto busca, placeholder se falhar */}
                    Preview não disponível
                  </p>
                  <p className={`text-sm text-center ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Use o QR Code ou clique em "Abrir Canal"
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
                <img src={qrCodeUrl} alt="QR Code Canal YouTube" className="w-40 h-40 object-contain" />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                </div>
              )}
            </div>

            {channelDescription && (
              <p className={`text-sm text-center ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                {channelDescription}
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
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold transition-all inline-flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Abrir Canal
              </button>
            </div>

            {/* Voice Hint mobile */}
            <div className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
              <span>🎤</span>
              <span>Diga <strong>"abrir"</strong>, <strong>"inscrever"</strong>, <strong>"copiar"</strong> ou <strong>"fechar"</strong></span>
            </div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-red-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
