'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface QRCodeDisplayProps {
  type: 'whatsapp' | 'instagram' | 'pix' | 'website' | 'facebook' | 'email' | 'linkedin' | 'tiktok' | 'twitter' | 'telefone';
  qrCodeUrl: string;
  qrContent: string;
  displayText: string;
  
  // Para PIX
  amount?: string;
  companyName?: string;
  
  // Controle
  onClose: () => void;
  onCopy?: () => void;
  autoCloseSeconds?: number;
  theme?: 'dark' | 'light';
}

export default function QRCodeDisplay({
  type,
  qrCodeUrl,
  qrContent,
  displayText,
  amount,
  companyName,
  onClose,
  onCopy,
  autoCloseSeconds = 15,
  theme = 'dark',
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(autoCloseSeconds);

  useEffect(() => {
    if (autoCloseSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // ✅ Chamar onClose sem await aqui (auto-close)
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoCloseSeconds]); // ✅ Removido onClose das dependências

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrContent);
      setCopied(true);
      onCopy?.();
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // ✅ Handler específico para fechar manualmente
  const handleManualClose = () => {
    // Chama onClose que é async no pai
    onClose();
  };

  const getTitle = () => {
    switch (type) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'instagram':
        return 'Instagram';
      case 'pix':
        return 'PIX';
      default:
        return 'QR Code';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className={`relative w-full max-w-[340px] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        
        <div className={`flex items-center justify-between px-4 py-2 border-b ${
          theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {getTitle()}
          </h2>
          
          <div className="flex items-center gap-2">
            {autoCloseSeconds > 0 && (
              <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                theme === 'dark' 
                  ? 'bg-blue-900/30 text-blue-300' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {timeLeft}s
              </div>
            )}
            
            <button
              onClick={handleManualClose}
              className={`p-1.5 rounded-full transition ${
                theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
              }`}
            >
              <X className={`w-4 h-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`} />
            </button>
          </div>
        </div>

        <div className={`relative w-full aspect-square ${
          theme === 'dark' ? 'bg-slate-900' : 'bg-white'
        }`}>
          
          <div 
            className="absolute inset-0 pt-4 pb-16 px-6 cursor-pointer hover:scale-[1.02] transition-transform duration-200"
            onClick={handleCopy}
          >
            <div className="w-full h-full bg-white rounded-xl p-3 shadow-sm">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            
            {copied && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/95 animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center gap-1 text-white">
                  <Check className="w-10 h-10" />
                  <span className="font-bold">Copiado!</span>
                </div>
              </div>
            )}
          </div>

          <div className={`absolute bottom-0 left-0 right-0 backdrop-blur-sm border-t ${
            theme === 'dark' 
              ? 'bg-slate-900/95 border-slate-700' 
              : 'bg-white/95 border-gray-200'
          }`}>
            
            {type === 'pix' && amount && (
              <div className={`px-3 py-1.5 border-b ${
                theme === 'dark'
                  ? 'border-slate-700 bg-blue-900/20'
                  : 'border-gray-200 bg-blue-50'
              }`}>
                <p className={`text-xl font-bold text-center leading-tight ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  R$ {amount}
                </p>
                {companyName && (
                  <p className={`text-[9px] text-center leading-tight mt-0.5 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {companyName}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2">
              
              <div 
                className={`flex-1 text-center py-1.5 px-2 rounded cursor-pointer transition ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                onClick={handleCopy}
              >
                <p className={`text-xs font-bold truncate ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {displayText}
                </p>
              </div>

              <button
                onClick={handleCopy}
                className={`flex-shrink-0 p-2 rounded transition ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title={copied ? 'Copiado!' : 'Copiar'}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
