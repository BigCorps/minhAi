'use client';

import { useState, useEffect, useRef } from 'react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';
import { useIsMobile } from '@/hooks/useIsMobile';
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
  const [countdown, setCountdown] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  const [companyEmail, setCompanyEmail] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);           // desktop (mantém)
  const googleSpeechRef = useRef<GoogleSpeechWebSocket | null>(null); // mobile
  const finalTranscriptRef = useRef<string>('');
  const supabase = createClient();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();

  const handleSendEmailRef = useRef<() => void>(() => {});
  const onCloseRef = useRef<() => void>(() => {});

  useEffect(() => {
    handleSendEmailRef.current = handleSendEmail;
  }, [emailBody, recipientEmail, isSending]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Buscar email da conta Google conectada
  useEffect(() => {
    async function fetchGoogleEmail() {
      const { data: account } = await supabase
        .from('google_accounts')
        .select('google_email')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (account?.google_email) {
        setCompanyEmail(account.google_email);
        setRecipientEmail(account.google_email);
      } else {
        const { data: company } = await supabase
          .from('companies')
          .select('business_email')
          .eq('id', companyId)
          .single();
          
        if (company?.business_email) {
          setCompanyEmail(company.business_email);
          setRecipientEmail(company.business_email);
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

  // Listener de confirmação por voz (evento externo)
  useEffect(() => {
    let isActive = true;
    
    const handleVoiceConfirm = (event: any) => {
      if (!isActive || step !== 'confirming' || isSending) return;
      if (!emailBody.trim()) {
        showToast('O conteúdo do email está vazio', 'warning');
        return;
      }
      handleSendEmail();
    };
    
    window.addEventListener('confirmSendEmail', handleVoiceConfirm);
    return () => {
      isActive = false;
      window.removeEventListener('confirmSendEmail', handleVoiceConfirm);
    };
  }, [step, isSending, emailBody]);

  // Recognition de voz na etapa de confirmação
  useModalVoiceCommand({
    active: step === 'confirming',
    onTranscript: (transcript) => {
      console.log('🎤 [Confirmação Email] Ouviu:', transcript);

      const normalizeSpokenEmail = (text: string): string | null => {
        let t = text.toLowerCase().trim();
        t = t
          .replace(/\s+arroba\s+/g, '@').replace(/\barroba\b/g, '@')
          .replace(/\s+at\s+/g, '@')
          .replace(/\s+ponto\s+/g, '.').replace(/\bponto\b/g, '.')
          .replace(/\s+traco\s+/g, '-').replace(/\s+hifen\s+/g, '-')
          .replace(/\s+underline\s+/g, '_').replace(/\s+sublinhado\s+/g, '_')
          .replace(/\s*@\s*/g, '@').replace(/\s*\.\s*/g, '.').replace(/\s*-\s*/g, '-');
        if (t.includes('@')) t = t.replace(/\s+/g, '');
        const match = t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
        return match ? match[0] : null;
      };

      // Mudar destinatário
      const emailChangeMatch = transcript.match(
        /(?:mud[ae]r?|alter[ae]r?|troc[ae]r?|envi[ae]r?\s+para|destinatario|para\s+o\s+email|email\s+para)\s+(.+)/i
      );
      if (emailChangeMatch) {
        const normalized = normalizeSpokenEmail(emailChangeMatch[1]);
        if (normalized) {
          setRecipientEmail(normalized);
          showToast(`Destinatário atualizado: ${normalized}`, 'success');
        } else {
          showToast('Não entendi o email. Edite manualmente.', 'warning');
        }
        return;
      }

      // Voltar email padrão
      if (transcript.includes('meu email') || transcript.includes('email padrao') || transcript.includes('voltar email')) {
        setRecipientEmail(companyEmail);
        showToast(`Destinatário restaurado: ${companyEmail}`, 'success');
        return;
      }

      const CONFIRM_TRIGGERS = [
        'confirmar envio', 'confirmar email', 'confirma', 'enviar agora',
        'pode enviar', 'pode mandar', 'envia', 'manda', 'sim', 'correto', 'enviar', 'confirmar',
      ];
      const CANCEL_TRIGGERS = ['cancelar', 'cancela', 'regravar', 'nao', 'fechar'];

      if (CONFIRM_TRIGGERS.some(t => transcript.includes(t))) {
        handleSendEmailRef.current();
      } else if (CANCEL_TRIGGERS.some(t => transcript.includes(t))) {
        if (transcript.includes('regravar') || transcript.includes('gravar de novo') || transcript.includes('gravar novamente')) {
          setStep('recording');
          setCountdown(5);
          setEmailBody('');
          finalTranscriptRef.current = '';
        } else {
          onCloseRef.current();
        }
      }
    }
  });

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'warning') => {
    setToast({ message, type });
  };

  // ✅ Extrai email de um texto falado
  const extractEmailFromSpeech = (text: string): string | null => {
    const directMatch = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    if (directMatch) return directMatch[0];

    const spokenMatch = text.match(
      /([a-z0-9._%+-]+)\s+arroba\s+([a-z0-9.-]+)\s+ponto\s+([a-z]{2,})/i
    );
    if (spokenMatch) return `${spokenMatch[1]}@${spokenMatch[2]}.${spokenMatch[3]}`;

    return null;
  };

  // Iniciar gravação por voz
  const startRecording = async () => {
    console.log('🎤 Iniciando gravação...');
    if (isMobile) {
      await startRecordingMobile();
    } else {
      startRecordingDesktop();
    }
  };

  const startRecordingMobile = async () => {
    finalTranscriptRef.current = '';
    setIsRecording(true);

    const FIM_TRIGGERS = ['concluir', 'acabou', 'terminou', 'pronto', 'fim'];

    try {
      const gs = new GoogleSpeechWebSocket({
        onTranscript: (text, isFinal) => {
          if (!isFinal || !text.trim()) return;

          console.log('📝 [Mobile] Final:', text);

          const lowerT = text.toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[.,!?;:]+/g, '');

          const hasEmailContext =
            lowerT.includes('enviar para') ||
            lowerT.includes('envia para') ||
            lowerT.includes('manda para') ||
            lowerT.includes('destinatario') ||
            lowerT.includes('arroba');

          if (hasEmailContext) {
            const foundEmail = extractEmailFromSpeech(lowerT);
            if (foundEmail) {
              setRecipientEmail(foundEmail);
              showToast(`Destinatário: ${foundEmail}`, 'success');
              return;
            }
          }

          const hasFim = FIM_TRIGGERS.some(t => lowerT.endsWith(t) || lowerT === t);
          if (hasFim) {
            console.log('🛑 [Mobile] Encerramento detectado');
            let cleaned = finalTranscriptRef.current;
            for (const t of FIM_TRIGGERS) {
              cleaned = cleaned.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
            }
            cleaned = cleaned.trim();
            finalTranscriptRef.current = cleaned;
            setEmailBody(cleaned);
            stopRecording();

            if (cleaned.length > 0) {
              setStep('confirming');
            } else {
              showToast('Nenhum conteúdo detectado. Tente novamente.', 'warning');
              setTimeout(() => onClose(), 2000);
            }
            return;
          }

          finalTranscriptRef.current += text + ' ';
          setEmailBody(finalTranscriptRef.current.trim());
        },
        onError: (err) => {
          console.error('❌ [Mobile] Erro gravação:', err);
          setIsRecording(false);
          showToast('Erro ao capturar áudio. Tente novamente.', 'error');
        },
        volumeThreshold: 0.030,
        silenceThreshold: 60,
      });

      googleSpeechRef.current = gs;
      await gs.connect();
      await gs.startRecording();
    } catch (err) {
      setIsRecording(false);
      showToast('Erro ao iniciar gravação', 'error');
    }
  };

  const startRecordingDesktop = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Seu navegador não suporta reconhecimento de voz', 'error');
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    finalTranscriptRef.current = '';

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          console.log('📝 Final:', transcript);
          const lowerT = transcript.toLowerCase();
          const hasEmailContext =
            lowerT.includes('enviar para') || lowerT.includes('envia para') ||
            lowerT.includes('manda para') || lowerT.includes('destinatario') ||
            lowerT.includes('arroba');
          if (hasEmailContext) {
            const foundEmail = extractEmailFromSpeech(lowerT);
            if (foundEmail) { setRecipientEmail(foundEmail); showToast(`Destinatário: ${foundEmail}`, 'success'); continue; }
          }
          finalTranscriptRef.current += transcript + ' ';
          const FIM_TRIGGERS = ['concluir', 'acabou', 'terminou', 'pronto'];
          const clean = transcript.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,!?;:]+/g, '');
          if (FIM_TRIGGERS.some(t => clean.endsWith(t))) { recognition.stop(); return; }
        } else {
          interimTranscript += transcript;
        }
      }
      setEmailBody(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onend = () => {
      setIsRecording(false);
      const FIM_TRIGGERS_CLEAN = ['fim', 'pronto', 'terminar', 'encerrar', 'concluir', 'acabou'];
      let cleaned = finalTranscriptRef.current;
      for (const t of FIM_TRIGGERS_CLEAN) {
        cleaned = cleaned.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
      }
      cleaned = cleaned.trim();
      setEmailBody(cleaned);
      finalTranscriptRef.current = cleaned;
      if (cleaned.length > 0) setStep('confirming');
      else { showToast('Nenhum conteúdo detectado.', 'warning'); setTimeout(() => onClose(), 2000); }
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error === 'no-speech') showToast('Nenhuma fala detectada.', 'warning');
      else if (event.error === 'not-allowed') showToast('Permissão do microfone negada.', 'error');
      else showToast('Erro ao capturar áudio.', 'error');
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecording = () => {
    // Desktop
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    // Mobile
    if (googleSpeechRef.current) {
      googleSpeechRef.current.stopRecording().catch(() => {});
      googleSpeechRef.current.disconnect();
      googleSpeechRef.current = null;
    }
    setIsRecording(false);
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      showToast('Email do destinatário não configurado', 'error');
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
          to: recipientEmail,
          subject: 'Envio de Email pelo Assistente eAi',
          body: emailBody.trim(),
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
      showToast('Erro ao enviar email. Tente novamente.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3
            ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-400'}
            animate-in slide-in-from-top duration-300`}>
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
                <h2 className={`text-xl font-bold ${textPrimary}`}>Enviar Email</h2>
                <p className={`text-sm ${textMuted}`}>
                  {step === 'recording' ? 'Gravando conteúdo...' : 'Confirme o envio'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition">
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
                  <div className="w-32 h-32 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-blue-500/40 flex items-center justify-center">
                      <span className={`text-6xl font-bold ${textPrimary}`}>{countdown}</span>
                    </div>
                  </div>
                  <p className={`text-lg font-medium ${textPrimary} mt-6`}>Prepare-se para falar...</p>
                </div>
              ) : (
                <>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
                    <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-800'} text-center font-medium`}>
                      🎤 <strong>Ditando o email...</strong> Diga <strong>"CONCLUIR"</strong> quando terminar
                    </p>
                    <p className={`text-xs ${isDark ? 'text-blue-300/60' : 'text-blue-600/60'} text-center mt-1`}>
                      Diga "enviar para fulano@email.com" para definir o destinatário
                    </p>
                  </div>

                  {/* Destinatário atual durante gravação */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                    <Mail className={`w-4 h-4 flex-shrink-0 ${textMuted}`} />
                    <span className={`text-xs ${textMuted}`}>Para:</span>
                    <span className={`text-xs font-medium ${recipientEmail !== companyEmail ? 'text-blue-400' : textPrimary}`}>
                      {recipientEmail || 'Carregando...'}
                    </span>
                    {recipientEmail !== companyEmail && (
                      <button
                        onClick={() => setRecipientEmail(companyEmail)}
                        className="ml-auto text-xs text-blue-400 hover:text-blue-300"
                      >
                        restaurar
                      </button>
                    )}
                  </div>

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

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Conteúdo do email:</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="O conteúdo aparecerá aqui conforme você fala..."
                      rows={8}
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
              <div className="flex justify-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  isDark ? 'bg-green-900/30 text-green-300 border border-green-700' : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Ouvindo... confirme ou diga "muda o email para..."
                </div>
              </div>

              {/* Destinatário editável */}
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-xs ${textMuted}`}>Para:</p>
                  {recipientEmail !== companyEmail && (
                    <button
                      onClick={() => setRecipientEmail(companyEmail)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      restaurar email padrão
                    </button>
                  )}
                </div>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${border} ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="destinatario@email.com"
                />
                <p className={`text-xs ${textMuted} mt-2`}>Assunto:</p>
                <p className={`text-sm font-medium ${textPrimary}`}>Envio de Email pelo Assistente eAi</p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Conteúdo capturado:</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className={`w-full px-4 py-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} ${textPrimary} border ${border} focus:ring-2 focus:ring-blue-500 resize-none`}
                />
              </div>

              <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                <p className={`text-sm ${isDark ? 'text-green-200' : 'text-green-800'}`}>
                  ✅ Confirme ou edite. Diga <strong>"CONFIRMAR ENVIO"</strong>, <strong>"REGRAVAR"</strong> ou <strong>"muda o email para fulano@email.com"</strong>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('recording'); setCountdown(5); setEmailBody(''); finalTranscriptRef.current = ''; }}
                  disabled={isSending}
                  className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  Regravar
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isSending || !emailBody.trim() || !recipientEmail}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Enviando...</>
                  ) : (
                    <><Check className="w-5 h-5" />Confirmar Envio</>
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
