'use client';

import { useState, useEffect, useRef } from 'react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';
import { useIsMobile } from '@/hooks/useIsMobile';
import { createPortal } from 'react-dom';
import { Check, X, Languages, Loader2, AlertCircle, Mic, Copy, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface TranslateTextModalProps {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function TranslateTextModal({
  data,
  onClose,
  theme = 'dark',
}: TranslateTextModalProps) {
  const { companyId } = data;
  
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [countdown, setCountdown] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [isManualMode, setIsManualMode] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);
  const googleSpeechRef = useRef<GoogleSpeechWebSocket | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const supabase = createClient();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();

  const languages = [
    { code: 'en', name: 'Inglês', flag: '🇺🇸' },
    { code: 'es', name: 'Espanhol', flag: '🇪🇸' },
    { code: 'fr', name: 'Francês', flag: '🇫🇷' },
    { code: 'de', name: 'Alemão', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'ja', name: 'Japonês', flag: '🇯🇵' },
    { code: 'ko', name: 'Coreano', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinês', flag: '🇨🇳' },
  ];

  // Countdown
  useEffect(() => {
    if (step === 'input' && countdown > 0 && !isManualMode) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && step === 'input' && !isRecording && !isManualMode) {
      startRecording();
    }
  }, [countdown, step, isRecording, isManualMode]);

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
      const BACK_TRIGGERS = ['voltar', 'nova tradução', 'traduzir de novo'];
      
      if (COPY_TRIGGERS.some(t => transcript.includes(t))) {
        handleCopy();
      } else if (EMAIL_TRIGGERS.some(t => transcript.includes(t))) {
        handleSendEmail();
      } else if (BACK_TRIGGERS.some(t => transcript.includes(t))) {
        setStep('input');
        setCountdown(5);
        setInputText('');
        setTranslatedText('');
        setIsManualMode(false);
        setDetectedLanguage('');
        setTargetLanguage('en');
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

          // CORREÇÃO 1 - Mobile: Remove trigger ANTES de salvar
          const hasFim = FIM_TRIGGERS.some(t => lowerT.endsWith(t) || lowerT === t);
          if (hasFim) {
            console.log('🛑 [Mobile] Encerramento detectado');

            // Remove trigger do texto ANTES de salvar
            let textBeforeTrigger = text.trim();
            for (const t of FIM_TRIGGERS) {
              // Remove o trigger do final (case insensitive)
              const regex = new RegExp(`\\s*${t}\\s*$`, 'gi');
              textBeforeTrigger = textBeforeTrigger.replace(regex, '');
            }
            textBeforeTrigger = textBeforeTrigger.trim();

            // Se tinha texto antes do trigger, adiciona ao acumulado
            if (textBeforeTrigger && !FIM_TRIGGERS.some(t => textBeforeTrigger.toLowerCase() === t)) {
              finalTranscriptRef.current += textBeforeTrigger + ' ';
            }

            // Limpa o texto final
            let cleaned = finalTranscriptRef.current.trim();
            for (const t of FIM_TRIGGERS) {
              cleaned = cleaned.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
            }
            cleaned = cleaned.trim();

            finalTranscriptRef.current = cleaned;
            setInputText(cleaned);
            stopRecording();

            // Auto-traduz após parar
            if (cleaned) {
              setTimeout(() => handleTranslate(), 500);
            }

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
              setInputText(finalTranscriptRef.current.trim());
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

    // CORREÇÃO 2 - Desktop: Lógica clara de acumulação com logs
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
            console.log('🛑 [Desktop] Trigger solo detectado, parando');
            recognition.stop();
            return;
          }

          if (FIM_TRIGGERS.some(t => lowerClean.endsWith(t))) {
            console.log('🛑 [Desktop] Trigger no final detectado');
            // Remove trigger do final e acumula o texto antes
            let textToAdd = cleanedTranscript;
            for (const t of FIM_TRIGGERS) {
              textToAdd = textToAdd.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
            }
            textToAdd = textToAdd.trim();
            if (textToAdd) {
              finalTranscriptRef.current += textToAdd + ' ';
            }
            recognition.stop();
            return;
          }

          // Acumula normalmente (sem trigger)
          let textToAdd = cleanedTranscript;
          for (const t of FIM_TRIGGERS) {
            textToAdd = textToAdd.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
          }
          textToAdd = textToAdd.trim();
          if (textToAdd) {
            finalTranscriptRef.current += textToAdd + ' ';
          }
        } else {
          interimTranscript += transcript;
        }
      }
      setInputText(finalTranscriptRef.current + interimTranscript);
    };

    // CORREÇÃO 4 - recognition.onend com logs de debug + auto-tradução
    recognition.onend = () => {
      setIsRecording(false);
      console.log('🛑 [Desktop] Recognition.onend acionado');

      const FIM_TRIGGERS_CLEAN = ['fim', 'pronto', 'terminar', 'encerrar', 'concluir', 'acabou'];
      let cleaned = finalTranscriptRef.current;

      console.log('📝 [Desktop] Texto antes de limpar:', cleaned);

      for (const t of FIM_TRIGGERS_CLEAN) {
        cleaned = cleaned.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
      }
      cleaned = cleaned.trim();

      console.log('✅ [Desktop] Texto final limpo:', cleaned);

      setInputText(cleaned);
      finalTranscriptRef.current = cleaned;

      // Auto-traduz após parar
      if (cleaned) {
        console.log('🚀 [Desktop] Iniciando tradução...');
        setTimeout(() => handleTranslate(), 500);
      } else {
        console.warn('⚠️ [Desktop] Texto vazio, não traduz');
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

const handleTranslate = async () => {
  const textToTranslate = finalTranscriptRef.current.trim() || inputText.trim();
  
  if (!textToTranslate) {
    showToast('Digite ou fale o texto que deseja traduzir', 'warning');
    return;
  }

  console.log('🚀 [Traduzir] Texto a traduzir:', textToTranslate);

  setIsTranslating(true);

  try {
    // Detectar idioma via Edge Function (que usa OpenAI internamente)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/traduzir-texto`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          company_id: companyId,
          text: textToTranslate,
          target_language: 'auto', // Edge Function detecta e escolhe
        }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      showToast(result.speech_text || 'Erro ao traduzir', 'error');
      return;
    }

    // Salvar dados
    setInputText(textToTranslate);
    setTranslatedText(result.translated_text);
    setDetectedLanguage(result.source_language || 'pt');
    setTargetLanguage(result.target_language || 'en');
    setStep('result');
    
    const targetLangName = languages.find(l => l.code === result.target_language)?.name || 'outro idioma';
    showToast(`✅ Traduzido para ${targetLangName}!`, 'success');

  } catch (error: any) {
    console.error('❌ Erro ao traduzir:', error);
    showToast('Erro ao traduzir. Tente novamente.', 'error');
  } finally {
    setIsTranslating(false);
  }
};

  const handleRetranslate = async (newTargetLanguage: string) => {
    setIsTranslating(true);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/traduzir-texto`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            text: inputText.trim(),
            target_language: newTargetLanguage,
            source_language: detectedLanguage,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        showToast(result.speech_text || 'Erro ao traduzir', 'error');
        return;
      }

      setTranslatedText(result.translated_text);
      const targetLangName = languages.find(l => l.code === newTargetLanguage)?.name || 'outro idioma';
      showToast(`✅ Traduzido para ${targetLangName}!`, 'success');

    } catch (error: any) {
      console.error('Erro ao retraduzir:', error);
      showToast('Erro ao traduzir. Tente novamente.', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    showToast('✅ Tradução copiada!', 'success');
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
          subject: 'Tradução por minhAi',
          body: `Texto Original:\n${inputText}\n\nTradução:\n${translatedText}`,
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
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Languages className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Traduzir Texto</h2>
                <p className={`text-sm ${textMuted}`}>
                  {step === 'input' ? 'Digite ou fale o texto' : 'Tradução concluída'}
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
          
          {/* STEP 1: INPUT */}
          {step === 'input' && (
            <>
              {countdown > 0 && !isManualMode ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-32 h-32 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-blue-500/40 flex items-center justify-center">
                      <span className={`text-6xl font-bold ${textPrimary}`}>{countdown}</span>
                    </div>
                  </div>
                  <p className={`text-lg font-medium ${textPrimary} mt-6`}>Prepare-se para falar...</p>

                  <button
                    onClick={() => {
                      setInputText('');
                      finalTranscriptRef.current = '';
                      setIsManualMode(true);
                      setCountdown(0);
                    }}
                    className={`mt-4 px-6 py-2 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} ${textPrimary} font-medium transition`}
                  >
                    Prefiro Digitar
                  </button>
                </div>
              ) : (
                <>
                  {!isManualMode && (
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
                      <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-800'} text-center font-medium`}>
                        <strong>Falando...</strong> Diga <strong>"CONCLUIR"</strong> quando terminar
                      </p>
                    </div>
                  )}

                  {isManualMode && (
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                      <p className={`text-sm ${isDark ? 'text-green-200' : 'text-green-800'} text-center font-medium`}>
                        <strong>Modo Digitação</strong> - Digite o texto abaixo
                      </p>
                    </div>
                  )}

                  {isRecording && !isManualMode && (
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
                    <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Texto para traduzir:</label>
                    <textarea
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        finalTranscriptRef.current = e.target.value;
                      }}
                      placeholder={isManualMode ? "Digite o texto..." : "O texto aparecerá aqui conforme você fala..."}
                      rows={8}
                      className={`w-full px-4 py-3 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-blue-500 resize-none`}
                    />
                  </div>

                  {/* CORREÇÃO 3 - Botão "Parar e Traduzir" */}
{isRecording && !isManualMode ? (
  <button
    onClick={() => {
      console.log('🛑 [Botão] Parando gravação manual');
      stopRecording();
    }}
    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
  >
    <X className="w-5 h-5" />
    Parar Gravação
  </button>
) : (
  <button
    onClick={handleTranslate}
    disabled={!inputText.trim() || isTranslating}
    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
  >
    {isTranslating ? (
      <>
        <Loader2 className="w-5 h-5 animate-spin" />
        Traduzindo...
      </>
    ) : (
      <>
        <Languages className="w-5 h-5" />
        Traduzir
      </>
    )}
  </button>
)}

                  {!isRecording && (
                    <button
                      onClick={() => {
                        if (isManualMode) {
                          setIsManualMode(false);
                          setCountdown(5);
                          setInputText('');
                          finalTranscriptRef.current = '';
                        } else {
                          setIsManualMode(true);
                        }
                      }}
                      className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} ${textPrimary} font-medium transition text-sm`}
                    >
                      {isManualMode ? 'Voltar para Gravação' : 'Preferir Digitar'}
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* STEP 2: RESULT */}
          {step === 'result' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                <p className={`text-sm ${isDark ? 'text-green-200' : 'text-green-800'} text-center font-medium`}>
                  Texto traduzido com sucesso! Diga <strong>"COPIAR"</strong> ou <strong>"ENVIAR EMAIL"</strong>
                </p>
              </div>

              {/* Seletor de Idioma para Retraduzir */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Traduzir para outro idioma:
                </label>
                <div className="flex gap-2">
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    disabled={isTranslating}
                    className={`flex-1 px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50`}
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRetranslate(targetLanguage)}
                    disabled={isTranslating}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    {isTranslating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Languages className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {detectedLanguage && (
                  <p className={`text-xs ${textMuted} mt-1`}>
                    Idioma detectado: {languages.find(l => l.code === detectedLanguage)?.flag} {languages.find(l => l.code === detectedLanguage)?.name || detectedLanguage.toUpperCase()}
                  </p>
                )}
              </div>

              {/* Original */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Texto original:</label>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} border ${border} max-h-48 overflow-y-auto`}>
                  <p className={`text-sm ${textPrimary} whitespace-pre-wrap`}>
                    {inputText}
                  </p>
                </div>
              </div>

              {/* Tradução */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Tradução ({languages.find(l => l.code === targetLanguage)?.flag} {languages.find(l => l.code === targetLanguage)?.name}):
                </label>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border max-h-48 overflow-y-auto`}>
                  <p className={`text-sm ${isDark ? 'text-blue-100' : 'text-blue-900'} whitespace-pre-wrap font-medium`}>
                    {translatedText}
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
                  setStep('input');
                  setCountdown(5);
                  setInputText('');
                  setTranslatedText('');
                  setIsManualMode(false);
                  setDetectedLanguage('');
                  setTargetLanguage('en');
                  finalTranscriptRef.current = '';
                }}
                className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} ${textPrimary} font-medium transition text-sm`}
              >
                Nova Tradução
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
