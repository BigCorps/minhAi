'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Clock, QrCode, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useTheme } from 'next-themes';

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

export default function PaymentPage() {
  const params = useParams();
  const paymentId = params.paymentId as string;
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    fetchPayment();
    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [paymentId]);

  useEffect(() => {
    if (!payment) return;
    
    const updateTimer = () => {
      const expires = new Date(payment.expires_at).getTime();
      const now = Date.now();
      const diff = expires - now;
      
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
      
      if (diff <= 0 && payment.status === 'pending') {
        alert('Pagamento expirado. Por favor, gere um novo pedido.');
        router.push('/dashboard/credits');
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [payment, router]);

  async function fetchPayment() {
    try {
      const response = await fetch(`/api/credits/payment/${paymentId}`);
      if (!response.ok) throw new Error('Erro ao buscar pagamento');
      
      const data = await response.json();
      setPayment(data);
      
      if (data.status === 'paid') {
        setTimeout(() => {
          router.push('/dashboard/credits?success=true');
        }, 3000);
      }
    } catch (err) {
      console.error('Erro ao buscar pagamento:', err);
    }
  }

  async function checkPaymentStatus() {
    if (checking || !payment || payment.status === 'paid') return;
    
    setChecking(true);
    try {
      const response = await fetch(`/api/credits/payment/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId })
      });
      
      const data = await response.json();
      if (data.status === 'paid') {
        setPayment(prev => prev ? { ...prev, status: 'paid' } : null);
        setTimeout(() => {
          router.push('/dashboard/credits?success=true');
        }, 3000);
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
      
      const data = await response.json();
      if (data.success) {
        setPayment(prev => prev ? { ...prev, status: 'paid' } : null);
        setTimeout(() => {
          router.push('/dashboard/credits?success=true');
        }, 3000);
      } else {
        alert('Pagamento ainda não detectado. Por favor, aguarde alguns instantes.');
      }
    } catch (err) {
      console.error('Erro ao confirmar:', err);
      alert('Erro ao confirmar pagamento. Tente novamente.');
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

  if (!mounted || !payment) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 animate-pulse">Carregando detalhes do pagamento...</p>
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  if (payment.status === 'paid') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className={`max-w-md w-full text-center p-10 rounded-3xl shadow-xl border transition-all ${
          isDark ? 'bg-slate-900/40 border-green-500/20 backdrop-blur-xl' : 'bg-white border-green-100'
        }`}>
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-12 h-12 text-green-500" />
          </div>
          <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Pagamento Confirmado!
          </h2>
          <div className={`p-6 rounded-2xl mb-8 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
            <p className={`text-sm uppercase tracking-widest font-bold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Créditos Adicionados
            </p>
            <p className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              +{payment.package.interactions.toLocaleString('pt-BR')}
            </p>
          </div>
          <p className="text-blue-500 font-medium animate-pulse">
            Redirecionando para seus créditos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Finalize seu Pagamento
        </h1>
        <p className={`text-lg ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
          Escaneie o QR Code abaixo ou utilize o Copia e Cola para ativar seus créditos instantaneamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* QR Code Card */}
        <div className={`rounded-3xl p-8 border shadow-lg flex flex-col items-center transition-all ${
          isDark ? 'bg-slate-900/40 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-8 w-full">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              1. Escaneie o QR Code
            </h2>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-inner mb-6 w-full max-w-[280px]">
            <img 
              src={payment.pix_qrcode} 
              alt="QR Code PIX" 
              className="w-full h-auto"
            />
          </div>

          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl ${
            timeLeft < 300 ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
          }`}>
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="text-lg font-bold font-mono">
              Expira em: {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Info & Copy Card */}
        <div className={`rounded-3xl p-8 border shadow-lg transition-all ${
          isDark ? 'bg-slate-900/40 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-xl font-bold mb-8 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Copy className="w-6 h-6 text-blue-500" />
            </div>
            2. Copia e Cola
          </h2>

          <div className={`p-6 rounded-2xl mb-8 border ${
            isDark ? 'bg-slate-800/50 border-white/5' : 'bg-gray-50 border-gray-100'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <span className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Resumo do Pedido
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-500/10 text-blue-500`}>
                Pendente
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Pacote</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{payment.package.name}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Créditos</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{payment.package.interactions.toLocaleString('pt-BR')}</span>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className={`text-lg font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Total</span>
                <span className="text-3xl font-bold text-blue-500">
                  R$ {(payment.amount_cents / 100).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={copyPixCode}
              className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-3 ${
                copied 
                ? 'bg-green-500 text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
              }`}
            >
              {copied ? (
                <><Check className="w-6 h-6" /> Código Copiado!</>
              ) : (
                <><Copy className="w-6 h-6" /> Copiar Código PIX</>
              )}
            </button>

            <button
              onClick={confirmPaymentManually}
              disabled={confirming}
              className={`w-full py-4 rounded-2xl font-bold border transition-all flex items-center justify-center gap-3 ${
                isDark 
                ? 'border-white/10 text-white hover:bg-white/5' 
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              {confirming ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                'Já paguei, verificar agora'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}