// components/assistant/MeuSistemaDisplay.tsx

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

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
  const websiteUrl = 'https://eai.app.br';

 // ✅ SOLUÇÃO SIMPLES: Gerar QR Code direto via API (sem Edge Function)
  useEffect(() => {
    const size = 400;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(websiteUrl)}&margin=10`;
    setQrCodeUrl(qrUrl);
  }, []);

  // Auto-close após 20 segundos com contador
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Card */}
      <div
        className={`relative w-full max-w-4xl rounded-2xl shadow-2xl transition-colors overflow-hidden animate-in zoom-in duration-300
          ${theme === 'dark' 
            ? 'bg-slate-800 border border-white/10' 
            : 'bg-white border border-gray-200'
          }
        `}
      >
        {/* Header com botão fechar */}
        <div className={`flex items-center justify-between px-6 py-4 border-b
          ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}
        `}>
          <h2 className={`text-xl font-bold
            ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
          `}>
            eAi App
          </h2>
          
          <div className="flex items-center gap-3">
            {/* Contador */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium
              ${theme === 'dark' 
                ? 'bg-indigo-900/30 text-indigo-300' 
                : 'bg-indigo-100 text-indigo-700'
              }
            `}>
              {timeLeft}s
            </div>
            
            {/* Botão Fechar */}
            <button
              onClick={onClose}
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
          {/* Layout Desktop: Horizontal */}
          <div className="hidden md:flex items-center gap-8">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 flex items-center justify-center">
                <img
                  src="/logo-circle.png"
                  alt="Logo eAi"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Erro ao carregar logo');
                    // Fallback se não carregar
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>

            {/* Textos - ✅ CENTRALIZADO */}
            <div className="flex-1 text-center">
              <h3 className={`text-3xl font-bold mb-2
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
              `}>
                eAi, sou um funcionário de Voz com Inteligência Artificial.
              </h3>
              <p className={`text-lg mb-4
                ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}
              `}>
                Escaneie o QR Code para saber mais sobre como meu sistema funciona e suas funcionalidades.
              </p>
              <p className={`text-base mb-6
                ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}
              `}>
                www.eAi.app.br
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
                {/* ✅ CORREÇÃO: QR Code maior e melhor */}
{loading ? (
  <div className="w-48 h-48 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
  </div>
) : qrCodeUrl ? (
  <img
    src={qrCodeUrl}
    alt="QR Code eAi"
    className="w-48 h-48 object-contain"
    onError={(e) => {
      console.error('Erro ao carregar QR Code');
      if (!e.currentTarget.src.includes('api.qrserver.com')) {
        e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(websiteUrl)}`;
      }
    }}
  />
) : (
  <div className="w-48 h-48 flex items-center justify-center text-gray-400">
    QR Code indisponível
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

          {/* Layout Mobile: Vertical - ✅ JÁ ESTAVA CENTRALIZADO */}
          <div className="md:hidden flex flex-col items-center text-center gap-6">
            {/* Logo */}
            <div className={`w-32 h-32 rounded-2xl flex items-center justify-center p-4
              ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
            `}>
              {/* ✅ CORREÇÃO: Usar imagem da pasta public */}
              <img
                src="/logo-circle.png"
                alt="Logo eAi"
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error('Erro ao carregar logo mobile');
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Textos */}
            <div>
              <h3 className={`text-2xl font-bold mb-2
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
              `}>
                eAi, sou um funcionário de Voz com Inteligência Artificial.
              </h3>
              <p className={`text-base mb-4
                ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}
              `}>
                Escaneie o QR Code para saber mais sobre como meu sistema funciona e suas funcionalidades.
              </p>
              <p className={`text-sm mb-6
                ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}
              `}>
                www.eai.app.br
              </p>
            </div>

            {/* QR Code */}
            <div>
              <div className={`p-3 rounded-xl inline-block
                ${theme === 'dark' ? 'bg-white' : 'bg-gray-100'}
              `}>
                {/* ✅ CORREÇÃO: QR Code maior e melhor */}
{loading ? (
  <div className="w-40 h-40 flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
  </div>
) : qrCodeUrl ? (
  <img
    src={qrCodeUrl}
    alt="QR Code eAi"
    className="w-40 h-40 object-contain"
    onError={(e) => {
      console.error('Erro ao carregar QR Code mobile');
      if (!e.currentTarget.src.includes('api.qrserver.com')) {
        e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(websiteUrl)}`;
      }
    }}
  />
) : (
  <div className="w-40 h-40 flex items-center justify-center text-gray-400 text-sm">
    QR Code indisponível
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

        {/* Barra de progresso (20 segundos) */}
        <div className={`h-1 
          ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}
        `}>
          <div
            className="h-full bg-indigo-600 transition-all duration-1000 ease-linear"
            style={{
              width: `${(timeLeft / 20) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}
