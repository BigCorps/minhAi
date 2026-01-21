'use client';

import { useState } from 'react';
import { Check, Copy, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pixCode: string;
  qrCodeUrl?: string;
  amount: number;
  packageName: string;
  paymentId: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  pixCode,
  qrCodeUrl,
  amount,
  packageName,
  paymentId
}: PaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    setConfirming(true);
    
    try {
      // Chamar API para verificar pagamento
      const response = await fetch('/api/credits/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId })
      });

      const data = await response.json();

      if (data.success && data.status === 'paid') {
        setConfirmed(true);
        setTimeout(() => {
          window.location.reload(); // Recarrega para atualizar créditos
        }, 2000);
      } else {
        alert('Pagamento ainda não confirmado. Por favor, aguarde alguns segundos após realizar o pagamento.');
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      alert('Erro ao verificar pagamento. Tente novamente.');
    } finally {
      setConfirming(false);
    }
  };

  // URL do QR Code (usa api.qrserver.com se não tiver qrCodeUrl)
  const qrImageUrl = qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-br from-teal-900 to-teal-950 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="p-6 text-center border-b border-teal-700/30">
          <h2 className="text-2xl font-bold text-white mb-1">Pagar com PIX</h2>
          <p className="text-teal-200 text-sm">
            Escaneie o QR Code ou copie o código PIX para pagar
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <Image
                src={qrImageUrl}
                alt="QR Code PIX"
                width={250}
                height={250}
                className="rounded-lg"
              />
            </div>
          </div>

          {/* Valor */}
          <div className="text-center">
            <p className="text-teal-300 text-sm mb-1">{packageName}</p>
            <p className="text-4xl font-bold text-white">
              R$ {amount.toFixed(2).replace('.', ',')}
            </p>
          </div>

          {/* Código PIX */}
          <div>
            <label className="block text-sm font-medium text-teal-200 mb-2">
              Ou copie o código:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pixCode}
                readOnly
                className="flex-1 px-4 py-3 bg-teal-950/50 border border-teal-700/30 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-3 bg-teal-700 hover:bg-teal-600 text-white rounded-xl transition flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-teal-950/50 border border-teal-700/30 rounded-xl p-4">
            <p className="text-teal-200 text-sm text-center">
              Aguardando confirmação do pagamento...
              <br />
              <span className="text-teal-300 font-medium">
                Sua assinatura será ativada automaticamente
              </span>
            </p>
          </div>

          {/* Botões */}
          <div className="space-y-3">
            {/* Botão Confirmar Pagamento */}
            {confirmed ? (
              <div className="bg-green-600 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                <span className="font-semibold">Pagamento Confirmado!</span>
              </div>
            ) : (
              <button
                onClick={handleConfirmPayment}
                disabled={confirming}
                className="w-full bg-lime-500 hover:bg-lime-400 text-teal-950 font-bold px-6 py-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Confirmar Pagamento
                  </>
                )}
              </button>
            )}

            {/* Já pagou? */}
            <p className="text-center text-sm text-teal-300">
              Já pagou?{' '}
              <button
                onClick={handleConfirmPayment}
                disabled={confirming || confirmed}
                className="text-lime-400 hover:text-lime-300 font-medium underline disabled:opacity-50"
              >
                Confirme manualmente
              </button>
            </p>

            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className="w-full text-teal-300 hover:text-white px-6 py-3 rounded-xl transition text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
