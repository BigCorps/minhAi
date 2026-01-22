'use client';

import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6">
        
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            💰 PIX Gerado
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Aguardando pagamento
          </p>
        </div>

        {/* QR Code */}
        <div 
          className="bg-white rounded-2xl p-4 mb-4 cursor-pointer hover:scale-105 transition-transform shadow-lg"
          onClick={handleCopy}
        >
          <img
            src={qrCodeUrl}
            alt="QR Code PIX"
            className="w-full h-auto"
          />
        </div>

        {/* Valor */}
        <div className="text-center py-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4">
          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            R$ {amount}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            INTERMEDIAÇÕES DE PAGAMENTOS BIGCORPS
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Banco Inter
          </p>
        </div>

        {/* Código PIX */}
        <div 
          className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 mb-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          onClick={handleCopy}
        >
          <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all text-center">
            {pixCode.substring(0, 50)}...
          </p>
        </div>

        {/* Botões */}
        <div className="space-y-3">
          {/* Copiar */}
          <button
            onClick={handleCopy}
            className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Código Copiado!
              </>
            ) : (
              <>
                📋 Copiar Código PIX
              </>
            )}
          </button>

          {/* Confirmar */}
          <button
            onClick={handleConfirm}
            disabled={isConfirming || isCancelling}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Cliente Pagou - Confirmar
              </>
            )}
          </button>

          {/* Cancelar */}
          <button
            onClick={handleCancel}
            disabled={isConfirming || isCancelling}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <X className="w-5 h-5" />
                Cancelar PIX
              </>
            )}
          </button>
        </div>

        {/* Instruções */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
            ⚠️ Confirme apenas após o cliente efetuar o pagamento
          </p>
        </div>
      </div>
    </div>
  );
}
