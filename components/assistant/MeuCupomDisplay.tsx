'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '../hooks/useModalVoiceCommand';

// ── Constantes de voz ──────────────────────────────────────
const OPENING_TEXT = 'Digite seu nome para gerar seu cupom de indicação personalizado.';

interface MeuCupomDisplayProps {
  companyId: string;
  theme?: 'dark' | 'light';
  onClose: () => void;
  playText?: (text: string) => Promise<void>;
  prefillName?: string; // nome extraído por voz (opcional)
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

export function MeuCupomDisplay({
  companyId,
  theme = 'dark',
  onClose,
  playText,
  prefillName = '',
}: MeuCupomDisplayProps) {
  const [step, setStep] = useState<'input' | 'loading' | 'result' | 'error'>('input');
  const [clientName, setClientName] = useState(prefillName);
  const [cupom, setCupom] = useState<CupomData | null>(null);
  const [company, setCompany] = useState<CompanyConfig | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const autoCloseRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // ── Voz modal (Padrão 10) ──────────────────────────────
  useModalVoiceCommand({
    isOpen: true,
    onClose,
    onVoiceCommand: (transcript) => {
      const lower = transcript.toLowerCase();
      if (lower.includes('fechar') || lower.includes('cancelar')) {
        onClose();
        return;
      }
      // Se estiver na etapa input e o transcript parecer um nome, preenche
      if (step === 'input') {
        const cleaned = transcript.trim().replace(/^(meu nome é|me chamo|sou o|sou a)\s+/i, '');
        if (cleaned.length >= 2 && cleaned.split(' ').length <= 4) {
          setClientName(cleaned);
        }
      }
    },
  });

  // ── Auto-close após resultado (30s) ───────────────────
  useEffect(() => {
    if (step === 'result') {
      playText?.(`Cupom ${cupom?.code} gerado com sucesso! Mostre este QR Code ou compartilhe o código.`).catch(() => {});
      autoCloseRef.current = setTimeout(onClose, 30000);
    }
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, [step]);

  // ── Fala o texto de abertura ──────────────────────────
  useEffect(() => {
    if (prefillName) {
      playText?.(`Encontrei o nome ${prefillName}. Confirme ou corrija e clique em gerar.`).catch(() => {});
    } else {
      playText?.(OPENING_TEXT).catch(() => {});
    }
  }, []);

  // ── Gerar cupom ───────────────────────────────────────
  async function handleGenerate() {
    const name = clientName.trim();
    if (name.length < 2) {
      playText?.('Por favor, informe seu nome para gerar o cupom.').catch(() => {});
      return;
    }

    setStep('loading');

    try {
      const { data, error } = await supabase.functions.invoke('gerar-cupom-indicacao', {
        body: {
          company_id: companyId,
          referred_by_identifier: name,
        },
      });

      if (error || !data?.cupom) {
        throw new Error(data?.error || 'Erro ao gerar cupom');
      }

      setCupom(data.cupom);
      setCompany(data.company);
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
    } catch {
      // fallback silencioso
    }
  }

  // ── Formatar desconto ─────────────────────────────────
  function formatDiscount(): string {
    if (!cupom) return '';
    if (cupom.discount_type === 'percentage') return `${cupom.discount_value}% de desconto`;
    return `R$ ${cupom.discount_value.toFixed(2).replace('.', ',')} de desconto`;
  }

  // ── Estilos base ──────────────────────────────────────
  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-white/10' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-white/60' : 'text-gray-500';

  // ── RENDER ────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl shadow-2xl border ${bg} ${border} overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${border}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎟️</span>
            <span className={`font-bold text-base ${textPrimary}`}>Meu Cupom</span>
          </div>
          <button
            onClick={onClose}
            className={`text-xl font-bold leading-none ${textSecondary} hover:${textPrimary} transition-colors`}
          >✕</button>
        </div>

        {/* Body */}
        <div className="px-5 py-6">

          {/* ── STEP: INPUT ── */}
          {step === 'input' && (
            <div className="space-y-4">
              <p className={`text-sm ${textSecondary}`}>
                Digite seu nome para gerar um cupom de desconto personalizado.
              </p>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>
                  Seu nome
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  placeholder="Ex: João Silva"
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all
                    ${isDark
                      ? 'bg-slate-800 border-white/10 text-white placeholder-white/30 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                    } outline-none`}
                />
              </div>

              {/* Dica de voz */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
              }`}>
                <span>🎤</span>
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

          {/* ── STEP: LOADING ── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className={`text-sm ${textSecondary}`}>Gerando seu cupom...</p>
            </div>
          )}

          {/* ── STEP: RESULT ── */}
          {step === 'result' && cupom && (
            <div className="space-y-4">
              {/* Badge desconto */}
              <div className={`text-center px-4 py-2 rounded-xl font-bold text-sm ${
                isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-700'
              }`}>
                🎉 {formatDiscount()}
              </div>

              {/* Código */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                isDark ? 'bg-slate-800 border-white/10' : 'bg-gray-50 border-gray-200'
              }`}>
                <span className={`font-mono font-bold text-lg tracking-widest ${textPrimary}`}>
                  {cupom.code}
                </span>
                <button
                  onClick={handleCopy}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    copied
                      ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                      : isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>

              {/* QR Code */}
              <div className="flex justify-center py-2">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <QRCodeSVG
                    value={cupom.qr_value || cupom.code}
                    size={160}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Validade */}
              {cupom.expires_at && (
                <p className={`text-center text-xs ${textSecondary}`}>
                  Válido até {new Date(cupom.expires_at).toLocaleDateString('pt-BR')}
                </p>
              )}

              {/* Empresa */}
              {company?.name && (
                <p className={`text-center text-xs ${textSecondary}`}>
                  Cupom de <strong>{company.name}</strong>
                </p>
              )}

              {/* Fechar */}
              <button
                onClick={onClose}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  isDark
                    ? 'border-white/10 text-white/60 hover:bg-white/5'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Fechar
              </button>
            </div>
          )}

          {/* ── STEP: ERROR ── */}
          {step === 'error' && (
            <div className="space-y-4 py-2">
              <div className={`px-4 py-3 rounded-xl text-sm ${
                isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'
              }`}>
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
                  onClick={onClose}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    isDark ? 'border-white/10 text-white/60 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        {step === 'result' && (
          <div className={`px-5 py-2.5 border-t text-center text-xs ${border} ${textSecondary}`}>
            Fecha automaticamente em 30s
          </div>
        )}
      </div>
    </div>
  );
}
