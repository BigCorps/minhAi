// components/assistant/InfinitePayDisplay.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Link, Smartphone, CreditCard, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InfinitePayDisplayProps {
  data: {
    companyId: string;
    tipo: 'LINK_PAGAMENTO' | 'NFC';
    nfc_payment_method?: 'debit' | 'credit';
    amount_cents: number;
    telefone?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

type Stage =
  | 'generating'       // Chamando edge function
  | 'awaiting_payment' // NFC: esperando aproximação | Link: exibindo link
  | 'confirmed'        // Pagamento confirmado, cobrando crédito
  | 'error';           // Erro em qualquer etapa

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function InfinitePayDisplay({
  data,
  onClose,
  theme = 'dark',
}: InfinitePayDisplayProps) {
  const CONFIRMED_CLOSE_DELAY = 3000; // ms após confirmação

  const supabase = createClient();
  const isDark = theme === 'dark';

  // ── Estado ──────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('generating');
  const [link, setLink] = useState('');
  const [cobrancaId, setCobrancaId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isNFC = data.tipo === 'NFC';
  const isDebit = data.nfc_payment_method === 'debit';

  // ── Cleanup ao desmontar ─────────────────────────────────────────────────
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // ── Fechar manual ─────────────────────────────────────────────────────────
  const handleManualClose = useCallback(() => {
    window.speechSynthesis.cancel();
    onClose();
  }, [onClose]);

  // ── Gerar cobrança na Edge Function ──────────────────────────────────────
  const gerarCobranca = useCallback(async () => {
    setStage('generating');
    setErrorMsg('');

    try {
      const { data: res, error } = await supabase.functions.invoke(
        'gerar-cobranca-infinitepay',
        {
          body: {
            company_id: data.companyId,
            amount_cents: data.amount_cents,
            tipo: data.tipo,
            nfc_payment_method: data.nfc_payment_method,
            telefone: data.telefone ? data.telefone.replace(/\D/g, '') : undefined,
          },
        },
      );

      if (error || !res?.success)
        throw new Error(error?.message || res?.error || 'Erro ao gerar cobrança');

      setLink(res.link_cobranca);
      setCobrancaId(res.cobranca_id);
      setStage('awaiting_payment');

      // NFC → abrir deep link automaticamente
      if (isNFC) {
        window.open(res.link_cobranca, '_blank');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setStage('error');
    }
  }, [supabase, data, isNFC]);

  // ── Auto-gerar ao montar ──────────────────────────────────────────────────
  useEffect(() => {
    gerarCobranca();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intencionalmente sem deps — só roda na montagem

  // ── Confirmar pagamento ───────────────────────────────────────────────────
  const handleConfirmarPagamento = useCallback(async () => {
    if (!cobrancaId) return;
    setStage('confirmed');

    try {
      const { data: res, error } = await supabase.functions.invoke(
        'confirmar-pagamento-infinitepay',
        { body: { cobranca_id: cobrancaId, company_id: data.companyId } },
      );

      if (error || !res?.success)
        throw new Error(error?.message || res?.error || 'Erro ao confirmar');

      // Fecha automaticamente após delay para mostrar sucesso
      setTimeout(() => {
        window.speechSynthesis.cancel();
        onClose();
      }, CONFIRMED_CLOSE_DELAY);

    } catch (err: any) {
      setErrorMsg(err.message);
      // Volta para tela de pagamento para o usuário tentar de novo ou fechar
      setStage('awaiting_payment');
    }
  }, [cobrancaId, data.companyId, supabase, onClose]);

  // ── Textos dinâmicos ──────────────────────────────────────────────────────
  const tipoLabel = isNFC
    ? `NFC ${isDebit ? 'Débito' : 'Crédito'}`
    : 'Link de Pagamento';

  const amountFormatted = formatBRL(data.amount_cents);

  // ─── Render ──────────────────────────────────────────────────────────────

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300
          ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b
          ${isDark ? 'border-white/10' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            {isNFC
              ? <Smartphone className={`w-5 h-5 ${isDebit ? 'text-emerald-400' : 'text-red-400'}`} />
              : <Link className="w-5 h-5 text-violet-400" />
            }
            <div>
              <h2 className={`text-base font-bold leading-tight
                ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {tipoLabel}
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {amountFormatted} · InfinitePay
              </p>
            </div>
          </div>

          <button
            onClick={handleManualClose}
            className={`p-2 rounded-lg transition-colors
              ${isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-500'}`}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="px-6 py-6 space-y-5">

          {/* ── Etapa: gerando ─────────────────────────────────────────── */}
          {stage === 'generating' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Gerando cobrança...
              </p>
            </div>
          )}

          {/* ── Etapa: aguardando pagamento ────────────────────────────── */}
          {stage === 'awaiting_payment' && (
            <div className="space-y-4">

              {/* ── NFC ─────────────────────────────────────────────── */}
              {isNFC && (
                <>
                  {/* Aviso NFC */}
                  <div className={`flex items-start gap-3 p-3 rounded-xl
                    ${isDark ? 'bg-amber-900/20 border border-amber-700/40' : 'bg-amber-50 border border-amber-200'}`}
                  >
                    <Smartphone className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      Esta função requer um <strong>aparelho com NFC</strong> e o app InfinitePay instalado.
                    </p>
                  </div>

                  {/* Instruções */}
                  <div className={`flex flex-col items-center gap-3 py-4 px-4 rounded-xl
                    ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center
                      ${isDebit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
                    >
                      <CreditCard className={`w-7 h-7 ${isDebit ? 'text-emerald-400' : 'text-red-400'}`} />
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      App InfinitePay aberto!
                    </p>
                    <p className={`text-xs text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Aproxime o cartão {isDebit ? 'de débito' : 'de crédito'} do cliente para realizar o pagamento de <strong>{amountFormatted}</strong>.
                    </p>
                  </div>

                  {/* Botão reabrir app */}
                  <button
                    onClick={() => window.open(link, '_blank')}
                    className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-colors
                      ${isDark
                        ? 'border-white/10 text-slate-300 hover:bg-white/5'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Reabrir app InfinitePay
                  </button>
                </>
              )}

              {/* ── LINK DE PAGAMENTO ────────────────────────────────── */}
              {!isNFC && (
                <>
                  {/* Aviso sobre telefone no checkout */}
                  <div className={`flex items-start gap-3 p-3 rounded-xl
                    ${isDark ? 'bg-violet-900/20 border border-violet-700/40' : 'bg-violet-50 border border-violet-200'}`}
                  >
                    <Smartphone className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    <p className={`text-xs ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                      O cliente deve preencher o <strong>telefone</strong> na tela de checkout para receber o código de confirmação da InfinitePay.
                    </p>
                  </div>

                  <button
                    onClick={() => window.open(link, '_blank')}
                    className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700
                               text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Link className="w-4 h-4" />
                    Abrir link no browser
                  </button>

                  <button
                    onClick={() => navigator.clipboard.writeText(link)}
                    className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-colors
                      ${isDark
                        ? 'border-white/10 text-slate-300 hover:bg-white/5'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Copiar link
                  </button>
                </>
              )}

              {/* Erro ao confirmar (não bloqueia o fluxo) */}
              {errorMsg && (
                <div className={`flex items-start gap-2 p-3 rounded-xl
                  ${isDark ? 'bg-red-900/20 border border-red-700/40' : 'bg-red-50 border border-red-200'}`}
                >
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-700'}`}>{errorMsg}</p>
                </div>
              )}

              {/* ── Botão de confirmação ── */}
              <div className={`pt-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs text-center mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Após o pagamento ser realizado pelo cliente:
                </p>
                <button
                  onClick={handleConfirmarPagamento}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700
                             text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirmar pagamento recebido
                </button>
              </div>
            </div>
          )}

          {/* ── Etapa: confirmado ──────────────────────────────────────── */}
          {stage === 'confirmed' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-emerald-400" />
              </div>
              <div className="text-center space-y-1">
                <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Pagamento confirmado!
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {amountFormatted} · {tipoLabel}
                </p>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Fechando automaticamente...
              </p>
            </div>
          )}

          {/* ── Etapa: erro ───────────────────────────────────────────── */}
          {stage === 'error' && (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 p-4 rounded-xl
                ${isDark ? 'bg-red-900/20 border border-red-700/40' : 'bg-red-50 border border-red-200'}`}
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                    Erro ao gerar cobrança
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                    {errorMsg}
                  </p>
                </div>
              </div>
              <button
                onClick={() => gerarCobranca()}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700
                           text-white font-semibold text-sm transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* ── Barra verde na confirmação ────────────────────────────────── */}
        {stage === 'confirmed' && (
          <div className="h-1 bg-emerald-500" />
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
