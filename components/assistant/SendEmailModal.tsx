'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Mail, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type EmailStep = 'destinatario' | 'assunto' | 'corpo' | 'confirmacao';

interface SendEmailModalProps {
  companyId: string;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function SendEmailModal({
  companyId,
  onClose,
  theme = 'dark',
}: SendEmailModalProps) {
  const [step, setStep] = useState<EmailStep>('destinatario');
  const [destinatario, setDestinatario] = useState('');
  const [assunto, setAssunto] = useState('');
  const [corpo, setCorpo] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  
  const supabase = createClient();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'warning') => {
    setToast({ message, type });
  };

  // Simular captura de voz (você vai integrar com o sistema real)
  const startListening = (field: 'destinatario' | 'assunto' | 'corpo') => {
    setIsListening(true);
    
    // TODO: Integrar com seu sistema de STT
    // Por enquanto, simular com setTimeout
    setTimeout(() => {
      setIsListening(false);
      
      if (field === 'destinatario') {
        // Simulação - você vai pegar do STT real
        const email = prompt('Digite o email (temporário - será voz):');
        if (email) setDestinatario(email);
      } else if (field === 'assunto') {
        const subj = prompt('Digite o assunto (temporário - será voz):');
        if (subj) setAssunto(subj);
      } else if (field === 'corpo') {
        const body = prompt('Digite o corpo (temporário - será voz - diga FIM para terminar):');
        if (body) setCorpo(body);
      }
    }, 1000);
  };

  const handleConfirmDestinatario = () => {
    if (!destinatario) {
      showToast('Por favor, informe o email do destinatário', 'warning');
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(destinatario)) {
      showToast('Email inválido. Verifique o formato.', 'error');
      return;
    }
    
    setStep('assunto');
  };

  const handleConfirmAssunto = () => {
    if (!assunto) {
      showToast('Por favor, informe o assunto do email', 'warning');
      return;
    }
    setStep('corpo');
  };

  const handleConfirmCorpo = () => {
    if (!corpo) {
      showToast('Por favor, informe o conteúdo do email', 'warning');
      return;
    }
    setStep('confirmacao');
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id: companyId,
          to: destinatario,
          subject: assunto,
          body: corpo,
        },
      });

      if (error) throw error;

      if (!data.success) {
        showToast(data.speech_text || 'Erro ao enviar email', 'error');
        return;
      }

      showToast('✅ Email enviado com sucesso!', 'success');
      setTimeout(() => onClose(), 2000);
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      showToast('Erro ao enviar email. Tente novamente.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleEdit = (field: EmailStep) => {
    setStep(field);
  };

  // Color tokens
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

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
          <p className="text-white font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border}
          animate-in zoom-in-95 duration-300`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>
                  Enviar Email
                </h2>
                <p className={`text-sm ${textMuted}`}>
                  {step === 'destinatario' && 'Passo 1: Destinatário'}
                  {step === 'assunto' && 'Passo 2: Assunto'}
                  {step === 'corpo' && 'Passo 3: Conteúdo'}
                  {step === 'confirmacao' && 'Passo 4: Confirmação'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-slate-800">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width:
                step === 'destinatario' ? '25%' :
                step === 'assunto' ? '50%' :
                step === 'corpo' ? '75%' :
                '100%',
            }}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* STEP 1: Destinatário */}
          {step === 'destinatario' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Para qual email deseja enviar?
                </label>
                <input
                  type="email"
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  placeholder="exemplo@email.com"
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
              
              <div className="flex gap-3">
                <VoiceButton
                  onClick={() => startListening('destinatario')}
                  disabled={isListening}
                  loading={isListening}
                  label="FALAR EMAIL"
                  icon={<Mail className="w-5 h-5" />}
                />
                <button
                  onClick={handleConfirmDestinatario}
                  disabled={!destinatario}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Assunto */}
          {step === 'assunto' && (
            <div className="space-y-4">
              {/* Destinatário (preview) */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-between`}>
                <div>
                  <p className={`text-xs ${textMuted}`}>Para:</p>
                  <p className={`text-sm font-medium ${textPrimary}`}>{destinatario}</p>
                </div>
                <button
                  onClick={() => handleEdit('destinatario')}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Qual é o assunto do email?
                </label>
                <input
                  type="text"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder="Ex: Proposta Comercial"
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
              
              <div className="flex gap-3">
                <VoiceButton
                  onClick={() => startListening('assunto')}
                  disabled={isListening}
                  loading={isListening}
                  label="FALAR ASSUNTO"
                  icon={<Mail className="w-5 h-5" />}
                />
                <button
                  onClick={handleConfirmAssunto}
                  disabled={!assunto}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Corpo */}
          {step === 'corpo' && (
            <div className="space-y-4">
              {/* Preview anterior */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} space-y-2`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${textMuted}`}>Para:</p>
                    <p className={`text-sm font-medium ${textPrimary}`}>{destinatario}</p>
                  </div>
                  <button
                    onClick={() => handleEdit('destinatario')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${textMuted}`}>Assunto:</p>
                    <p className={`text-sm font-medium ${textPrimary}`}>{assunto}</p>
                  </div>
                  <button
                    onClick={() => handleEdit('assunto')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Qual o conteúdo do email?
                </label>
                <div className={`p-3 rounded-lg mb-2 ${isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'} border`}>
                  <p className={`text-xs ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                    💡 Diga <strong>FIM</strong> quando terminar de falar o conteúdo
                  </p>
                </div>
                <textarea
                  value={corpo}
                  onChange={(e) => setCorpo(e.target.value)}
                  placeholder="Digite ou fale o conteúdo do email..."
                  rows={6}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
                />
              </div>
              
              <div className="flex gap-3">
                <VoiceButton
                  onClick={() => startListening('corpo')}
                  disabled={isListening}
                  loading={isListening}
                  label="FALAR CONTEÚDO"
                  icon={<Mail className="w-5 h-5" />}
                />
                <button
                  onClick={handleConfirmCorpo}
                  disabled={!corpo}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Revisar
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmação */}
          {step === 'confirmacao' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${border} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Para:</p>
                    <p className={`text-sm font-semibold ${textPrimary}`}>{destinatario}</p>
                  </div>
                  <button
                    onClick={() => handleEdit('destinatario')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className={`border-t ${border} pt-3 flex items-center justify-between`}>
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Assunto:</p>
                    <p className={`text-sm font-semibold ${textPrimary}`}>{assunto}</p>
                  </div>
                  <button
                    onClick={() => handleEdit('assunto')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className={`border-t ${border} pt-3`}>
                  <div className="flex items-start justify-between mb-2">
                    <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Conteúdo:</p>
                    <button
                      onClick={() => handleEdit('corpo')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} max-h-40 overflow-y-auto`}>
                    <p className={`text-sm whitespace-pre-wrap ${textPrimary}`}>{corpo}</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                <p className={`text-sm ${isDark ? 'text-green-200' : 'text-green-800'}`}>
                  ✅ Tudo pronto! Confirme o envio ou cancele dizendo <strong>PARAR</strong> ou <strong>CANCELAR ENVIO</strong>
                </p>
              </div>

              <div className="flex gap-3">
                <VoiceButton
                  onClick={handleSendEmail}
                  disabled={isSending}
                  loading={isSending}
                  label="CONFIRMAR ENVIO"
                  icon={<Check className="w-6 h-6" />}
                  color="green"
                />
                <VoiceButton
                  onClick={onClose}
                  disabled={isSending}
                  loading={false}
                  label="CANCELAR ENVIO"
                  icon={<X className="w-6 h-6" />}
                  color="red"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Sub-component ──────────────────────────────────── */

function VoiceButton({
  onClick,
  disabled,
  loading,
  label,
  icon,
  color = 'blue',
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  label: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red';
}) {
  const base =
    color === 'green'
      ? 'bg-green-600 hover:bg-green-500 active:bg-green-700'
      : color === 'red'
      ? 'bg-red-600 hover:bg-red-500 active:bg-red-700'
      : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 flex items-center justify-center gap-3
        px-4 py-3 rounded-lg text-white
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
      <div className="flex flex-col items-center leading-tight">
        <span className="text-white/80 text-xs">Diga:</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </button>
  );
}
