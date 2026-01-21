'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Clock, QrCode, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PaymentPageProps {
  paymentId: string;
  theme?: 'dark' | 'light';
}

interface PaymentData {
  id: string;
  txid: string;
  amount_cents: number;
  pix_code: string;
  pix_qrcode: string;
  expires_at: string;
  status: string;
  package: {
    name: string;
    interactions: number;
  };
}

export default function PaymentPage({ paymentId, theme = 'light' }: PaymentPageProps) {
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  const isDark = theme === 'dark';

  useEffect(() => {
    fetchPayment();
    const interval = setInterval(checkPaymentStatus, 5000); // Verificar a cada 5s
    
    return () => clearInterval(interval);
  }, [paymentId]);

  useEffect(() => {
    if (!payment) return;
    
    const updateTimer = () => {
      const expires = new Date(payment.expires_at).getTime();
      const now = Date.now();
      const diff = expires - now;
      
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
      
      if (diff <= 0) {
        // Expirou
        alert('Pagamento expirado. Gerando novo código...');
        router.push('/dashboard/credits');
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [payment]);

  async function fetchPayment() {
    try {
      const response = await fetch(`/api/credits/payment/${paymentId}`);
      if (!response.ok) throw new Error('Erro ao buscar pagamento');
      
      const data = await response.json();
      setPayment(data);
      
      if (data.status === 'paid') {
        // Pagamento confirmado!
        setTimeout(() => {
          router.push('/dashboard/credits?success=true');
        }, 2000);
      }
    } catch (err) {
      console.error('Erro ao buscar pagamento:', err);
    }
  }

  async function checkPaymentStatus() {
    if (checking) return;
    
    setChecking(true);
    try {
      const response = await fetch(`/api/credits/payment/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId })
      });
      
      if (!response.ok) throw new Error('Erro ao verificar status');
      
      const data = await response.json();
      
      if (data.status === 'paid') {
        setPayment(prev => prev ? { ...prev, status: 'paid' } : null);
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    } finally {
      setChecking(false);
    }
  }

  async function confirmPaymentManually() {
    if (confirming) return;
    
    setConfirming(true);
    try {
      const response = await fetch(`/api/credits/payment/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId })
      });
      
      if (!response.ok) throw new Error('Erro ao confirmar pagamento');
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.message}\n💰 ${data.credits_added || 0} créditos adicionados!`);
        setPayment(prev => prev ? { ...prev, status: 'paid' } : null);
      }
    } catch (err) {
      console.error('Erro ao confirmar:', err);
      alert('❌ Erro ao confirmar pagamento. Tente novamente.');
    } finally {
      setConfirming(false);
    }
  }

  function copyPixCode() {
    if (!payment) return;
    
    navigator.clipboard.writeText(payment.pix_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatPrice(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  if (!payment) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (payment.status === 'paid') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${
        isDark ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <div className={`max-w-md w-full text-center p-8 rounded-2xl ${
          isDark ? 'bg-slate-800' : 'bg-white'
        } shadow-xl`}>
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Pagamento Confirmado! 🎉
            </h2>
            <p className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Seus créditos foram adicionados
            </p>
          </div>
          
          <div className={`p-4 rounded-lg mb-6 ${
            isDark ? 'bg-slate-700/50' : 'bg-gray-50'
          }`}>
            <p className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            } mb-1`}>
              Créditos adicionados
            </p>
            <p className={`text-3xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              +{payment.package.interactions.toLocaleString('pt-BR')}
            </p>
          </div>

          <p className={`text-xs ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Pagamento via PIX
          </h1>
          <p className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Escaneie o QR Code ou copie o código PIX
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Clock className={`w-5 h-5 ${
            timeLeft < 300 ? 'text-red-500' : 'text-blue-500'
          }`} />
          <span className={`text-lg font-mono ${
            timeLeft < 300 ? 'text-red-500' : 
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* QR Code */}
          <div className={`rounded-2xl p-8 ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          } border shadow-lg`}>
            <div className="flex items-center gap-3 mb-6">
              <QrCode className={`w-6 h-6 ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <h2 className={`text-xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                1. Escaneie o QR Code
              </h2>
            </div>

            <div className="bg-white p-4 rounded-xl mb-4">
              <img 
                src={payment.pix_qrcode} 
                alt="QR Code PIX" 
                className="w-full max-w-xs mx-auto"
              />
            </div>

            <p className={`text-sm text-center ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Abra o app do seu banco e escaneie
            </p>
          </div>

          {/* Código PIX */}
          <div className={`rounded-2xl p-8 ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          } border shadow-lg`}>
            <h2 className={`text-xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              2. Ou copie o código
            </h2>

            {/* Resumo */}
            <div className={`p-4 rounded-lg mb-6 ${
              isDark ? 'bg-slate-700/50' : 'bg-gray-50'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Pacote
                </span>
                <span className={`font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {payment.package.name}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Créditos
                </span>
                <span className={`font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {payment.package.interactions.toLocaleString('pt-BR')} interações
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                <span className={`font-semibold ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Total
                </span>
                <span className={`text-xl font-bold ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  {formatPrice(payment.amount_cents)}
                </span>
              </div>
            </div>

            {/* Código PIX */}
            <div className="relative mb-6">
              <div className={`p-4 rounded-lg font-mono text-xs break-all ${
                isDark ? 'bg-slate-900 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                {payment.pix_code}
              </div>
              <button
                onClick={copyPixCode}
                className={`absolute top-2 right-2 p-2 rounded-lg transition ${
                  copied
                    ? 'bg-green-500 text-white'
                    : isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={copyPixCode}
              className="w-full py-3 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white transition mb-4"
            >
              {copied ? '✅ Copiado!' : '📋 Copiar Código PIX'}
            </button>

            {/* Botão de Confirmação Manual */}
            <button
              onClick={confirmPaymentManually}
              disabled={confirming}
              className={`w-full py-3 rounded-lg font-medium transition ${
                confirming
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : isDark
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {confirming ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Confirmando...
                </span>
              ) : (
                '✅ Já Paguei - Confirmar Agora'
              )}
            </button>

            {/* Instruções */}
            <div className={`mt-6 p-4 rounded-lg ${
              isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
            } border`}>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className={`text-sm ${
                  isDark ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  <p className="font-semibold mb-1">Como pagar:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Copie o código PIX acima</li>
                    <li>Abra o app do seu banco</li>
                    <li>Escolha PIX Copia e Cola</li>
                    <li>Cole o código e confirme</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-8 text-center">
          <p className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {checking ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Verificando pagamento...
              </span>
            ) : (
              '⏱️ Aguardando confirmação do pagamento...'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
