'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Clock, QrCode, Loader2, ArrowLeft } from 'lucide-react';

interface PixData {
  transaction_id: string;
  amount_brl: string;
  qr_code_url: string;
  pix_code: string;
  expires_at: string;
  company_name: string;
}

interface Props {
  company: {
    name: string;
    logo_url: string | null;
  };
  pixData: PixData;
  amount: number;
  onConfirm: () => Promise<void>;
  onNewPix: () => void;
  loading: boolean;
}

export default function PixQRCodeDisplay({
  company,
  pixData,
  amount,
  onConfirm,
  onNewPix,
  loading,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = new Date(pixData.expires_at).getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [pixData.expires_at]);

  function copyCode() {
    navigator.clipboard.writeText(pixData.pix_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-6">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name}
              className="w-16 h-16 rounded-xl object-cover mx-auto mb-3 shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl font-bold">{company.name.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-xl font-bold text-white">{company.name}</h1>
          <p className="text-slate-400 text-sm mt-1">
            Pagamento de{' '}
            <span className="text-blue-400 font-bold">
              R$ {amount.toFixed(2).replace('.', ',')}
            </span>
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* QR Code */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-5 w-full">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <QrCode className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-white font-bold text-sm">1. Escaneie o QR Code</span>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner mb-4 w-full max-w-[220px]">
              <img src={pixData.qr_code_url} alt="QR Code PIX" className="w-full h-auto" />
            </div>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
              timeLeft < 300 ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
            }`}>
              <Clock className="w-4 h-4 animate-pulse" />
              Expira em: {formatTime(timeLeft)}
            </div>
          </div>

          {/* Copia e Cola + Confirmar */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Copy className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-white font-bold text-sm">2. Copia e Cola</span>
            </div>

            {/* Resumo */}
            <div className="bg-slate-800 rounded-xl p-4 mb-5 flex-1">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resumo</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400">
                  Aguardando
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Empresa</span>
                  <span className="text-white font-medium">{company.name}</span>
                </div>
                <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-slate-300 font-bold">Total</span>
                  <span className="text-2xl font-bold text-blue-400">
                    R$ {amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="space-y-3">
              <button
                onClick={copyCode}
                className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 text-sm ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                }`}
              >
                {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar Código PIX</>}
              </button>

              <button
                onClick={onConfirm}
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                  : 'Já paguei, verificar agora'
                }
              </button>

              <button
                onClick={onNewPix}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-400 flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Novo valor
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mt-5">
          Pagamento processado com segurança via Banco Inter
        </p>
      </div>
    </div>
  );
}
