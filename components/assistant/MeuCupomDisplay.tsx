'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';

interface MeuCupomDisplayProps {
  data: {
    companyId: string;
    prefillName?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

interface CupomData {
  code: string;
  qr_value: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
}

interface CompanyConfig {
  slug: string;
  name: string;
}

export default function MeuCupomDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: MeuCupomDisplayProps) {
  const { companyId, prefillName = '' } = data;

  const [step, setStep] = useState<'input' | 'loading' | 'result' | 'error'>('input');
  const [clientName, setClientName] = useState(prefillName);
  const [cupom, setCupom] = useState<CupomData | null>(null);
  const [company, setCompany] = useState<CompanyConfig | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const supabase = createClient();

  // ── Padrão NossaMarcaDisplay ──────────────────────────
  const handleManualClose = () => {
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleManualClose);

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // ── Fala abertura ─────────────────────────────────────
  useEffect(() => {
    if (prefillName) {
      playText?.(`Encontrei o nome ${prefillName}. Confirme e clique em gerar.`).catch(() => {});
    } else {
      playText?.('Digite seu nome para gerar seu cupom de indicação personalizado.').catch(() => {});
    }
  }, []);

  // ── Auto-close 30s após resultado ────────────────────
  useEffect(() => {
    if (step !== 'result') return;

    playText?.(`Cupom ${cupom?.code} gerado com sucesso! Mostre este QR Code ou compartilhe o código.`).catch(() => {});

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.speechSynthesis.cancel();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // ── Gerar QR Code URL (padrão NossaMarcaDisplay) ──────
  useEffect(() => {
    if (cupom?.qr_value) {
      const size = 200;
      setQrCodeUrl(
        `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(cupom.qr_value)}&margin=10`
      );
    }
  }, [cupom]);

  // ── Gerar cupom via edge function ─────────────────────
  async function handleGenerate() {
    const name = clientName.trim();
    if (name.length < 2) {
      playText?.('Por favor, informe seu nome para gerar o cupom.').catch(() => {});
      return;
    }

    setStep('loading');

    try {
      const { data: result, error } = await supabase.functions.invoke('gerar-cupom-indicacao', {
        body: {
          company_id: companyId,
          referred_by_identifier: name,
        },
      });

      if (error || !result?.cupom) {
        throw new Error(result?.error || 'Erro ao gerar cupom');
      }

      setCupom(result.cupom);
      setCompany(result.company);
      setStep('result');
    } catch (err: any) {
      console.error('❌ [MEU CUPOM]', err);
      setErrorMsg(err.message || 'Não foi possível gerar o cupom. Tente novamente.');
      setStep('error');
      playText?.('Não foi possível gerar o cupom. Tente novamente.').catch(() => {});
    }
  }

  // ── Copiar código ─────────────────────────────────────
  async function handleCopy() {
    if (!cupom) return;
    try {
      await navigator.clipboard.writeText(cupom.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  // ── Formatar desconto ─────────────────────────────────
  function formatDiscount(): string {
    if (!cupom) return '';
    if (cupom.discount_type === 'percentage') return `${cupom.discount_value}% de desconto`;
    return `R$ ${Number(cupom.discount_value).toFixed(2).replace('.', ',')} de desconto`;
  }

  // ── Estilos ───────────────────────────────────────────
  const isDark = theme === 'dark';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300
          ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Meu Cupom
            </span>
          </div>
          <div className="flex items-center gap-3">
            {step === 'result' && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                {timeLeft}s
              </div>
            )}
            <button
              onClick={handleManualClose}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-6">

          {/* ── INPUT ── */}
          {step === 'input' && (
            <div className="space-y-4">
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Digite seu nome para gerar um cupom de desconto personalizado.
              </p>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                  Seu nome
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  placeholder="Ex: João Silva"
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all
                    ${isDark
                      ? 'bg-slate-700 border-white/10 text-white placeholder-white/30 focus:border-blue-500/60'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                    }`}
                />
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <span>Você também pode falar seu nome ao assistente</span>
              </div>
              <button
                onClick={handleGenerate}
                disabled={clientName.trim().length < 2}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
              >
                Gerar Meu Cupom
              </button>
            </div>
          )}

          {/* ── LOADING ── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Gerando seu cupom...</p>
            </div>
          )}

          {/* ── RESULT ── */}
          {step === 'result' && cupom && (
            <div className="space-y-4">
              {/* Badge desconto */}
              <div className={`text-center px-4 py-2 rounded-xl font-bold text-sm ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                {formatDiscount()}
              </div>

              {/* Código + copiar */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                <span className={`font-mono font-bold text-lg tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {cupom.code}
                </span>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    copied
                      ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                      : isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              {/* QR Code — padrão api.qrserver.com */}
              <div className="flex justify-center py-2">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="QR Code do cupom"
                      className="w-40 h-40 object-contain"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Validade */}
              {cupom.expires_at && (
                <p className={`text-center text-xs ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
                  Válido até {new Date(cupom.expires_at).toLocaleDateString('pt-BR')}
                </p>
              )}

              {/* Empresa */}
              {company?.name && (
                <p className={`text-center text-xs ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
                  Cupom de <strong>{company.name}</strong>
                </p>
              )}

              <button
                onClick={handleManualClose}
                className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-all ${isDark ? 'border-white/10 text-white/60 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                Fechar
              </button>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === 'error' && (
            <div className="space-y-4 py-2">
              <div className={`px-4 py-3 rounded-xl text-sm ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'}`}>
                ⚠️ {errorMsg}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('input'); setErrorMsg(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={handleManualClose}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${isDark ? 'border-white/10 text-white/60 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra de progresso — só no resultado */}
        {step === 'result' && (
          <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
