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
    // Telefone pode vir pré-preenchido se o usuário falou no comando de voz
    telefone?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

type Stage =
  | 'input_telefone'   // Link: solicitar telefone (se não veio via voz)
  | 'generating'       // Chamando edge function
  | 'awaiting_payment' // NFC: esperando aproximação | Link: exibindo link
  | 'confirmed'        // Pagamento confirmado, cobrando crédito
  | 'error';           // Erro em qualquer etapa

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatTelefone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return raw;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function InfinitePayDisplay({
  data,
  onClose,
  theme = 'dark',
}: InfinitePayDisplayProps) {
  const AUTO_CLOSE_SECONDS = 60; // Tempo maior para pagamento
  const CONFIRMED_CLOSE_DELAY = 3000; // ms após confirmação

  const supabase = createClient();
  const isDark = theme === 'dark';

  // ── Estado ──────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>(() => {
    // Link sem telefone → pedir telefone; qualquer outro → gerar direto
    if (data.tipo === 'LINK_PAGAMENTO' && !data.telefone) return 'input_telefone';
    return 'generating';
  });

  const [telefone, setTelefone] = useState(data.telefone || '');
  const [link, setLink] = useState('');
  const [cobrancaId, setCobrancaId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_SECONDS);
  const [timerActive, setTimerActive] = useState(false);

  const isNFC = data.tipo === 'NFC';
  const isDebit = data.nfc_payment_method === 'debit';

  // ── Cleanup ao desmontar (Regra 3) ───────────────────────────────────────
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // ── Timer de auto-close (ativado após gerar link) ─────────────────────────
  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.speechSynthesis.cancel();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, onClose]);

  // ── Fechar manual (Regra 2) ───────────────────────────────────────────────
  const handleManualClose = useCallback(() => {
    window.speechSynthesis.cancel();
    onClose();
  }, [onClose]);

  // ── Gerar cobrança na Edge Function ──────────────────────────────────────
  const gerarCobranca = useCallback(async (tel?: string) => {
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
            telefone: tel ? tel.replace(/\D/g, '') : undefined,
          },
        },
      );

      if (error || !res?.success)
        throw new Error(error?.message || res?.error || 'Erro ao gerar cobrança');

      setLink(res.link_cobranca);
      setCobrancaId(res.cobranca_id);
      setStage('awaiting_payment');
      setTimerActive(true);

      // NFC → abrir deep link automaticamente
      if (isNFC) {
        window.open(res.link_cobranca, '_blank');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setStage('error');
    }
  }, [supabase, data, isNFC]);

  // ── Auto-gerar ao montar se não precisar de telefone ─────────────────────
  useEffect(() => {
    if (stage === 'generating') {
      gerarCobranca(data.telefone);
    }
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
      // Mesmo com erro na confirmação, o pagamento pode ter ocorrido
      // Mostramos o erro mas deixamos o usuário fechar manualmente
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

          <div className="flex items-center gap-2">
            {timerActive && stage === 'awaiting_payment' && (
              <span className={`text-xs px-2 py-1 rounded-full
                ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}
              >
                {timeLeft}s
              </span>
            )}
            <button
              onClick={handleManualClose}
              className={`p-2 rounded-lg transition-colors
                ${isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-500'}`}
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="px-6 py-6 space-y-5">

          {/* ── Etapa: solicitar telefone (Link de Pagamento) ──────────── */}
          {stage === 'input_telefone' && (
            <div className="space-y-4">
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Informe o <strong>telefone do cliente</strong> (com DDD) para enviar o link de pagamento via InfinitePay.
              </p>
              <div>
                <label className={`block text-xs font-medium mb-1
                  ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
                >
                  Telefone (com DDD)
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors
                    focus:outline-none focus:ring-2 focus:ring-violet-500
                    ${isDark
                      ? 'bg-slate-900 border-white/10 text-white placeholder-slate-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                />
              </div>
              <button
                onClick={() => gerarCobranca(telefone)}
                disabled={telefone.replace(/\D/g, '').length < 10}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700
                           disabled:opacity-40 disabled:cursor-not-allowed
                           text-white font-semibold text-sm transition-colors"
              >
                Gerar Link · {amountFormatted}
              </button>
            </div>
          )}

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
                  <div className={`p-4 rounded-xl space-y-1
                    ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}
                  >
                    <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Link enviado para
                    </p>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {formatTelefone(telefone || data.telefone || '')}
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
                onClick={() =>
                  data.tipo === 'LINK_PAGAMENTO' && !data.telefone && !telefone
                    ? setStage('input_telefone')
                    : gerarCobranca(telefone || data.telefone)
                }
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700
                           text-white font-semibold text-sm transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* ── Progress bar (visível apenas quando aguardando pagamento) ── */}
        {stage === 'awaiting_payment' && timerActive && (
          <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-violet-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / AUTO_CLOSE_SECONDS) * 100}%` }}
            />
          </div>
        )}

        {/* ── Barra verde na confirmação ────────────────────────────────── */}
        {stage === 'confirmed' && (
          <div className="h-1 bg-emerald-500" />
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
