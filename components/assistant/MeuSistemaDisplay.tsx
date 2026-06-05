'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom'
import { X } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import TourModal from '@/components/tour/TourModal';

function unlockAudioContext(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const buffer = ctx.createBuffer(1, 1024, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
    if (ctx.state === 'suspended') ctx.resume()
  } catch { /* SSR */ }
}

interface MeuSistemaDisplayProps {
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function MeuSistemaDisplay({
  onClose,
  theme = 'dark'
}: MeuSistemaDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(20);
  const [tourOpen, setTourOpen] = useState(false);
  const [countdownActive, setCountdownActive] = useState(true);
  const websiteUrl = 'https://minhai.app';

  const handleManualClose = useCallback(() => {
    window.speechSynthesis.cancel();
    onClose();
  }, [onClose]);

  useModalVoiceClose(handleManualClose);

  // Gerar QR Code
  useEffect(() => {
    const size = 400;
    const qrUrl = `/api/qrcode?size=${size}&data=${encodeURIComponent(websiteUrl)}&color=%23000080`;
    setQrCodeUrl(qrUrl);
  }, []);

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // Countdown — pausa quando o tour está aberto
  useEffect(() => {
    if (!countdownActive) return;
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
  }, [countdownActive, onClose]);

  // Abre o tour — para ambos os sistemas de áudio e pausa countdown
  const handleOpenTour = useCallback(() => {
    window.speechSynthesis.cancel()
    // Para o áudio HTML do VoiceAssistant (useAudioPlayer / currentAudioRef)
    window.dispatchEvent(new CustomEvent('eai:stopAudio'))
    unlockAudioContext()
    setCountdownActive(false)
    setTourOpen(true)
  }, [])

  // Fecha o tour → opção A: fecha o MeuSistemaDisplay também
  const handleTourClose = useCallback(() => {
    setTourOpen(false);
    handleManualClose();
  }, [handleManualClose]);

  return createPortal(
    <>
      {/* ── Card principal — oculto quando tour está aberto ── */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ display: tourOpen ? 'none' : undefined }}
      >
        <div
          className={`relative w-full max-w-4xl rounded-2xl shadow-2xl transition-colors overflow-hidden animate-in zoom-in duration-300
            ${theme === 'dark'
              ? 'bg-slate-800 border border-white/10'
              : 'bg-white border border-gray-200'
            }
          `}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b
            ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}
          `}>
            <h2 className={`text-xl font-bold
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
            `}>
              minhAi
            </h2>

            <div className="flex items-center gap-3">
              {/* Countdown — some quando tour aberto */}
              {!tourOpen && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium
                  ${theme === 'dark'
                    ? 'bg-indigo-900/30 text-indigo-300'
                    : 'bg-indigo-100 text-indigo-700'
                  }
                `}>
                  {timeLeft}s
                </div>
              )}

              <button
                onClick={handleManualClose}
                className={`p-2 rounded-lg transition-colors
                  ${theme === 'dark'
                    ? 'hover:bg-white/10 text-white/70 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }
                `}
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-8">
            {/* Layout Desktop */}
            <div className="hidden md:flex items-center gap-8">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 flex items-center justify-center">
                  <img
                    src="/logo-circle.png"
                    alt="Logo minhAi"
                    className="w-full h-full object-contain"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
              </div>

              {/* Textos */}
              <div className="flex-1 text-center">
                <h3 className={`text-3xl font-bold mb-2
                  ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
                `}>
                  minhAi, sou uma IA pra chamar de sua! Um funcionário autônomo de voz e texto com Inteligência Artificial!
                </h3>
                <p className={`text-lg mb-4
                  ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}
                `}>
                  Escaneie o QR Code para saber mais sobre como meu sistema funciona e suas funcionalidades.
                </p>
                <p className={`text-base mb-6
                  ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}
                `}>
                  www.minhai.app
                </p>

                <div className="flex items-center justify-center gap-3">
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Visitar Site
                  </a>

                  {/* ── Botão Como Funciono ── */}
                  <button
                    onClick={handleOpenTour}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: theme === 'dark'
                        ? 'rgba(59,130,246,0.15)'
                        : 'rgba(59,130,246,0.08)',
                      border: `1.5px solid ${theme === 'dark' ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.3)'}`,
                      color: theme === 'dark' ? '#60a5fa' : '#2563eb',
                    }}
                  >
                    {/* Ícone play */}
                    <span
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 22, height: 22,
                        background: theme === 'dark' ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 ml-0.5">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    Como Funciono?
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex-shrink-0">
                <div className="p-4 rounded-xl bg-white">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code minhAi" className="w-48 h-48 object-contain" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                    </div>
                  )}
                </div>
                <p className={`text-sm text-center mt-2
                  ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}
                `}>
                  Escaneie para saber mais
                </p>
              </div>
            </div>

            {/* Layout Mobile */}
            <div className="md:hidden flex flex-col items-center text-center gap-6">
              <div className="w-32 h-32 flex items-center justify-center">
                <img
                  src="/logo-circle.png"
                  alt="Logo minhAi"
                  className="w-full h-full object-contain"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              </div>

              <div>
                <h3 className={`text-2xl font-bold mb-2
                  ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
                `}>
                  minhAi, uma IA pra chamar de sua! Um funcionário autônomo de voz e texto com Inteligência Artificial!
                </h3>
                <p className={`text-base mb-4
                  ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}
                `}>
                  Escaneie o QR Code para saber mais sobre como meu sistema funciona e suas funcionalidades.
                </p>
                <p className={`text-sm mb-6
                  ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}
                `}>
                  www.minhai.app
                </p>
              </div>

              <div>
                <div className="p-3 rounded-xl inline-block bg-white">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code minhAi" className="w-40 h-40 object-contain" />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                    </div>
                  )}
                </div>
                <p className={`text-sm mt-2
                  ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}
                `}>
                  Escaneie para saber mais
                </p>
              </div>

              <div className="w-full flex flex-col gap-2">
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-center"
                >
                  Visitar Site
                </a>

                {/* ── Botão Como Funciono mobile ── */}
                <button
                  onClick={handleOpenTour}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 active:scale-95"
                  style={{
                    background: theme === 'dark'
                      ? 'rgba(59,130,246,0.15)'
                      : 'rgba(59,130,246,0.08)',
                    border: `1.5px solid ${theme === 'dark' ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.3)'}`,
                    color: theme === 'dark' ? '#60a5fa' : '#2563eb',
                  }}
                >
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 20, height: 20,
                      background: theme === 'dark' ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 ml-0.5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  Como Funciono?
                </button>
              </div>
            </div>
          </div>

          {/* Barra de progresso — some quando tour aberto */}
          {!tourOpen && (
            <div className={`h-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <div
                className="h-full bg-indigo-600 transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / 20) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── TourModal — abre sobre o MeuSistemaDisplay ── */}
      <TourModal
        isOpen={tourOpen}
        onClose={handleTourClose}
        initialTheme={theme}
      />
    </>,
    document.body
  );
}