// ============================================
// COMPONENTE MELHORADO: NossaMarcaDisplay com Mapa
// ============================================
// ARQUIVO: components/assistant/NossaMarcaDisplay.tsx

'use client';

import { useEffect, useState } from 'react';
import { X, MapPin, Clock } from 'lucide-react';

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
  const [isLandscape, setIsLandscape] = useState(false);
  
  const {
    companyName,
    logoUrl,
    brandDescription,
    businessHours,
    businessAddress,
    qrContent,
    isAddress
  } = data;

  // Detectar orientação do dispositivo
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth < 1024);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Gerar QR Code
  useEffect(() => {
    if (qrContent) {
      const size = 400;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrContent)}&margin=10`;
      setQrCodeUrl(qrUrl);
    }
  }, [qrContent]);

  // Auto-close
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

  // Gerar URL do Google Maps Embed
  const getMapEmbedUrl = () => {
    if (!isAddress || !businessAddress) return '';
  
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // ← ESTA LINHA
  
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(businessAddress)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Card */}
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
          {/* ========================================
              LAYOUT DESKTOP: Grid 2 colunas
              ======================================== */}
          <div className="hidden md:grid md:grid-cols-[1fr_400px] gap-8">
            
            {/* COLUNA ESQUERDA: Logo + Textos + QR Code */}
            <div className="flex flex-col gap-6">
              
              {/* Logo + Descrição */}
              <div className="flex items-start gap-6">
                {/* Logo */}
                {logoUrl && (
                  <div className={`flex-shrink-0 w-32 h-32 rounded-2xl flex items-center justify-center p-3
                    ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                  `}>
                    <img
                      src={logoUrl}
                      alt={`Logo ${companyName}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                
                {/* Descrição */}
                {brandDescription && (
                  <div className="flex-1">
                    <p className={`text-lg leading-relaxed
                      ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}
                    `}>
                      {brandDescription}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Horário e Endereço */}
              <div className="flex flex-col gap-3">
                {/* Horário */}
                {businessHours && (
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-lg
                    ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                  `}>
                    <Clock className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    <span className={`text-base font-medium
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
                    <span className={`text-base font-medium text-left
                      ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}
                    `}>
                      {businessAddress}
                    </span>
                  </div>
                )}
              </div>
              
              {/* QR Code */}
              {qrContent && (
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                      </div>
                    )}
                  </div>
                  <p className={`text-sm font-medium
                    ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}
                  `}>
                    Escaneie para {isAddress ? 'abrir no Maps' : 'acessar o site'}
                  </p>
                </div>
              )}
            </div>

            {/* COLUNA DIREITA: Mapa (se for endereço) */}
            {isAddress && businessAddress && (
              <div className={`rounded-xl overflow-hidden border
                ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}
              `}>
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
              </div>
            )}
          </div>

          {/* ========================================
              LAYOUT MOBILE LANDSCAPE: Grid 2 colunas
              ======================================== */}
          {isLandscape && (
            <div className="md:hidden grid grid-cols-[1fr_250px] gap-6">
              
              {/* COLUNA ESQUERDA */}
              <div className="flex flex-col gap-4">
                {/* Logo + Descrição */}
                <div className="flex items-start gap-4">
                  {logoUrl && (
                    <div className={`flex-shrink-0 w-20 h-20 rounded-xl flex items-center justify-center p-2
                      ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                    `}>
                      <img src={logoUrl} alt={`Logo ${companyName}`} className="w-full h-full object-contain" />
                    </div>
                  )}
                  {brandDescription && (
                    <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}`}>
                      {brandDescription}
                    </p>
                  )}
                </div>
                
                {/* Horário e Endereço */}
                <div className="flex flex-col gap-2">
                  {businessHours && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                      ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                    `}>
                      <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                      <span className={theme === 'dark' ? 'text-white/90' : 'text-gray-800'}>{businessHours}</span>
                    </div>
                  )}
                  {businessAddress && (
                    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm
                      ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                    `}>
                      <MapPin className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                      <span className={theme === 'dark' ? 'text-white/90' : 'text-gray-800'}>{businessAddress}</span>
                    </div>
                  )}
                </div>
                
                {/* QR Code */}
                {qrContent && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white">
                      {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 object-contain" />}
                    </div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                      {isAddress ? 'Abrir no Maps' : 'Acessar site'}
                    </p>
                  </div>
                )}
              </div>

              {/* COLUNA DIREITA: Mapa */}
              {isAddress && businessAddress && (
                <div className="rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}">
                  <iframe
                    src={getMapEmbedUrl()}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '300px' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Mapa"
                  />
                </div>
              )}
            </div>
          )}

          {/* ========================================
              LAYOUT MOBILE PORTRAIT: Vertical (sem mapa)
              ======================================== */}
          {!isLandscape && (
            <div className="md:hidden flex flex-col items-center text-center gap-6">
              {/* Logo */}
              {logoUrl && (
                <div className={`w-32 h-32 rounded-2xl flex items-center justify-center p-4
                  ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                `}>
                  <img src={logoUrl} alt={`Logo ${companyName}`} className="w-full h-full object-contain" />
                </div>
              )}

              {/* Descrição */}
              {brandDescription && (
                <p className={`text-base leading-relaxed ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}`}>
                  {brandDescription}
                </p>
              )}
              
              {/* Horário */}
              {businessHours && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg
                  ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
                `}>
                  <Clock className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-gray-700'}`}>
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
                  <span className={`text-sm font-medium text-left ${theme === 'dark' ? 'text-white/80' : 'text-gray-700'}`}>
                    {businessAddress}
                  </span>
                </div>
              )}

              {/* QR Code */}
              {qrContent && (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-xl bg-white">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 object-contain" />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
                      </div>
                    )}
                  </div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}`}>
                    {isAddress ? 'Abrir no Maps' : 'Acessar site'}
                  </p>
                </div>
              )}
            </div>
          )}
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
