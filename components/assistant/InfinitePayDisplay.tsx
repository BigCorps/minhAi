// components/assistant/InfinitePayDisplay.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createPortal } from 'react-dom';
import { X, Link, Smartphone, CreditCard, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

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

type Stage = 'input' | 'generating' | 'awaiting_payment' | 'confirmed' | 'error';

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function extractCentsFromTranscript(t: string): number | null {
  const wordMap: Record<string, string> = {
    'zero': '0', 'um': '1', 'uma': '1', 'dois': '2', 'duas': '2',
    'três': '3', 'tres': '3', 'quatro': '4', 'cinco': '5', 'seis': '6',
    'sete': '7', 'oito': '8', 'nove': '9', 'dez': '10', 'onze': '11',
    'doze': '12', 'treze': '13', 'quatorze': '14', 'quinze': '15',
    'dezesseis': '16', 'dezessete': '17', 'dezoito': '18', 'dezenove': '19',
    'vinte': '20', 'trinta': '30', 'quarenta': '40', 'cinquenta': '50',
    'sessenta': '60', 'setenta': '70', 'oitenta': '80', 'noventa': '90',
    'cem': '100', 'cento': '100', 'duzentos': '200', 'trezentos': '300',
    'quatrocentos': '400', 'quinhentos': '500', 'mil': '1000',
  }
  let normalized = t
  for (const [word, num] of Object.entries(wordMap)) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), num)
  }
  const match = normalized.match(/(\d+(?:[.,]\d{1,2})?)/)
  if (!match) return null
  const value = parseFloat(match[1].replace(',', '.'))
  if (isNaN(value) || value <= 0) return null
  return Math.round(value * 100)
}

export default function InfinitePayDisplay({ data, onClose, theme = 'dark' }: InfinitePayDisplayProps) {
  const CONFIRMED_CLOSE_DELAY = 3000;
  const supabase = createClient();
  const isDark = theme === 'dark';

  const needsAmountInput = !data.amount_cents || data.amount_cents < 100;

  const [stage, setStage] = useState<Stage>(needsAmountInput ? 'input' : 'generating');
  const [amountInput, setAmountInput] = useState(
    !needsAmountInput ? (data.amount_cents / 100).toFixed(2) : ''
  );
  const [amountCents, setAmountCents] = useState(needsAmountInput ? 0 : data.amount_cents);
  const [link, setLink] = useState('');
  const [cobrancaId, setCobrancaId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [inputError, setInputError] = useState('');
  const [pendingMsg, setPendingMsg] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmarPagamentoRef = useRef<() => void>(() => {});
  const handleManualCloseRef = useRef<() => void>(() => {});
  const onCloseRef = useRef<() => void>(() => {});
  const handleGerarRef = useRef<(overrideCents?: number) => void>(() => {});

  const isNFC = data.tipo === 'NFC';
  const isDebit = data.nfc_payment_method === 'debit';
  const tipoLabel = isNFC ? `NFC ${isDebit ? 'Débito' : 'Crédito'}` : 'Link de Pagamento';
  const amountFormatted = formatBRL(amountCents);

  useEffect(() => { return () => window.speechSynthesis.cancel(); }, []);

  const handleManualClose = useCallback(() => {
    window.speechSynthesis.cancel();
    onClose();
  }, [onClose]);

  // ── Reconhecimento de voz ──────────────────────────────────────────────────
  // stage 'input'           → ouve valor em reais e dispara a cobrança
  // stage 'awaiting_payment' → ouve "confirmar" / "fechar"

  useModalVoiceCommand({
    active: stage === 'input' || stage === 'awaiting_payment',
    onTranscript: (transcript) => {
      const t = transcript.toLowerCase().trim();

      const CANCEL_TRIGGERS = ['cancelar', 'cancela', 'fechar', 'fecha', 'nao', 'não', 'sair', 'sai'];
      if (CANCEL_TRIGGERS.some(w => t.includes(w))) {
        window.speechSynthesis.cancel();
        handleManualCloseRef.current();
        return;
      }

      if (stage === 'awaiting_payment') {
        const CONFIRM_TRIGGERS = [
          'confirmar pagamento', 'confirmar', 'confirma', 'pagamento recebido',
          'pago', 'recebi', 'foi pago', 'cliente pagou', 'pagou',
          'pode confirmar', 'confirme', 'sim',
        ];
        if (CONFIRM_TRIGGERS.some(trigger => t.includes(trigger))) {
          handleConfirmarPagamentoRef.current();
        }
        return;
      }

      if (stage === 'input') {
        const cents = extractCentsFromTranscript(t);
        if (cents && cents >= 100) {
          handleGerarRef.current(cents);
        }
      }
    }
  });

  const gerarCobranca = useCallback(async (overrideCents?: number) => {
    const cents = overrideCents ?? amountCents;
    if (!cents || cents < 100) return;

    setStage('generating');
    setErrorMsg('');
    setPendingMsg('');
    try {
      const { data: res, error } = await supabase.functions.invoke('gerar-cobranca-infinitepay', {
        body: {
          company_id: data.companyId,
          amount_cents: cents,
          tipo: data.tipo,
          nfc_payment_method: data.nfc_payment_method,
          telefone: data.telefone ? data.telefone.replace(/\D/g, '') : undefined,
        },
      });
      if (error || !res?.success) throw new Error(error?.message || res?.error || 'Erro ao gerar cobrança');

      setCobrancaId(res.cobranca_id);

      if (isNFC) {
        setLink(res.link_cobranca);
        window.open(res.link_cobranca, '_blank');
      } else {
        try {
          const { createShortLink } = await import('@/lib/short-links');
          const shortUrl = await createShortLink(
            res.link_cobranca,
            data.companyId,
            res.cobranca_id
          );
          setLink(shortUrl);
        } catch {
          setLink(res.link_cobranca);
        }
      }

      setStage('awaiting_payment');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStage('error');
    }
  }, [supabase, data, isNFC, amountCents]);

  // Auto-disparo quando amount_cents já vem preenchido
  useEffect(() => {
    if (!needsAmountInput) {
      gerarCobranca(data.amount_cents);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submeter valor manual ──────────────────────────────────────────────────

  function handleSubmitAmount(overrideCents?: number) {
    const cents = overrideCents ?? Math.round(parseFloat(amountInput.replace(',', '.') || '0') * 100);
    if (!cents || cents < 100) {
      setInputError('Valor mínimo é R$ 1,00');
      return;
    }
    if (overrideCents) {
      setAmountInput((overrideCents / 100).toFixed(2));
    }
    setInputError('');
    setAmountCents(cents);
    gerarCobranca(cents);
  }

  // Manter refs atualizados
  useEffect(() => { handleGerarRef.current = handleSubmitAmount; });

  const handleConfirmarPagamento = useCallback(async () => {
    if (!cobrancaId || isConfirming) return;
    setIsConfirming(true);
    setPendingMsg('');
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const response = await fetch(`${supabaseUrl}/functions/v1/confirmar-pagamento-infinitepay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ cobranca_id: cobrancaId, company_id: data.companyId }),
      });
      const json = await response.json();
      if (response.status === 400 && json.pending) {
        setPendingMsg(json.error || 'Pagamento ainda não identificado. Aguarde o cliente pagar e tente novamente.');
        return;
      }
      if (!response.ok || !json.success) {
        setPendingMsg(json.error || 'Erro ao confirmar. Tente novamente.');
        return;
      }
      setStage('confirmed');
      setTimeout(() => { window.speechSynthesis.cancel(); onClose(); }, CONFIRMED_CLOSE_DELAY);
    } catch {
      setPendingMsg('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsConfirming(false);
    }
  }, [cobrancaId, data.companyId, isConfirming, onClose]);

  useEffect(() => { handleManualCloseRef.current = handleManualClose; }, [handleManualClose]);
  useEffect(() => { handleConfirmarPagamentoRef.current = handleConfirmarPagamento; }, [handleConfirmarPagamento]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            {isNFC
              ? <Smartphone className={`w-5 h-5 ${isDebit ? 'text-emerald-400' : 'text-red-400'}`} />
              : <Link className="w-5 h-5 text-violet-400" />
            }
            <div>
              <h2 className={`text-base font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{tipoLabel}</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {stage !== 'input' ? `${amountFormatted} · ` : ''}InfinitePay
              </p>
            </div>
          </div>
          <button onClick={handleManualClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-500'}`} aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">

          {/* ── INPUT ── */}
          {stage === 'input' && (
            <div className="space-y-4">

              {/* Indicador de voz */}
              <div className="flex justify-center">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium ${
                  isDark
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Ouvindo... diga o valor ou "FECHAR"
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Valor (R$)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => { setAmountInput(e.target.value); setInputError(''); }}
                  placeholder="0,00"
                  className={`w-full border rounded-lg px-3 py-2 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                    isDark
                      ? 'bg-slate-700 border-white/10 text-white placeholder-slate-500'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {inputError && (
                <div className={`flex items-start gap-2 p-3 rounded-lg ${
                  isDark ? 'bg-red-900/20 border border-red-700/40' : 'bg-red-50 border border-red-200'
                }`}>
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>{inputError}</p>
                </div>
              )}

              <button
                onClick={() => handleSubmitAmount()}
                disabled={!amountInput}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isNFC ? <Smartphone className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                {isNFC ? 'Enviar para NFC' : 'Gerar Link de Pagamento'}
              </button>
            </div>
          )}

          {stage === 'generating' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Gerando cobrança...</p>
            </div>
          )}

          {stage === 'awaiting_payment' && (
            <div className="space-y-4">

              <div className="flex justify-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  isDark ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Ouvindo... diga "CONFIRMAR PAGAMENTO" ou "FECHAR"
                </div>
              </div>

              {/* NFC */}
              {isNFC && (
                <>
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-amber-900/20 border border-amber-700/40' : 'bg-amber-50 border border-amber-200'}`}>
                    <Smartphone className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      Esta função requer um <strong>aparelho com NFC</strong> e o app InfinitePay instalado.
                    </p>
                  </div>
                  <div className={`flex flex-col items-center gap-3 py-4 px-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDebit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                      <CreditCard className={`w-7 h-7 ${isDebit ? 'text-emerald-400' : 'text-red-400'}`} />
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>App InfinitePay aberto!</p>
                    <p className={`text-xs text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Aproxime o cartão {isDebit ? 'de débito' : 'de crédito'} do cliente para realizar o pagamento de <strong>{amountFormatted}</strong>.
                    </p>
                  </div>
                  <button onClick={() => window.open(link, '_blank')} className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    Reabrir app InfinitePay
                  </button>
                </>
              )}

              {/* Link de Pagamento */}
              {!isNFC && (
                <>
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-violet-900/20 border border-violet-700/40' : 'bg-violet-50 border border-violet-200'}`}>
                    <Smartphone className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    <p className={`text-xs ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                      O cliente deve preencher o <strong>telefone</strong> na tela de checkout para receber o código de confirmação da InfinitePay.
                    </p>
                  </div>
                  <button onClick={() => window.open(link, '_blank')} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                    <Link className="w-4 h-4" />
                    Abrir link no browser
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(link)} className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    Copiar link
                  </button>
                </>
              )}

              {/* Aviso pendente */}
              {pendingMsg && (
                <div className={`flex items-start gap-2 p-3 rounded-xl ${isDark ? 'bg-amber-900/20 border border-amber-700/40' : 'bg-amber-50 border border-amber-200'}`}>
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{pendingMsg}</p>
                </div>
              )}

              {/* Botão confirmar */}
              <div className={`pt-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-xs text-center mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Após o pagamento ser realizado pelo cliente:</p>
                <button
                  onClick={handleConfirmarPagamento}
                  disabled={isConfirming}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isConfirming ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Verificando pagamento...</>
                  ) : (
                    <><CheckCircle className="w-5 h-5" />Confirmar pagamento recebido</>
                  )}
                </button>
              </div>
            </div>
          )}

          {stage === 'confirmed' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-emerald-400" />
              </div>
              <div className="text-center space-y-1">
                <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Pagamento confirmado!</p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{amountFormatted} · {tipoLabel}</p>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Fechando automaticamente...</p>
            </div>
          )}

          {stage === 'error' && (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 p-4 rounded-xl ${isDark ? 'bg-red-900/20 border border-red-700/40' : 'bg-red-50 border border-red-200'}`}>
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Erro ao gerar cobrança</p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{errorMsg}</p>
                </div>
              </div>
              <button onClick={() => gerarCobranca()} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors">
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {stage === 'confirmed' && <div className="h-1 bg-emerald-500" />}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
