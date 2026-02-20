// ============================================
// PASSO 3: Criar componente EnderecoDisplay
// ============================================
// ARQUIVO: components/assistant/EnderecoDisplay.tsx

'use client';

import { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, Check } from 'lucide-react';

interface EnderecoDisplayProps {
  data: {
    companyName: string;
    address: string;
    mapsUrl: string;
    qrContent: string;
    autoCloseDuration?: number;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function EnderecoDisplay({
  data,
  onClose,
  theme = 'dark'
}: EnderecoDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [copied, setCopied] = useState(false);
  
  const {
    companyName,
    address,
    mapsUrl,
    qrContent,
  } = data;

  // Gerar QR Code
  useEffect(() => {
    if (qrContent) {
      const size = 300;
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

  // Copiar link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(mapsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // Abrir no Maps
  const handleOpenMaps = () => {
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  // Gerar URL do Google Maps Embed
  const getMapEmbedUrl = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(address)}`;
  };

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
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b
          ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}
        `}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">📍</span>
            <div>
              <h2 className={`text-xl font-bold
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
              `}>
                {companyName}
              </h2>
              <p className={`text-sm
                ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}
              `}>
                Localização
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium
              ${theme === 'dark' 
                ? 'bg-red-900/30 text-red-300' 
                : 'bg-red-100 text-red-700'
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
        <div className="p-6">
          
          {/* Mapa Grande */}
          <div className={`rounded-xl overflow-hidden border mb-6
            ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}
          `}>
            <iframe
              src={getMapEmbedUrl()}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa da localização"
            />
          </div>

          {/* Grid: Endereço + Botões + QR Code */}
          <div className="grid md:grid-cols-[1fr_auto] gap-6">
            
            {/* Coluna Esquerda: Endereço + Botões */}
            <div className="space-y-4">
              
              {/* Endereço */}
              <div className={`p-4 rounded-xl
                ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}
              `}>
                <p className={`text-sm font-medium mb-1
                  ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}
                `}>
                  Endereço:
                </p>
                <p className={`text-lg font-semibold
                  ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
                `}>
                  {address}
                </p>
              </div>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3">
                
                {/* Botão Copiar Link */}
                <button
                  onClick={handleCopyLink}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
                    ${copied
                      ? 'bg-green-600 text-white'
                      : theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }
                  `}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar Link
                    </>
                  )}
                </button>

                {/* Botão Abrir no Maps */}
                <button
                  onClick={handleOpenMaps}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Abrir no Maps
                </button>
              </div>

              {/* Dica */}
              <div className={`p-3 rounded-lg text-sm
                ${theme === 'dark' 
                  ? 'bg-blue-900/20 text-blue-300 border border-blue-800' 
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                }
              `}>
                💡 <strong>Dica:</strong> Escaneie o QR Code para abrir diretamente no seu celular
              </div>
            </div>

            {/* Coluna Direita: QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-xl bg-white">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-40 h-40 object-contain"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                  </div>
                )}
              </div>
              <p className={`text-xs text-center font-medium
                ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}
              `}>
                Abrir no celular
              </p>
            </div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className={`h-1 
          ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}
        `}>
          <div
            className="h-full bg-red-600 transition-all duration-1000 ease-linear"
            style={{
              width: `${(timeLeft / 30) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}
