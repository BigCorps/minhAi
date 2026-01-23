'use client';

import { useState } from 'react';
import { Check, X, Loader2, Copy } from 'lucide-react';

interface PIXConfirmationModalProps {
  transactionId: string;
  amount: string;
  qrCodeUrl: string;
  pixCode: string;
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
}

export default function PIXConfirmationModal({
  transactionId,
  amount,
  qrCodeUrl,
  pixCode,
  onConfirm,
  onCancel,
}: PIXConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Erro ao confirmar:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await onCancel();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-[340px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header Compacto */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-lg font-bold text-white text-center">
            PIX Gerado
          </h2>
          <p className="text-xs text-blue-100 text-center">
            Aguardando pagamento
          </p>
        </div>

        {/* Container Quadrado - QR Code + Info */}
        <div className="relative w-full aspect-square bg-white dark:bg-slate-900">
          
          {/* QR Code */}
          <div 
            className="absolute inset-0 pt-4 pb-20 px-6 cursor-pointer hover:scale-[1.02] transition-transform duration-200"
            onClick={handleCopy}
          >
            <div className="w-full h-full bg-white rounded-xl p-3 shadow-sm">
              <img
                src={qrCodeUrl}
                alt="QR Code PIX"
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

          {/* Barra de Info Sobreposta */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700">
            
            {/* Valor + Empresa */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 text-center leading-tight">
                R$ {amount}
              </p>
              <p className="text-[9px] text-gray-600 dark:text-gray-400 text-center leading-tight mt-0.5">
                INTERMEDIAÇÕES DE PAGAMENTOS BIGCORPS
              </p>
            </div>

            {/* Código PIX + Botão Copiar */}
            <div className="flex items-center gap-2 px-3 py-2">
              <div 
                className="flex-1 text-center py-1.5 px-2 bg-gray-100 dark:bg-slate-800 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                onClick={handleCopy}
              >
                <p className="text-[10px] font-mono text-gray-900 dark:text-white truncate">
                  {pixCode.substring(0, 30)}...
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

        {/* Botões de Ação - Fora do Quadrado */}
        <div className="p-3 space-y-2 bg-gray-50 dark:bg-slate-800">
          
          {/* Confirmar Pagamento */}
          <button
            onClick={handleConfirm}
            disabled={isConfirming || isCancelling}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Cliente Pagou - Confirmar
              </>
            )}
          </button>

          {/* Cancelar PIX */}
          <button
            onClick={handleCancel}
            disabled={isConfirming || isCancelling}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                Cancelar PIX
              </>
            )}
          </button>

          {/* Aviso */}
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <p className="text-[10px] text-yellow-800 dark:text-yellow-200 text-center leading-tight">
              ⚠️ Confirme apenas após o cliente efetuar o pagamento
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
