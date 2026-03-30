'use client';

import { useState, useEffect, useRef } from 'react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';
import { useIsMobile } from '@/hooks/useIsMobile';
import { createPortal } from 'react-dom';
import { Check, X, FileAudio, Loader2, AlertCircle, Mic, Copy, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface TranscribeAudioModalProps {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function TranscribeAudioModal({
  data,
  onClose,
  theme = 'dark',
}: TranscribeAudioModalProps) {
  const { companyId } = data;
  
  const [step, setStep] = useState<'recording' | 'result'>('recording');
  const [countdown, setCountdown] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [formattedTranscription, setFormattedTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const googleSpeechRef = useRef<GoogleSpeechWebSocket | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const supabase = createClient();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();

  // Countdown
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // Voice commands na tela de resultado
  useModalVoiceCommand({
    active: step === 'result',
    onTranscript: (transcript) => {
      console.log('🎤 [Resultado] Ouviu:', transcript);
      
      const COPY_TRIGGERS = ['copiar', 'copia', 'copie'];
      const EMAIL_TRIGGERS = ['enviar email', 'email', 'mandar email'];
      const BACK_TRIGGERS = ['voltar', 'nova transcrição', 'transcrever de novo', 'gravar novamente'];
      
      if (COPY_TRIGGERS.some(t => transcript.includes(t))) {
        handleCopy();
      } else if (EMAIL_TRIGGERS.some(t => transcript.includes(t))) {
        handleSendEmail();
      } else if (BACK_TRIGGERS.some(t => transcript.includes(t))) {
        setStep('recording');
        setCountdown(5);
        setTranscription('');
        setFormattedTranscription('');
        finalTranscriptRef.current = '';
      }
    }
  });

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'warning') => {
    setToast({ message, type });
  };

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

          const hasFim = FIM_TRIGGERS.some(t => lowerT.endsWith(t) || lowerT === t);
          if (hasFim) {
            console.log('🛑 [Mobile] Encerramento detectado');
            let cleaned = finalTranscriptRef.current;
            for (const t of FIM_TRIGGERS) {
              cleaned = cleaned.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
            }
            cleaned = cleaned.trim();
            finalTranscriptRef.current = cleaned;
            setTranscription(cleaned);
            stopRecording();
            processTranscription(cleaned);
            return;
          }

          const isSoloTrigger = FIM_TRIGGERS.some(t => lowerT === t);
          if (!isSoloTrigger) {
            let textToAdd = text.trim();
            for (const t of FIM_TRIGGERS) {
              textToAdd = textToAdd.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
            }
            textToAdd = textToAdd.trim();
            if (textToAdd) {
              finalTranscriptRef.current += textToAdd + ' ';
              setTranscription(finalTranscriptRef.current.trim());
            }
          }
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
          
          const FIM_TRIGGERS = ['concluir', 'acabou', 'terminou', 'pronto', 'fim'];
          const cleanedTranscript = transcript.trim();
          const lowerClean = cleanedTranscript.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[.,!?;:]+/g, '');

          const isSoloTrigger = FIM_TRIGGERS.some(t => lowerClean === t);
          if (isSoloTrigger) {
            recognition.stop(); return;
          }

          if (FIM_TRIGGERS.some(t => lowerClean.endsWith(t))) {
            let textToAdd = cleanedTranscript;
            for (const t of FIM_TRIGGERS) {
              textToAdd = textToAdd.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
            }
            textToAdd = textToAdd.trim();
            if (textToAdd) finalTranscriptRef.current += textToAdd + ' ';
            recognition.stop(); return;
          }

          let textToAdd = cleanedTranscript;
          for (const t of FIM_TRIGGERS) {
            textToAdd = textToAdd.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
          }
          textToAdd = textToAdd.trim();
          if (textToAdd) finalTranscriptRef.current += textToAdd + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      setTranscription(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onend = () => {
      setIsRecording(false);
      const FIM_TRIGGERS_CLEAN = ['fim', 'pronto', 'terminar', 'encerrar', 'concluir', 'acabou'];
      let cleaned = finalTranscriptRef.current;
      for (const t of FIM_TRIGGERS_CLEAN) {
        cleaned = cleaned.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
      }
      cleaned = cleaned.trim();
      setTranscription(cleaned);
      finalTranscriptRef.current = cleaned;
      
      if (cleaned) {
        processTranscription(cleaned);
      } else {
        showToast('Nenhum áudio detectado', 'warning');
      }
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
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (googleSpeechRef.current) {
      googleSpeechRef.current.stopRecording().catch(() => {});
      googleSpeechRef.current.disconnect();
      googleSpeechRef.current = null;
    }
    setIsRecording(false);
  };

  const processTranscription = async (text: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transcrever-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            audio_text: text,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        showToast(result.speech_text || 'Erro ao processar', 'error');
        setFormattedTranscription(text);
      } else {
        setFormattedTranscription(result.formatted_transcription);
        showToast('✅ Áudio transcrito com sucesso!', 'success');
      }

      setStep('result');

    } catch (error: any) {
      console.error('Erro ao processar:', error);
      showToast('Erro ao processar. Usando transcrição bruta.', 'warning');
      setFormattedTranscription(text);
      setStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedTranscription);
    showToast('✅ Transcrição copiada!', 'success');
  };

  const handleSendEmail = async () => {
    try {
      const { data: account } = await supabase
        .from('google_accounts')
        .select('google_email')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      const recipientEmail = account?.google_email;

      if (!recipientEmail) {
        showToast('Email não configurado', 'error');
        return;
      }

      const { data, error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id: companyId,
          to: recipientEmail,
          subject: 'Transcrição de Áudio por minhAi',
          body: `Transcrição:\n\n${formattedTranscription}`,
        },
      });

      if (error) throw error;
      if (!data.success) {
        showToast(data.speech_text || 'Erro ao enviar email', 'error');
        return;
      }

      showToast('✅ Email enviado com sucesso!', 'success');
    } catch (error: any) {
      showToast('Erro ao enviar email', 'error');
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
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-purple-950/40' : 'bg-purple-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <FileAudio className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Transcrever Áudio</h2>
                <p className={`text-sm ${textMuted}`}>
                  {step === 'recording' ? 'Gravando áudio...' : 'Transcrição concluída'}
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
          
          {/* STEP 1: RECORDING */}
          {step === 'recording' && (
            <>
              {countdown > 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-32 h-32 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-purple-500/40 flex items-center justify-center">
                      <span className={`text-6xl font-bold ${textPrimary}`}>{countdown}</span>
                    </div>
                  </div>
                  <p className={`text-lg font-medium ${textPrimary} mt-6`}>Prepare-se para falar...</p>
                </div>
              ) : isProcessing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-16 h-16 animate-spin text-purple-500 mb-4" />
                  <p className={`text-lg font-medium ${textPrimary}`}>Processando transcrição...</p>
                </div>
              ) : (
                <>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'} border`}>
                    <p className={`text-sm ${isDark ? 'text-purple-200' : 'text-purple-800'} text-center font-medium`}>
                      🎤 <strong>Gravando áudio...</strong> Diga <strong>"CONCLUIR"</strong> quando terminar
                    </p>
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
                    <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Transcrição em tempo real:</label>
                    <div className={`p-4 rounded-lg min-h-[200px] border ${border} ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                      <p className={`text-sm ${textPrimary} whitespace-pre-wrap`}>
                        {transcription || 'O texto aparecerá aqui conforme você fala...'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={stopRecording}
                    disabled={!isRecording}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Parar e Processar
                  </button>
                </>
              )}
            </>
          )}

          {/* STEP 2: RESULT */}
          {step === 'result' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                <p className={`text-sm ${isDark ? 'text-green-200' : 'text-green-800'} text-center font-medium`}>
                  ✅ Áudio transcrito com sucesso! Diga <strong>"COPIAR"</strong> ou <strong>"ENVIAR EMAIL"</strong>
                </p>
              </div>

              {/* Transcrição Formatada */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Transcrição:</label>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'} border max-h-96 overflow-y-auto`}>
                  <p className={`text-sm ${isDark ? 'text-purple-100' : 'text-purple-900'} whitespace-pre-wrap`}>
                    {formattedTranscription}
                  </p>
                </div>
              </div>

              {/* Botões */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Copiar
                </button>
                <button
                  onClick={handleSendEmail}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Enviar Email
                </button>
              </div>

              <button
                onClick={() => {
                  setStep('recording');
                  setCountdown(5);
                  setTranscription('');
                  setFormattedTranscription('');
                  finalTranscriptRef.current = '';
                }}
                className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} ${textPrimary} font-medium transition text-sm`}
              >
                Nova Transcrição
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
