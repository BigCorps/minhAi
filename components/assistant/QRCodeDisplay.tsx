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
        return '💰 PIX Gerado';
      default:
        return 'QR Code';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      {/* Card do QR Code */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {getTitle()}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Timer */}
            {autoCloseSeconds > 0 && (
              <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                {timeLeft}s
              </div>
            )}
            
            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Container QUADRADO - QR Code + Info + Botão */}
        <div className="w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl overflow-hidden shadow-inner flex flex-col">
          
          {/* QR Code - Ocupa ~70% da altura */}
          <div className="flex-1 flex items-center justify-center p-4 relative">
            <div 
              className="relative w-full h-full flex items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-200"
              onClick={handleCopy}
            >
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-full h-full object-contain"
              />
              
              {/* Overlay de "Copiado!" */}
              {copied && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/95 rounded-xl animate-in fade-in zoom-in duration-200">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Check className="w-10 h-10" />
                    <span className="font-bold text-lg">Copiado!</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Barra de Informação + Botão - Ocupa ~30% da altura */}
          <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
            
            {/* Para PIX: Mostrar valor */}
            {type === 'pix' && amount && (
              <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 text-center">
                  R$ {amount}
                </p>
                {companyName && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    {companyName} • Banco Inter
                  </p>
                )}
              </div>
            )}

            {/* Linha: Informação + Botão Copiar */}
            <div className="flex items-center gap-2 px-3 py-3">
              
              {/* Informação (Número/Usuário) */}
              <div 
                className="flex-1 text-center py-2 px-3 bg-gray-100 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition truncate"
                onClick={handleCopy}
                title={displayText}
              >
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {displayText}
                </p>
              </div>

              {/* Botão Copiar - SÓ ÍCONE */}
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 p-3 rounded-lg font-medium transition flex items-center justify-center ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title={copied ? 'Copiado!' : 'Copiar'}
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Instruções embaixo do quadrado */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          {type === 'pix' 
            ? 'Clique no QR Code ou no botão para copiar o código PIX'
            : 'Clique no QR Code para copiar o link'
          }
        </p>
      </div>
    </div>
  );
}
