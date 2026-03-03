// components/assistant/InfinitePayDisplay.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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

type Stage = 'generating' | 'awaiting_payment' | 'confirmed' | 'error';

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function InfinitePayDisplay({ data, onClose, theme = 'dark' }: InfinitePayDisplayProps) {
  const CONFIRMED_CLOSE_DELAY = 3000;
  const supabase = createClient();
  const isDark = theme === 'dark';

  const [stage, setStage] = useState<Stage>('generating');
  const [link, setLink] = useState('');
  const [cobrancaId, setCobrancaId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingMsg, setPendingMsg] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmarPagamentoRef = useRef<() => void>(() => {});
  const handleManualCloseRef = useRef<() => void>(() => {});

  const isNFC = data.tipo === 'NFC';
  const isDebit = data.nfc_payment_method === 'debit';
  const tipoLabel = isNFC ? `NFC ${isDebit ? 'Débito' : 'Crédito'}` : 'Link de Pagamento';
  const amountFormatted = formatBRL(data.amount_cents);

  useEffect(() => { return () => window.speechSynthesis.cancel(); }, []);

  const handleManualClose = useCallback(() => {
    window.speechSynthesis.cancel();
    onClose();
  }, [onClose]);

  const gerarCobranca = useCallback(async () => {
    setStage('generating');
    setErrorMsg('');
    setPendingMsg('');
    try {
      const { data: res, error } = await supabase.functions.invoke('gerar-cobranca-infinitepay', {
        body: {
          company_id: data.companyId,
          amount_cents: data.amount_cents,
          tipo: data.tipo,
          nfc_payment_method: data.nfc_payment_method,
          telefone: data.telefone ? data.telefone.replace(/\D/g, '') : undefined,
        },
      });
      if (error || !res?.success) throw new Error(error?.message || res?.error || 'Erro ao gerar cobrança');
      setLink(res.link_cobranca);
      setCobrancaId(res.cobranca_id);
      setStage('awaiting_payment');
      if (isNFC) window.open(res.link_cobranca, '_blank');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStage('error');
    }
  }, [supabase, data, isNFC]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { gerarCobranca(); }, []);

  // Recognition de voz na etapa de pagamento
useEffect(() => {
  if (stage !== 'awaiting_payment') return;
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const voiceRecognition = new SpeechRecognition();

  voiceRecognition.lang = 'pt-BR';
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = false;
  voiceRecognition.maxAlternatives = 3;

  const CONFIRM_TRIGGERS = [
    'confirmar pagamento', 'confirmar', 'confirma', 'pagamento recebido',
    'pago', 'recebi', 'foi pago', 'cliente pagou', 'pagou',
    'pode confirmar', 'confirme', 'sim',
  ];

  const CANCEL_TRIGGERS = [
    'cancelar', 'cancela', 'fechar', 'não', 'sair', 'fecha',
  ];

  voiceRecognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:]+/g, '');

    console.log('🎤 [Pagamento] Ouviu:', transcript);

    if (CONFIRM_TRIGGERS.some(t => transcript.includes(t))) {
      console.log('✅ Confirmação de pagamento por voz');
      handleConfirmarPagamentoRef.current();
    } else if (CANCEL_TRIGGERS.some(t => transcript.includes(t))) {
      console.log('❌ Fechar detectado por voz');
      handleManualCloseRef.current();
    } else {
      try { voiceRecognition.stop(); } catch (e) {}
      setTimeout(() => { try { voiceRecognition.start(); } catch (e) {} }, 300);
    }
  };

  voiceRecognition.onerror = (event: any) => {
    if (event.error === 'no-speech') {
      try { voiceRecognition.stop(); } catch (e) {}
      setTimeout(() => { try { voiceRecognition.start(); } catch (e) {} }, 300);
    }
  };

  voiceRecognition.start();
  console.log('👂 [Pagamento] Ouvindo comandos de pagamento...');

  return () => {
    try { voiceRecognition.stop(); } catch (e) {}
  };
}, [stage]);

  // fetch() direto para capturar o status HTTP real
  // HTTP 400 + pending:true → aviso amarelo inline, modal NÃO fecha
  // HTTP 200 + success:true → confirma e fecha
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

  useEffect(() => {
    handleManualCloseRef.current = handleManualClose;
  }, [handleManualClose]);

  useEffect(() => {
    handleConfirmarPagamentoRef.current = handleConfirmarPagamento;
  }, [handleConfirmarPagamento]);

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
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{amountFormatted} · InfinitePay</p>
            </div>
          </div>
          <button onClick={handleManualClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-500'}`} aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">

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

              {/* Aviso pendente — amarelo, não fecha o modal */}
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
