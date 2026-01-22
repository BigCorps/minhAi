'use client';

import { useState } from 'react';
import { Check, Copy, X, Loader2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pixCode: string;
  qrCodeUrl?: string;
  amount: number;
  packageName: string;
  paymentId: string;
  theme: 'dark' | 'light'; // ← NOVO!
}

export default function PaymentModal({
  isOpen,
  onClose,
  pixCode,
  qrCodeUrl,
  amount,
  packageName,
  paymentId,
  theme // ← NOVO!
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
      const response = await fetch('/api/credits/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId })
      });

      const data = await response.json();

      if (data.success && data.status === 'paid') {
        setConfirmed(true);
        setTimeout(() => {
          window.location.reload();
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

  // ✅ FIX: Usar img normal ao invés de Next Image para evitar erro 406
  const qrImageUrl = qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-md mx-4 rounded-3xl shadow-2xl overflow-hidden transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-slate-900 to-blue-950'
          : 'bg-gradient-to-br from-white to-blue-50'
      }`}>
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-10 p-2 transition ${
            theme === 'dark'
              ? 'text-white/70 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className={`p-6 text-center border-b transition-colors ${
          theme === 'dark'
            ? 'border-blue-700/30'
            : 'border-blue-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-1 transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Pagar com PIX
          </h2>
          <p className={`text-sm transition-colors ${
            theme === 'dark' ? 'text-blue-200' : 'text-blue-700'
          }`}>
            Escaneie o QR Code ou copie o código PIX para pagar
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              {/* ✅ FIX: Usar img normal */}
              <img
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
            <p className={`text-sm mb-1 transition-colors ${
              theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
            }`}>
              {packageName}
            </p>
            <p className={`text-4xl font-bold transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              R$ {amount.toFixed(2).replace('.', ',')}
            </p>
          </div>

          {/* Código PIX */}
          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors ${
              theme === 'dark' ? 'text-blue-200' : 'text-blue-700'
            }`}>
              Ou copie o código:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pixCode}
                readOnly
                className={`flex-1 px-4 py-3 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-950/50 border-blue-700/30 text-white'
                    : 'bg-white border-blue-200 text-gray-900'
                }`}
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-3 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
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
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className={`border rounded-xl p-4 transition-colors ${
            theme === 'dark'
              ? 'bg-blue-950/50 border-blue-700/30'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-sm text-center transition-colors ${
              theme === 'dark' ? 'text-blue-200' : 'text-blue-700'
            }`}>
              Aguardando confirmação do pagamento...
              <br />
              <span className={`font-medium ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
              }`}>
                Seus créditos serão ativados automaticamente
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
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className={`w-full px-6 py-3 rounded-xl transition text-sm ${
                theme === 'dark'
                  ? 'text-blue-300 hover:text-white'
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
