// components/assistant/MeuSistemaDisplay.tsx

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface MeuSistemaDisplayProps {
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function MeuSistemaDisplay({
  onClose,
  theme = 'dark'
}: MeuSistemaDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(15);
  const websiteUrl = 'https://eai.app.br';

  // Gerar QR Code via API do Google Charts
  useEffect(() => {
    // ✅ CORREÇÃO: QR Code maior e com melhor qualidade
    const size = 400; // Tamanho maior
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(websiteUrl)}&chs=${size}x${size}&choe=UTF-8&chld=M|2`;
    setQrCodeUrl(qrUrl);
  }, []);

  // Auto-close após 15 segundos com contador
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
            Sistema eAi
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
              <div className={`w-48 h-48 rounded-2xl flex items-center justify-center p-4
                ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
              `}>
                {/* ✅ CORREÇÃO: Usar imagem da pasta public */}
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
                Assistente de Voz Inteligente
              </h3>
              <p className={`text-lg mb-4
                ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}
              `}>
                Transforme o atendimento com um Funcionário IA
              </p>
              <p className={`text-base mb-6
                ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}
              `}>
                Sistema completo de assistente de voz para empresas. 
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
                {/* ✅ CORREÇÃO: QR Code maior e melhor */}
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code eAi"
                    className="w-48 h-48 object-contain"
                    onError={(e) => {
                      console.error('Erro ao carregar QR Code');
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EQR Code%3C/text%3E%3C/svg%3E';
                    }}
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
                Assistente de Voz
              </h3>
              <p className={`text-base mb-4
                ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}
              `}>
                Transforme o atendimento com um Funcionário IA
              </p>
              <p className={`text-sm mb-6
                ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}
              `}>
                Sistema completo para empresas
              </p>
            </div>

            {/* QR Code */}
            <div>
              <div className={`p-3 rounded-xl inline-block
                ${theme === 'dark' ? 'bg-white' : 'bg-gray-100'}
              `}>
                {/* ✅ CORREÇÃO: QR Code maior e melhor */}
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code eAi"
                    className="w-40 h-40 object-contain"
                    onError={(e) => {
                      console.error('Erro ao carregar QR Code mobile');
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect fill="%23ddd" width="160" height="160"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EQR Code%3C/text%3E%3C/svg%3E';
                    }}
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
            className="h-full bg-indigo-600 transition-all duration-1000 ease-linear"
            style={{
              width: `${(timeLeft / 15) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}
