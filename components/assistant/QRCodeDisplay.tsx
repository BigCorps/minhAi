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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Card do QR Code */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-300">
        
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

        {/* QR Code */}
        <div 
          className="relative bg-white rounded-2xl p-4 mb-4 cursor-pointer hover:scale-105 transition-transform duration-200 shadow-lg"
          onClick={handleCopy}
        >
          <img
            src={qrCodeUrl}
            alt="QR Code"
            className="w-full h-auto"
          />
          
          {/* Indicador de click para copiar */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/5 rounded-2xl transition-colors">
            {copied && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/90 rounded-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Check className="w-12 h-12" />
                  <span className="font-bold text-lg">Copiado!</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Informações */}
        <div className="space-y-3">
          {/* Para PIX: Mostrar valor e empresa */}
          {type === 'pix' && amount && (
            <div className="text-center py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                R$ {amount}
              </p>
              {companyName && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {companyName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Banco Inter
                  </p>
                </>
              )}
            </div>
          )}

          {/* Para WhatsApp/Instagram: Mostrar número/usuário */}
          {(type === 'whatsapp' || type === 'instagram') && (
            <div 
              className="text-center py-3 bg-gray-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              onClick={handleCopy}
            >
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {displayText}
              </p>
            </div>
          )}

          {/* Botão Copiar */}
          <button
            onClick={handleCopy}
            className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copiar {type === 'pix' ? 'Código PIX' : type === 'whatsapp' ? 'Número' : 'Usuário'}
              </>
            )}
          </button>

          {/* Instruções */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {type === 'pix' 
              ? 'Clique no QR Code ou no botão para copiar o código PIX'
              : 'Clique no QR Code para copiar o link'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
