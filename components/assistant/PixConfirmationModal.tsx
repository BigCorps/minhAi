'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Copy, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { triggerAutoPrint, formatPixReceipt } from '@/lib/auto-print';
import { useTurnstile } from '@/hooks/useTurnstile';

interface PIXConfirmationModalProps {
  transactionId: string;
  amount: string;
  qrCodeUrl: string;
  pixCode: string;
  companyName?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
  theme?: 'dark' | 'light';
  /** Se true, exibe botão de impressão após confirmação (requer plano ativo) */
  printOnPayment?: boolean;
  hasActivePlan?: boolean;
  /** Necessário para impressão automática via auto-print */
  companyId?: string;
}

export default function PIXConfirmationModal({
  transactionId,
  amount,
  qrCodeUrl,
  pixCode,
  companyName = '',
  onConfirm,
  onCancel,
  theme = 'dark',
  printOnPayment = false,
  hasActivePlan = false,
  companyId = '',
}: PIXConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false)
  const [confirmed, setConfirmed] = useState(false);
  const { getToken, containerRef } = useTurnstile();

  const handleAutoPrint = async () => {
    if (!hasActivePlan || !printOnPayment || !companyId) return;

    const receiptContent = formatPixReceipt({
      companyName: companyName || '',
      amount,
      transactionId,
    });

    const result = await triggerAutoPrint({
      companyId,
      trigger: 'payment',
      content: receiptContent,
    });

    if (result.useWindowPrint) {
      window.print();
    } else if ((result as any).useThermalPrint && (result as any).thermalContent) {
      try {
        const { thermalPrinterService } = await import('@/lib/thermal-printer-service');
        await thermalPrinterService.printText((result as any).thermalContent, { cut: true });
      } catch (e) { console.error('Erro impressão térmica:', e); }
    }
  };
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  const supabase = createClient();
  
  const isDark = theme === 'dark';

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Aguarda 30s após o modal abrir antes de começar o auto-check
  useEffect(() => {
    const startDelay = setTimeout(() => setAutoChecking(true), 30000);
    return () => clearTimeout(startDelay);
  }, []);

  // Polling a cada 5s
  useEffect(() => {
    if (!autoChecking) return;
    const interval = setInterval(async () => {
      try {
        const response = await supabase.functions.invoke('confirmar-pix-assistente', {
          body: { transaction_id: transactionId },
        });
// No useEffect do polling (linha ~107)
if (!response.error && response.data?.success) {
  showToast(`✅ Pagamento confirmado!`, 'success');
  clearInterval(interval);
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // ✅ Imprimir automaticamente no auto-check também
  if (printOnPayment && hasActivePlan && companyId) {
    try {
      const receiptContent = formatPixReceipt({ companyName, amount, transactionId });
      const result = await triggerAutoPrint({ companyId, trigger: 'payment', content: receiptContent });
      if (result.useWindowPrint) printReceiptInIframe(receiptContent);
      else if ((result as any).useThermalPrint) {
        const { thermalPrinterService } = await import('@/lib/thermal-printer-service');
        await thermalPrinterService.printText((result as any).thermalContent, { cut: true });
      }
    } catch { /* silencioso */ }
  }

  setConfirmed(true);
  await onConfirm();
}
      } catch {
        // silencioso
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [autoChecking]);

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'warning') => {
    setToast({ message, type });
  };

const handleConfirm = async () => {
  try {
    setIsConfirming(true);

    const token = await getToken();
    if (token) console.log("Segurança validada");

    // 1. Imprime ANTES de confirmar/fechar
    if (printOnPayment && hasActivePlan && companyId) {
      try {
        const receiptContent = formatPixReceipt({
          companyName,
          amount,
          transactionId,
        });
        const result = await triggerAutoPrint({
          companyId,
          trigger: 'payment',
          content: receiptContent,
        });
        if (result.useWindowPrint) printReceiptInIframe(receiptContent);
        else if ((result as any).useThermalPrint) {
          const { thermalPrinterService } = await import('@/lib/thermal-printer-service');
          await thermalPrinterService.printText((result as any).thermalContent, { cut: true });
        }
      } catch (printError) {
        console.error('Erro na impressão:', printError);
        // não bloqueia o fluxo se impressão falhar
      }
    }

    // 2. Confirma e fecha depois
    await onConfirm();
    setConfirmed(true);

  } catch (err) {
    console.error('Erro ao confirmar:', err);
  } finally {
    setIsConfirming(false);
  }
};

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancelar-pix-assistente', {
        body: { transaction_id: transactionId },
      });
      if (error) throw error;
      console.log('✅ PIX cancelado:', data);
      await onCancel();
    } catch (error: any) {
      alert('❌ Erro ao cancelar PIX: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Erro ao copiar');
    }
  };

  /* ─── color tokens ─── */
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const divider = isDark ? 'divide-slate-700' : 'divide-gray-200';
  const codeBg = isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3
            ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-400'}
            animate-in slide-in-from-top duration-300`}
        >
          {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />}
          {toast.type === 'success' && <Check className="w-5 h-5 text-white flex-shrink-0" />}
          {toast.type === 'error' && <X className="w-5 h-5 text-white flex-shrink-0" />}
          <p className="text-white font-semibold text-sm whitespace-nowrap">{toast.message}</p>
        </div>
      )}

      {/* Card wrapper — desktop: max-w-3xl horizontal | mobile: max-w-sm vertical */}
      <div
        className={`relative w-full rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border}
          max-w-sm md:max-w-3xl
          animate-in zoom-in-95 duration-300`}
      >
        {/* ═══════════════════════════════════════════════════
            DESKTOP LAYOUT — horizontal (md and above)
        ═══════════════════════════════════════════════════ */}
        <div className="hidden md:flex">
          {/* Left — QR Code */}
          <div className={`flex-shrink-0 flex items-center justify-center p-8 border-r ${border}`}>
            <div className="relative w-64 h-64 bg-white rounded-xl p-4 shadow-sm overflow-hidden">
              <img src={qrCodeUrl} alt="QR Code PIX" className="w-full h-full object-contain rounded-lg" />
              {copied && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/95 rounded-2xl animate-in fade-in zoom-in duration-200">
                  <Check className="w-12 h-12 text-white" />
                  <span className="text-white font-bold mt-1">Copiado!</span>
                </div>
              )}
            </div>
          </div>

          {/* Right — Info + Buttons */}
          <div className={`flex-1 flex flex-col divide-y ${divider}`}>
            {/* Header — Valor */}
            <div className={`px-8 py-6 ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'}`}>
              <p className={`text-xs font-medium uppercase tracking-widest mb-1 ${textMuted}`}>
                Valor a Pagar
              </p>
              <p className={`text-5xl font-bold tracking-tight ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                R$&nbsp;{amount}
              </p>
            </div>

            {/* Info block */}
            <div className="px-8 py-5 space-y-1.5">
              <InfoRow label="Empresa" value="Intermediações de Pagamentos BigCorps" isDark={isDark} />
              {companyName && <InfoRow label="Para" value={companyName} isDark={isDark} />}
              <InfoRow label="Banco" value="Banco Inter" isDark={isDark} />
              <InfoRow label="Validade" value="Válido por 30 minutos" isDark={isDark} highlight />
            </div>

            {/* PIX Code */}
            <div className="px-8 py-4 flex items-center gap-3">
              <div
                className={`flex-1 px-3 py-2 rounded-xl cursor-pointer transition font-mono text-xs truncate ${codeBg} ${textPrimary}`}
                onClick={handleCopy}
                title="Clique para copiar"
              >
                {pixCode.substring(0, 40)}…
              </div>
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 p-2.5 rounded-xl transition ${
                  copied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Buttons */}
            <div className="px-8 py-6 flex gap-4">
              {/* Confirm */}
              <VoiceButton
                onClick={handleConfirm}
                disabled={isConfirming || isCancelling}
                loading={isConfirming}
                color="green"
                label="CONFIRMAR PIX"
                icon={<Check className="w-6 h-6" />}
              />
              {/* Cancel */}
              <VoiceButton
                onClick={handleCancel}
                disabled={isConfirming || isCancelling}
                loading={isCancelling}
                color="red"
                label="CANCELAR PIX"
                icon={<X className="w-6 h-6" />}
              />
              {/* Print — só após confirmação */}
              {confirmed && printOnPayment && (
                <button
                  onClick={handleAutoPrint}
                  disabled={!hasActivePlan}
                  className={`flex items-center justify-center gap-2 px-5 py-4 rounded-lg text-sm font-semibold transition-all
                    ${hasActivePlan
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-gray-200 dark:bg-white/10 text-gray-400 opacity-50 cursor-not-allowed grayscale'
                    }`}
                  title={!hasActivePlan ? 'Impressão disponível apenas para planos ativos' : undefined}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            MOBILE LAYOUT — vertical (below md)
        ═══════════════════════════════════════════════════ */}
        <div className="md:hidden flex flex-col">
          {/* Valor */}
          <div className={`px-6 pt-6 pb-4 ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'}`}>
            <p className={`text-xs font-medium uppercase tracking-widest mb-1 ${textMuted}`}>Valor a Pagar</p>
            <p className={`text-4xl font-bold tracking-tight ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              R$&nbsp;{amount}
            </p>
          </div>

          {/* QR Code */}
          <div className={`flex justify-center items-center py-6 px-8 border-b ${border}`}>
            <div className="relative w-56 h-56 bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <img src={qrCodeUrl} alt="QR Code PIX" className="w-full h-full object-contain rounded-lg" />
              {copied && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/95 rounded-2xl animate-in fade-in zoom-in duration-200">
                  <Check className="w-10 h-10 text-white" />
                  <span className="text-white font-bold mt-1 text-sm">Copiado!</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className={`px-6 py-4 space-y-1.5 border-b ${border}`}>
            <InfoRow label="Empresa" value="Intermediações de Pagamentos BigCorps" isDark={isDark} />
            {companyName && <InfoRow label="Para" value={companyName} isDark={isDark} />}
            <InfoRow label="Banco" value="Banco Inter" isDark={isDark} />
            <InfoRow label="Validade" value="Válido por 30 minutos" isDark={isDark} highlight />
          </div>

          {/* PIX Code */}
          <div className={`px-6 py-3 flex items-center gap-3 border-b ${border}`}>
            <div
              className={`flex-1 px-3 py-2 rounded-xl cursor-pointer transition font-mono text-xs truncate ${codeBg} ${textPrimary}`}
              onClick={handleCopy}
            >
              {pixCode.substring(0, 30)}…
            </div>
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 p-2.5 rounded-xl transition ${
                copied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Buttons */}
          <div className="px-6 py-5 flex flex-col gap-3">
            <VoiceButton
              onClick={handleConfirm}
              disabled={isConfirming || isCancelling}
              loading={isConfirming}
              color="green"
              label="CONFIRMAR PIX"
              icon={<Check className="w-5 h-5" />}
              fullWidth
            />
            <VoiceButton
              onClick={handleCancel}
              disabled={isConfirming || isCancelling}
              loading={isCancelling}
              color="red"
              label="CANCELAR PIX"
              icon={<X className="w-5 h-5" />}
              fullWidth
            />
            {/* Print — só após confirmação */}
            {confirmed && printOnPayment && (
              <button
                onClick={handleAutoPrint}
                disabled={!hasActivePlan}
                className={`w-full py-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all
                  ${hasActivePlan
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-200 dark:bg-white/10 text-gray-400 opacity-50 cursor-not-allowed grayscale'
                  }`}
                title={!hasActivePlan ? 'Impressão disponível apenas para planos ativos' : undefined}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {!hasActivePlan ? 'Impressão (plano inativo)' : 'Enviar para Impressora'}
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Turnstile — container invisível para verificação de segurança */}
      <div ref={containerRef} style={{ display: 'none' }} aria-hidden="true" />
    </div>,
    document.body
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function InfoRow({
  label,
  value,
  isDark,
  highlight = false,
}: {
  label: string;
  value: string;
  isDark: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`text-xs font-medium uppercase tracking-wider flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {label}
      </span>
      <span
        className={`text-sm truncate ${
          highlight
            ? isDark ? 'text-amber-400' : 'text-amber-600'
            : isDark ? 'text-gray-200' : 'text-gray-700'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function VoiceButton({
  onClick,
  disabled,
  loading,
  color,
  label,
  icon,
  fullWidth = false,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  color: 'green' | 'red';
  label: string;
  icon: React.ReactNode;
  fullWidth?: boolean;
}) {
  const base =
    color === 'green'
      ? 'bg-green-600 hover:bg-green-500 active:bg-green-700'
      : 'bg-red-600 hover:bg-red-500 active:bg-red-700';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-3
        ${fullWidth ? 'w-full' : 'flex-1'}
        px-5 py-4 rounded-lg text-white
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${base}
      `}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      <div className="flex flex-col items-center leading-tight text-center">
        <span className="text-white/80 text-xs">Diga:</span>
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-white/50 text-[10px]">ou clique aqui</span>
      </div>
    </button>
  );
}
