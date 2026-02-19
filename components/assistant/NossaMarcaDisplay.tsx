// components/assistant/NossaMarcaDisplay.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, MapPin, Clock, Copy, ExternalLink, Check } from 'lucide-react';

interface NossaMarcaDisplayProps {
  data: {
    companyName: string;
    logoUrl?: string;
    brandDescription?: string;
    businessHours?: string;
    businessAddress?: string;
    qrContent?: string;
    isAddress?: boolean;
    autoCloseDuration?: number;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function NossaMarcaDisplay({
  data,
  onClose,
  theme = 'dark'
}: NossaMarcaDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(20);
  const [copied, setCopied] = useState(false);

  // ✅ Handler específico para fechar manualmente e parar a voz
  const handleManualClose = () => {
    window.speechSynthesis.cancel(); // 👈 Para a fala imediatamente
    onClose();
  };
  
  const {
    companyName,
    logoUrl,
    brandDescription,
    businessHours,
    businessAddress,
    qrContent,
    isAddress
  } = data;

  // Gerar QR Code
  useEffect(() => {
    if (qrContent) {
      const size = 300;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrContent)}&margin=10`;
      setQrCodeUrl(qrUrl);
    }
  }, [qrContent]);

  // Auto-close timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.speechSynthesis.cancel(); // 👈 Adicione isso
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onClose]);

  // Gerar URL do Google Maps Embed
  const getMapEmbedUrl = () => {
    if (!isAddress || !businessAddress) return '';
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY não configurada');
      return '';
    }
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(businessAddress)}`;
  };

  // Gerar URL do Screenshot (Microlink - gratuito com marca d'água)
  const getScreenshotUrl = () => {
    if (!businessAddress) return '';
    return `https://api.microlink.io?url=${encodeURIComponent(qrContent || businessAddress)}&screenshot=true&meta=false&embed=screenshot.url`;
  };

  // Copiar endereço
  const handleCopy = () => {
    if (businessAddress) {
      navigator.clipboard.writeText(businessAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Abrir no Maps ou Site
  const handleOpen = () => {
    if (qrContent) {
      window.open(qrContent, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Card Principal */}
      <div
        className={`relative w-full max-w-6xl rounded-2xl shadow-2xl transition-colors overflow-hidden animate-in zoom-in duration-300
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
            {companyName}
          </h2>
          
<div className="flex items-center gap-3">
  <div className={`px-3 py-1 rounded-full text-sm font-medium
    ${theme === 'dark' 
      ? 'bg-green-900/30 text-green-300' 
      : 'bg-green-100 text-green-700'
    }
  `}>
    {timeLeft}s
  </div>
  
  <button
    onClick={handleManualClose} // 👈 Alterado aqui para parar a voz antes de fechar
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
          {/* ========================================
              LAYOUT DESKTOP: Grid 2 colunas
              ======================================== */}
          {/* Ajustado: A coluna esquerda fixa em 360px e o mapa preenche todo o restante (1fr) */}
          <div className="hidden md:grid md:grid-cols-[360px_1fr] gap-6">
            
            {/* COLUNA ESQUERDA */}
            <div className="flex flex-col gap-5">
              
              {/* Logo + QR Code (lado a lado) */}
              <div className="flex items-start gap-4">
                {/* Logo */}
                {logoUrl && (
                  <div className={`flex-shrink-0 w-32 h-32 rounded-xl flex items-center justify-center p-3
                    ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                  `}>
                    <img
                      src={logoUrl}
                      alt={`Logo ${companyName}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                
                {/* QR Code */}
                {qrContent && (
                  <div className="flex-shrink-0 w-32 h-32 p-3 rounded-xl bg-white shadow-lg flex items-center justify-center">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Descrição */}
              {brandDescription && (
                <div>
                  <p className={`text-sm leading-relaxed whitespace-normal break-words
                    ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}
                  `}>
                    {brandDescription}
                  </p>
                </div>
              )}
              
              {/* Horário */}
              {businessHours && (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-lg
                  ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                `}>
                  <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`text-sm font-medium whitespace-normal break-words flex-1
                    ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}
                  `}>
                    {businessHours}
                  </span>
                </div>
              )}
              
              {/* Endereço/Site */}
              {businessAddress && (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-lg
                  ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                `}>
                  <MapPin className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`text-sm font-medium text-left flex-1 whitespace-normal break-words
                    ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}
                  `}>
                    {businessAddress}
                  </span>
                </div>
              )}
              
              {/* Botões - Ajustados para menores */}
              {businessAddress && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all inline-flex items-center justify-center gap-2
                      ${theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      }
                    `}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="truncate">Copiar {isAddress ? 'Endereço' : 'Site'}</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleOpen}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-semibold transition-all inline-flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="truncate">Abrir {isAddress ? 'no Maps' : 'Site'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* COLUNA DIREITA: Mapa ou Screenshot */}
            {(isAddress || businessAddress) && (
              <div className={`rounded-xl overflow-hidden border h-full
                ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}
              `}>
                {isAddress ? (
                  // ✅ ENDEREÇO FÍSICO = Mapa (altura min ajustada para 400px focando no aspecto paisagem)
                  getMapEmbedUrl() ? (
                    <iframe
                      src={getMapEmbedUrl()}
                      width="100%"
                      height="100%"
                      style={{ border: 0, minHeight: '400px' }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Mapa da localização"
                    />
                  ) : (
                    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-700/50">
                      <p className="text-white/50">Mapa não disponível</p>
                    </div>
                  )
                ) : (
                  // ✅ URL = Screenshot do Site
                  <div className="relative w-full h-full min-h-[400px] bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center p-4">
                    <img
                      src={getScreenshotUrl()}
                      alt="Preview do site"
                      className="w-full h-auto rounded-lg shadow-2xl border-2 border-white/10"
                      onError={(e) => {
                        // Fallback se screenshot falhar
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex flex-col items-center gap-4 text-center p-8">
                              <div class="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                              </div>
                              <p class="text-white font-semibold text-lg">Preview não disponível</p>
                              <p class="text-white/60 text-sm">Use o QR Code ou botão para acessar</p>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================
              LAYOUT MOBILE: Vertical (Mantido intacto)
              ======================================== */}
          <div className="md:hidden flex flex-col items-center text-center gap-6">
            {/* Logo + QR Code lado a lado */}
            <div className="flex items-center justify-center gap-4">
              {logoUrl && (
                <div className={`w-24 h-24 rounded-xl flex items-center justify-center p-2
                  ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                `}>
                  <img src={logoUrl} alt={`Logo ${companyName}`} className="w-full h-full object-contain" />
                </div>
              )}
              
              {qrContent && qrCodeUrl && (
                <div className="p-2 rounded-lg bg-white shadow-lg">
                  <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 object-contain" />
                </div>
              )}
            </div>

            {/* Descrição */}
            {brandDescription && (
              <p className={`text-base leading-relaxed break-words ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}`}>
                {brandDescription}
              </p>
            )}
            
            {/* Horário */}
            {businessHours && (
              <div className={`flex items-start gap-2 px-4 py-2 rounded-lg w-full
                ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
              `}>
                <Clock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                <span className={`text-sm font-medium break-words text-left ${theme === 'dark' ? 'text-white/80' : 'text-gray-700'}`}>
                  {businessHours}
                </span>
              </div>
            )}
            
            {/* Endereço/Site */}
            {businessAddress && (
              <div className={`flex items-start gap-2 px-4 py-2 rounded-lg w-full
                ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
              `}>
                <MapPin className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                <span className={`text-sm font-medium text-left break-words ${theme === 'dark' ? 'text-white/80' : 'text-gray-700'}`}>
                  {businessAddress}
                </span>
              </div>
            )}

            {/* Botões */}
            {businessAddress && (
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={handleCopy}
                  className={`w-full px-4 py-3 rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2
                    ${theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }
                  `}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  <span>{copied ? 'Copiado!' : `Copiar ${isAddress ? 'Endereço' : 'Site'}`}</span>
                </button>
                
                <button
                  onClick={handleOpen}
                  className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold transition-all inline-flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Abrir {isAddress ? 'no Maps' : 'Site'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        <div className={`h-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-green-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 20) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
