'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Mail, Loader2, AlertCircle, Mic } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface SendEmailModalProps {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function SendEmailModal({
  data,
  onClose,
  theme = 'dark',
}: SendEmailModalProps) {
  const { companyId } = data;
  
  const [step, setStep] = useState<'recording' | 'confirming'>('recording');
  const [countdown, setCountdown] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  const [companyEmail, setCompanyEmail] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const supabase = createClient();
  const isDark = theme === 'dark';

  // Buscar email da conta Google conectada
  useEffect(() => {
    async function fetchGoogleEmail() {
      const { data: account, error } = await supabase
        .from('google_accounts')
        .select('google_email')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (account?.google_email) {
        setCompanyEmail(account.google_email);
      } else {
        // Fallback para business_email se não houver conta Google
        const { data: company } = await supabase
          .from('companies')
          .select('business_email')
          .eq('id', companyId)
          .single();
          
        if (company?.business_email) {
          setCompanyEmail(company.business_email);
        } else {
          showToast('Email da empresa não configurado', 'error');
        }
      }
    }
    fetchGoogleEmail();
  }, [companyId]);

  // Countdown inicial
  useEffect(() => {
    if (step === 'recording' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && step === 'recording' && !isRecording) {
      startRecording();
    }
  }, [countdown, step, isRecording]);

  // Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Listener de confirmação por voz
  useEffect(() => {
    let isActive = true;
    
    const handleVoiceConfirm = (event: any) => {
      console.log('🎤 [SendEmail] Evento de confirmação por voz recebido:', event.detail);
      
      if (!isActive) {
        console.log('⚠️ Componente não está ativo');
        return;
      }
      
      if (step !== 'confirming') {
        console.log('⚠️ Não está na etapa de confirmação');
        return;
      }
      
      if (isSending) {
        console.log('⚠️ Já está enviando');
        return;
      }
      
      if (!emailBody.trim()) {
        console.log('⚠️ Email vazio');
        showToast('O conteúdo do email está vazio', 'warning');
        return;
      }
      
      console.log('✅ Confirmando envio do email...');
      handleSendEmail();
    };
    
    window.addEventListener('confirmSendEmail', handleVoiceConfirm);
    
    return () => {
      isActive = false;
      window.removeEventListener('confirmSendEmail', handleVoiceConfirm);
    };
  }, [step, isSending, emailBody]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Recognition já parado');
        }
      }
    };
  }, []);

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'warning') => {
    setToast({ message, type });
  };

  // Iniciar gravação por voz
  const startRecording = () => {
    console.log('🎤 Iniciando gravação de voz...');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Seu navegador não suporta reconhecimento de voz', 'error');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    finalTranscriptRef.current = '';

    recognition.onstart = () => {
      console.log('✅ Reconhecimento iniciado');
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          console.log('📝 Final:', transcript);
          finalTranscriptRef.current += transcript + ' ';
          
          // ✅ CORREÇÃO: Detecção robusta da palavra "FIM"
          const lowerTranscript = transcript.toLowerCase().trim();
const FIM_TRIGGERS = [
  'terminou', 'fim', 'pronto', 'encerrar', 'concluir', 'acabou',
];

// Divide em palavras para evitar falso positivo em "enfim", "afim", etc.
const words = lowerTranscript
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
  .replace(/[.,!?;:]+/g, '')                        // ✅ NOVO: remove pontuação
  .split(/\s+/);

const lastWord = words[words.length - 1];
const hasFim =
  lastWord === 'fim' ||
  FIM_TRIGGERS.slice(1).some(t =>
    lowerTranscript
      .replace(/[.,!?;:]+/g, '')   // ✅ remove pontuação antes do endsWith
      .endsWith(t)
  );
          
          if (hasFim) {
            console.log('🛑 Palavra "FIM" detectada - parando gravação');
            recognition.stop();
            return;
          }
        } else {
          interimTranscript += transcript;
        }
      }

      // Atualizar display em tempo real
      const fullText = finalTranscriptRef.current + interimTranscript;
      setEmailBody(fullText);
    };

    recognition.onend = () => {
      console.log('🛑 Reconhecimento finalizado');
      setIsRecording(false);
      
      // ✅ CORREÇÃO: Limpar "fim" de todas as variações possíveis
      const FIM_TRIGGERS_CLEAN = [
  'fim', 'pronto', 'terminar', 'encerrar', 'concluir',
  'acabou', 'pode enviar', 'é isso', 'é isso aí',
];

let cleanedBody = finalTranscriptRef.current;

// Remove apenas se o trigger estiver NO FINAL da frase
for (const trigger of FIM_TRIGGERS_CLEAN) {
  // Escapa caracteres especiais para usar no regex
  const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  cleanedBody = cleanedBody.replace(
    new RegExp(`\\s*${escaped}\\s*$`, 'gi'),
    ''
  );
}

cleanedBody = cleanedBody.trim();
      
      setEmailBody(cleanedBody);
      finalTranscriptRef.current = cleanedBody;
      
      if (cleanedBody.length > 0) {
        console.log('✅ Conteúdo capturado:', cleanedBody.substring(0, 50) + '...');
        setStep('confirming');
      } else {
        console.log('⚠️ Nenhum conteúdo detectado');
        showToast('Nenhum conteúdo foi detectado. Tente novamente.', 'warning');
        setTimeout(() => onClose(), 2000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Erro no reconhecimento:', event.error);
      setIsRecording(false);
      
      let errorMessage = 'Erro ao capturar áudio';
      
      if (event.error === 'no-speech') {
        errorMessage = 'Nenhuma fala detectada. Tente novamente.';
      } else if (event.error === 'network') {
        errorMessage = 'Erro de rede. Verifique sua conexão.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Permissão do microfone negada.';
      }
      
      showToast(errorMessage, 'error');
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('❌ Erro ao iniciar recognition:', error);
      showToast('Erro ao iniciar gravação', 'error');
    }
  };

  // Parar gravação manualmente
  const stopRecording = () => {
    console.log('🛑 Parando gravação manualmente');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition já parado');
      }
    }
  };

  // Enviar email
  const handleSendEmail = async () => {
    console.log('📧 Iniciando envio de email...');
    
    if (!companyEmail) {
      showToast('Email da empresa não configurado', 'error');
      return;
    }

    if (!emailBody.trim()) {
      showToast('O conteúdo do email está vazio', 'warning');
      return;
    }

    setIsSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id: companyId,
          to: companyEmail,
          subject: 'Envio de Email pelo Assistente eAi',
          body: emailBody.trim(),
        },
      });

      if (error) {
        console.error('❌ Erro na função:', error);
        throw error;
      }

      if (!data.success) {
        console.error('❌ Função retornou erro:', data);
        showToast(data.speech_text || 'Erro ao enviar email', 'error');
        return;
      }

      console.log('✅ Email enviado com sucesso');
      showToast('✅ Email enviado com sucesso!', 'success');
      setTimeout(() => onClose(), 2000);
    } catch (error: any) {
      console.error('❌ Erro ao enviar email:', error);
      showToast('Erro ao enviar email. Tente novamente.', 'error');
    } finally {
      setIsSending(false);
    }
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
        data-modal-type="send-email"
        data-modal="send-email"
        role="dialog"
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border}
          animate-in zoom-in-95 duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'} flex-shrink-0`}>
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
                  {step === 'recording' ? 'Gravando conteúdo...' : 'Confirme o envio'}
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

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* STEP 1: Countdown + Recording */}
          {step === 'recording' && (
            <>
              {countdown > 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                      <div className="w-24 h-24 rounded-full bg-blue-500/40 flex items-center justify-center">
                        <span className={`text-6xl font-bold ${textPrimary}`}>{countdown}</span>
                      </div>
                    </div>
                  </div>
                  <p className={`text-lg font-medium ${textPrimary} mt-6`}>
                    Prepare-se para falar...
                  </p>
                </div>
              ) : (
                <>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
                    <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-800'} text-center font-medium`}>
                      🎤 <strong>Ditando o email...</strong> Diga <strong>"CONCLUIR"</strong> quando terminar
                    </p>
                  </div>

                  {/* Indicador de gravação */}
                  {isRecording && (
                    <div className="flex justify-center">
                      <div className="flex items-center gap-3 px-6 py-3 bg-red-500 rounded-full shadow-lg">
                        <div className="relative">
                          <div className="w-3 h-3 bg-white rounded-full animate-ping absolute" />
                          <div className="w-3 h-3 bg-white rounded-full" />
                        </div>
                        <Mic className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold">GRAVANDO</span>
                      </div>
                    </div>
                  )}

                  {/* Preview do texto */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                      Conteúdo do email:
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="O conteúdo aparecerá aqui conforme você fala..."
                      rows={10}
                      className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
                    />
                  </div>

                  <button
                    onClick={stopRecording}
                    disabled={!isRecording}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Parar Gravação
                  </button>
                </>
              )}
            </>
          )}

          {/* STEP 2: Confirmation */}
          {step === 'confirming' && (
            <div className="space-y-4">
              {/* Info do destinatário */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                <p className={`text-xs ${textMuted}`}>Para:</p>
                <p className={`text-sm font-medium ${textPrimary}`}>{companyEmail}</p>
                <p className={`text-xs ${textMuted} mt-2`}>Assunto:</p>
                <p className={`text-sm font-medium ${textPrimary}`}>Envio de Email pelo Assistente eAi</p>
              </div>

              {/* Conteúdo */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Conteúdo capturado:
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className={`w-full px-4 py-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} ${textPrimary} border ${border} focus:ring-2 focus:ring-blue-500 resize-none`}
                />
              </div>

              <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                <p className={`text-sm ${isDark ? 'text-green-200' : 'text-green-800'}`}>
                  ✅ Confirme o envio ou edite o texto acima. Você pode dizer <strong>"CONFIRMAR ENVIO"</strong> ou <strong>"ENVIAR AGORA"</strong>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('recording');
                    setCountdown(3);
                    setEmailBody('');
                    finalTranscriptRef.current = '';
                  }}
                  disabled={isSending}
                  className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  Regravar
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isSending || !emailBody.trim()}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirmar Envio
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
