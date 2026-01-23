'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface QRCodeDisplayProps {
  type: 'whatsapp' | 'instagram' | 'pix';
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
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(autoCloseSeconds);

  // Timer de auto-fechamento
  useEffect(() => {
    if (autoCloseSeconds <= 0) return;

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
  }, [autoCloseSeconds, onClose]);

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

  const getTitle = () => {
    switch (type) {
      case 'whatsapp':
        return '📱 WhatsApp';
      case 'instagram':
        return '📸 Instagram';
      case 'pix':
        return '💰 PIX';
      default:
        return 'QR Code';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      {/* Card do QR Code - SUPER COMPACTO */}
      <div className="relative w-full max-w-[340px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        
        {/* Header Compacto */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {getTitle()}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Timer */}
            {autoCloseSeconds > 0 && (
              <div className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                {timeLeft}s
              </div>
            )}
            
            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Container QUADRADO - QR Code + Info INTEGRADA */}
        <div className="relative w-full aspect-square bg-white dark:bg-slate-900">
          
          {/* QR Code - Ocupa todo o espaço com padding */}
          <div 
            className="absolute inset-0 p-8 cursor-pointer hover:scale-[1.02] transition-transform duration-200"
            onClick={handleCopy}
          >
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
            
            {/* Overlay de "Copiado!" */}
            {copied && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/95 animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center gap-1 text-white">
                  <Check className="w-10 h-10" />
                  <span className="font-bold">Copiado!</span>
                </div>
              </div>
            )}
          </div>

          {/* Barra de Info SOBREPOSTA na parte inferior do QR Code */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700">
            
            {/* Para PIX: Linha extra com valor */}
            {type === 'pix' && amount && (
              <div className="px-3 py-1 border-b border-gray-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 text-center">
                  R$ {amount}
                </p>
                {companyName && (
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center leading-tight">
                    {companyName}
                  </p>
                )}
              </div>
            )}

            {/* Linha: Informação + Botão Copiar (COMPACTA) */}
            <div className="flex items-center gap-2 px-3 py-2">
              
              {/* Informação (Número/Usuário) - com fundo */}
              <div 
                className="flex-1 text-center py-1.5 px-2 bg-gray-100 dark:bg-slate-800 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                onClick={handleCopy}
              >
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {displayText}
                </p>
              </div>

              {/* Botão Copiar - MINI */}
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

        {/* Instruções fora do quadrado (opcional - pode remover para ficar ainda menor) */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
          <p className="text-[10px] text-center text-gray-500 dark:text-gray-400">
            {type === 'pix' 
              ? '👆 Clique para copiar código PIX'
              : '👆 Clique para copiar'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
