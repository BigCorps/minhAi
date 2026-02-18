// ARQUIVO: components/assistant/MeuSistemaDisplay.tsx

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';

interface MeuSistemaDisplayProps {
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function MeuSistemaDisplay({
  onClose,
  theme = 'dark'
}: MeuSistemaDisplayProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const websiteUrl = 'https://eai.app.br';

  // Gerar QR Code
  useEffect(() => {
    QRCode.toDataURL(websiteUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: theme === 'dark' ? '#FFFFFF' : '#000000',
        light: theme === 'dark' ? '#1E293B' : '#FFFFFF',
      },
    })
      .then(setQrCodeDataUrl)
      .catch(err => console.error('Erro ao gerar QR Code:', err));
  }, [theme]);

  // Auto-close após 15 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 15000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Card */}
      <div
        className={`relative w-full max-w-4xl rounded-2xl shadow-2xl transition-colors
          ${theme === 'dark' 
            ? 'bg-slate-800 border border-white/10' 
            : 'bg-white border border-gray-200'
          }
        `}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-lg transition-colors z-10
            ${theme === 'dark'
              ? 'hover:bg-white/10 text-white/70 hover:text-white'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }
          `}
          aria-label="Fechar"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Conteúdo */}
        <div className="p-8">
          {/* Layout Desktop: Horizontal */}
          <div className="hidden md:flex items-center gap-8">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className={`w-48 h-48 rounded-2xl flex items-center justify-center
                ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
              `}>
                <Image
                  src="/favicon.svg"
                  alt="Logo eAi"
                  width={120}
                  height={120}
                  priority
                />
              </div>
            </div>

            {/* Textos */}
            <div className="flex-1">
              <h2 className={`text-3xl font-bold mb-2
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
              `}>
                Sistema eAi
              </h2>
              <p className={`text-lg mb-4
                ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}
              `}>
                Assistente de Voz Inteligente
              </p>
              <p className={`text-base mb-6
                ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}
              `}>
                Transforme o atendimento da sua empresa com inteligência artificial. 
                Escaneie o QR Code para conhecer todas as funcionalidades.
              </p>
              
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Visitar Site
              </a>
            </div>

            {/* QR Code */}
            <div className="flex-shrink-0">
              <div className={`p-4 rounded-xl
                ${theme === 'dark' ? 'bg-white' : 'bg-gray-100'}
              `}>
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code eAi"
                    className="w-48 h-48"
                  />
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

          {/* Layout Mobile: Vertical */}
          <div className="md:hidden flex flex-col items-center text-center gap-6">
            {/* Logo */}
            <div className={`w-32 h-32 rounded-2xl flex items-center justify-center
              ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
            `}>
              <Image
                src="/favicon.svg"
                alt="Logo eAi"
                width={80}
                height={80}
                priority
              />
            </div>

            {/* Textos */}
            <div>
              <h2 className={`text-2xl font-bold mb-2
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
              `}>
                Sistema eAi
              </h2>
              <p className={`text-base mb-4
                ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}
              `}>
                Assistente de Voz Inteligente
              </p>
              <p className={`text-sm mb-6
                ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}
              `}>
                Transforme o atendimento da sua empresa com IA
              </p>
            </div>

            {/* QR Code */}
            <div>
              <div className={`p-3 rounded-xl inline-block
                ${theme === 'dark' ? 'bg-white' : 'bg-gray-100'}
              `}>
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code eAi"
                    className="w-40 h-40"
                  />
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

            {/* Botão */}
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Visitar Site
            </a>
          </div>
        </div>

        {/* Barra de progresso (15 segundos) */}
        <div className={`h-1 
          ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}
        `}>
          <div
            className="h-full bg-indigo-600 animate-[shrink_15s_linear]"
            style={{
              animation: 'shrink 15s linear forwards'
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
