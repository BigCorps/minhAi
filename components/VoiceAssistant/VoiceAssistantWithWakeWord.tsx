// components/VoiceAssistant/VoiceAssistantWithWakeWord.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { AvatarFace } from '@/components/AvatarFace';
import QRCodeDisplay from '@/components/assistant/QRCodeDisplay';
import PIXConfirmationModal from '@/components/assistant/PIXConfirmationModal';
import TextInputChat from './TextInputChat';
import { createClient } from '@/lib/supabase-browser';

// 🆕 IMPORTS DOS MÓDULOS
import { VoiceAssistantProps, QRCodeData, PIXConfirmationData } from './types';
import { DEFAULT_WAKE_WORDS, END_COMMANDS } from './utils/constants';
import { unlockAudio, establishMobileAudioContext } from './utils/audioUnlock';
import { detectAndExecuteFunction } from './functions';
import { useAudioManager } from './hooks/useAudioManager';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useConversation } from './hooks/useConversation';

export function VoiceAssistantWithWakeWord({
  companyId,
  companyName,
  wakeWord,
  greetingMessage,
  theme = 'dark',
  isMaximized = false,
}: VoiceAssistantProps) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // 🆕 USAR HOOKS MODULARES
  const {
    isPlayingAudio,
    currentAudioRef,
    feedbackAudioRef,
    stopAudioImmediately,
    playText,
    playProcessingFeedback,
  } = useAudioManager();
  
  const {
    conversationIdRef,
    createOrGetConversation,
    saveMessage,
  } = useConversation(companyId);
  
  // Estados locais
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [pixConfirmationData, setPixConfirmationData] = useState<PIXConfirmationData | null>(null);
  const [enabledFunctions, setEnabledFunctions] = useState<string[]>([]);
  
  const pixStateRef = useRef({ qrCodeData, pixConfirmationData });
  const audioUnlockedRef = useRef(false);
  const isActiveRef = useRef(true);
  const processingQuestion = useRef(false);
  
  // Atualizar ref quando estados mudarem
  useEffect(() => {
    pixStateRef.current = { qrCodeData, pixConfirmationData };
  }, [qrCodeData, pixConfirmationData]);
  
  // Carregar funções ativas do banco
  useEffect(() => {
    loadEnabledFunctions();
  }, [companyId]);
  
  async function loadEnabledFunctions() {
    const supabase = createClient();
    const { data: settings } = await supabase
      .from('company_function_settings')
      .select('function_key')
      .eq('company_id', companyId)
      .eq('is_enabled', true);
    
    const keys = settings?.map(s => s.function_key) || [];
    
    // Se não houver configuração, usar todas as funções por padrão
    setEnabledFunctions(keys.length > 0 ? keys : [
      'qrcode_whatsapp',
      'qrcode_instagram',
      'pix_generate',
      'pix_confirm',
      'pix_cancel'
    ]);
  }
  
  // Speech Recognition com wake words
  const wakeWords = [
    ...wakeWord.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0),
    ...DEFAULT_WAKE_WORDS,
  ];
  
  const {
    isListening,
    startWakeWordDetection,
    stopRecognition,
  } = useSpeechRecognition({
    wakeWords,
    endCommands: END_COMMANDS,
    onQuestionDetected: processQuestion,
    isProcessing,
    isPlayingAudio,
  });
  
  // Processar pergunta (comando ou FAQ/GPT)
  async function processQuestion(questionText: string) {
    console.log('⚡ Processando:', questionText);
    
    processingQuestion.current = true;
    const supabase = createClient();
    
    // Criar contexto para as funções
    const context = {
      companyId,
      conversationId: conversationIdRef.current,
      supabase,
      setIsProcessing,
      setQrCodeData,
      setPixConfirmationData,
      pixStateRef,
      playText,
    };
    
    // 1️⃣ DETECTAR E EXECUTAR FUNÇÃO (WhatsApp, Instagram, PIX, etc)
    const isCommand = await detectAndExecuteFunction(
      questionText,
      context,
      enabledFunctions
    );
    
    if (isCommand) {
      console.log('✅ Comando processado via função modular');
      processingQuestion.current = false;
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 500);
      return;
    }
    
    // 2️⃣ PROCESSAR COMO PERGUNTA NORMAL (FAQ/GPT)
    setIsProcessing(true);
    
    try {
      const startTime = Date.now();
      
      const formData = new FormData();
      const textBlob = new Blob([questionText], { type: 'text/plain' });
      formData.append('audio', textBlob, 'question.txt');
      formData.append('companyId', companyId);
      formData.append('directQuestion', questionText);

      console.log('📤 Enviando para API...');
      
      let feedbackStarted = false;
      const feedbackTimeout = setTimeout(() => {
        if (!feedbackStarted) {
          feedbackStarted = true;
          console.log('⏱️ API demorando, tocando feedback...');
          playProcessingFeedback().then(audio => {
            feedbackAudioRef.current = audio;
          }).catch(e => {
            console.log('⚠️ Feedback áudio falhou:', e.message);
          });
        }
      }, 1000);
      
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.status}`);
      }

      const usedFAQ = response.headers.get('X-Used-FAQ') === 'true';
      const processingTime = Date.now() - startTime;

      console.log(usedFAQ ? '⚡ FAQ' : '🤖 GPT');
      console.log(`⏱️ Tempo total: ${processingTime}ms`);

      clearTimeout(feedbackTimeout);

      // Parar feedback se necessário
      if (feedbackStarted && feedbackAudioRef.current) {
        const minFeedbackTime = 1200;
        const elapsedTime = Date.now() - startTime;
        
        if (elapsedTime < minFeedbackTime) {
          const waitTime = minFeedbackTime - elapsedTime;
          console.log(`⏳ Aguardando ${waitTime}ms para feedback completo...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        console.log('🛑 Parando feedback...');
        try {
          feedbackAudioRef.current.pause();
          feedbackAudioRef.current.currentTime = 0;
          feedbackAudioRef.current = null;
        } catch (e) {}
      }

      setIsProcessing(false);

      // Reiniciar wake word ANTES do áudio
      console.log('🔄 Reiniciando wake word detection ANTES do áudio...');
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 100);

      // Tocar resposta
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.playbackRate = 1.05;
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        console.log('✅ Resposta concluída');
        processingQuestion.current = false;
        
        console.log('🔄 Garantindo wake word detection ativa...');
        setTimeout(() => {
          if (isActiveRef.current && !isListening) {
            startWakeWordDetection();
          }
        }, 200);
      };

      audio.onerror = (e) => {
        console.error('❌ Erro ao tocar áudio:', e);
        processingQuestion.current = false;
        
        setTimeout(() => {
          if (isActiveRef.current) {
            startWakeWordDetection();
          }
        }, 200);
      };

      await audio.play();
      
    } catch (err: any) {
      console.error('❌ Erro processar:', err);
      setError('Erro processar');
      setIsProcessing(false);
      processingQuestion.current = false;
      
      if (feedbackAudioRef.current) {
        try {
          feedbackAudioRef.current.pause();
          feedbackAudioRef.current = null;
        } catch (e) {}
      }
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }
  
  // Handler: Iniciar assistente
  async function handleStart() {
    console.log('🚀 Iniciando assistente...');
    
    unlockAudio(audioUnlockedRef);
    
    if (isMobile) {
      await establishMobileAudioContext();
    }
    
    setShowStartButton(false);
    
    setTimeout(() => {
      if (isActiveRef.current) {
        startWakeWordDetection();
      }
    }, 300);
  }
  
  // Handler: Mensagem de texto
  async function handleTextMessage(message: string) {
    console.log('📝 Mensagem de texto recebida:', message);
    
    // Parar reconhecimento de voz
    if (stopRecognition) {
      stopRecognition();
    }

    // Parar áudio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    setIsProcessing(true);

    try {
      const supabase = createClient();
      
      // Criar contexto para funções
      const context = {
        companyId,
        conversationId: conversationIdRef.current,
        supabase,
        setIsProcessing,
        setQrCodeData,
        setPixConfirmationData,
        pixStateRef,
        playText,
      };
      
      // 1. Verificar se é comando especial
      const isCommand = await detectAndExecuteFunction(
        message,
        context,
        enabledFunctions
      );
      
      if (isCommand) {
        console.log('✅ Comando detectado via texto');
        return;
      }

      // 2. Processar como pergunta normal
      console.log('📤 Enviando mensagem para API...');
      
      // Criar/obter conversa
      let currentConversationId = await createOrGetConversation();

      // Salvar mensagem do usuário
      if (currentConversationId) {
        await saveMessage('user', message);
      }

      // Chamar Edge Function
      const response = await supabase.functions.invoke('chat', {
        body: {
          question: message,
          company_id: companyId,
          conversation_id: currentConversationId
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { answer } = response.data;

      // Salvar resposta do assistente
      if (currentConversationId) {
        await saveMessage('assistant', answer);
      }

      // Tocar resposta em áudio
      await playText(answer);

    } catch (error: any) {
      console.error('❌ Erro ao processar mensagem:', error);
      await playText('Desculpe, ocorreu um erro ao processar sua mensagem.');
    } finally {
      setIsProcessing(false);
      
      // Reiniciar wake word detection
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 500);
    }
  }
  
  // Handlers de UI
  function handleCloseQRCode() {
    setQrCodeData(null);
    playText('QR Code fechado.').catch(() => {});
  }

  function handleCopyQRCode() {
    console.log('📋 QR Code copiado!');
  }

  async function handleConfirmPix() {
    console.log('🔘 handleConfirmPix chamada');
    
    const currentData = pixStateRef.current?.pixConfirmationData;
    
    if (!currentData) {
      console.log('⚠️ pixConfirmationData não existe no ref');
      await playText('Não há nenhum PIX aberto para confirmar');
      return;
    }
    
    console.log('✅ pixConfirmationData encontrado no ref:', currentData);
    
    try {
      setIsProcessing(true);
      
      await playText('Confirmando pagamento...');
      
      const supabase = createClient();
      const response = await supabase.functions.invoke('confirmar-pix-assistente', {
        body: {
          transaction_id: currentData.transactionId
        }
      });
      
      console.log('📥 Resposta Edge Function:', response);
      
      if (response.error) {
        console.log('❌ Erro detectado:', response.error);
        await playText('PIX ainda não foi pago. Aguarde alguns segundos após o pagamento e tente novamente.');
        return;
      }
      
      const data = response.data;
      
      if (!data || !data.success) {
        console.log('⏳ Resposta sem sucesso:', data);
        await playText('PIX ainda não foi pago. Aguarde e tente novamente.');
        return;
      }
      
      console.log('✅ PIX confirmado:', data);
      setPixConfirmationData(null);
      
      await playText('Pagamento confirmado com sucesso!');
      
    } catch (error: any) {
      console.error('❌ Erro geral:', error);
      await playText('Erro ao confirmar pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCancelPix() {
    console.log('🔘 handleCancelPix chamada');
    
    const currentData = pixStateRef.current?.pixConfirmationData;
    
    if (!currentData) {
      console.log('⚠️ pixConfirmationData não existe no ref');
      await playText('Não há nenhum PIX aberto para cancelar');
      return;
    }
    
    console.log('✅ pixConfirmationData encontrado no ref:', currentData);
    
    try {
      setIsProcessing(true);
      
      await playText('Cancelando PIX...');
      
      const supabase = createClient();
      const response = await supabase.functions.invoke('cancelar-pix-assistente', {
        body: {
          transaction_id: currentData.transactionId
        }
      });
      
      if (response.error) throw response.error;
      
      console.log('✅ PIX cancelado');
      setPixConfirmationData(null);
      
      await playText('PIX cancelado.');
      
    } catch (error: any) {
      console.error('❌ Erro cancelar PIX:', error);
      await playText('Erro ao cancelar PIX.');
    } finally {
      setIsProcessing(false);
    }
  }
  
  // Funções auxiliares de UI
  const getStatusMessage = () => {
    if (!permissionGranted) return 'Aguardando permissão...';
    if (showStartButton) return 'Clique em "Iniciar"';
    if (isPlayingAudio) return 'Falando...';
    if (isProcessing) return 'Processando...';
    if (isListening) return `Diga: "${wakeWords[0]}" + pergunta`;
    return 'Aguarde...';
  };

  const getStatusColor = () => {
    if (!permissionGranted) return 'bg-gray-400';
    if (isPlayingAudio) return 'bg-blue-500 animate-pulse';
    if (isProcessing) return 'bg-green-600 animate-pulse';
    if (isListening) return 'bg-green-400 animate-pulse';
    return 'bg-gray-400';
  };
  
  // Solicitar permissão do microfone
  async function requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError('');
    } catch (err) {
      setError('Permissão do microfone negada.');
      setPermissionGranted(false);
    }
  }
  
  // Cleanup ao desmontar
  useEffect(() => {
    isActiveRef.current = true;
    requestMicrophonePermission();
    
    return () => {
      isActiveRef.current = false;
      stopRecognition();
    };
  }, []);

  // ========================================
  // JSX - MODO MAXIMIZADO
  // ========================================
  if (isMaximized) {
    return (
      <div className="flex flex-col items-center gap-4 md:gap-8 w-full px-4">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
          <AvatarFace
            isListening={isListening}
            isSpeaking={isPlayingAudio}
            isProcessing={isProcessing}
            theme={theme}
            qrCodeData={qrCodeData}
            pixConfirmationData={pixConfirmationData}
            onCloseQRCode={handleCloseQRCode}
            onCopyQRCode={handleCopyQRCode}
            onConfirmPix={handleConfirmPix}
            onCancelPix={handleCancelPix}
          />
        </div>

        <div className="text-center px-4 max-w-md">
          <p className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 transition-colors ${
            theme === 'dark' ? 'text-white/50' : 'text-gray-900/50'
          }`}>
            {getStatusMessage()}
          </p>
          {error && (
            <p className={`text-xs sm:text-sm transition-colors ${
              theme === 'dark' ? 'text-red-400/50' : 'text-red-600/50'
            }`}>{error}</p>
          )}
        </div>

        {showStartButton && permissionGranted && (
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-xl hover:from-blue-700 hover:to-green-600 transition font-bold shadow-xl text-lg"
          >
            Iniciar Assistente
          </button>
        )}
      </div>
    );
  }

  // ========================================
  // JSX - MODO NORMAL (2 COLUNAS)
  // ========================================
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        {/* COLUNA 1: AVATAR */}
        <div className={`rounded-3xl shadow-2xl p-8 border relative overflow-hidden transition-colors ${
          theme === 'dark'
            ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl'
            : 'bg-white border-gray-200'
        }`}>
          <div className="relative h-96">
            <AvatarFace
              isListening={isListening}
              isSpeaking={isPlayingAudio}
              isProcessing={isProcessing}
              theme={theme}
              qrCodeData={qrCodeData}
              pixConfirmationData={pixConfirmationData}
              onCloseQRCode={handleCloseQRCode}
              onCopyQRCode={handleCopyQRCode}
              onConfirmPix={handleConfirmPix}
              onCancelPix={handleCancelPix}
            />
          </div>
        </div>

        {/* COLUNA 2: CONTROLES */}
        <div className={`rounded-3xl shadow-2xl p-8 border transition-colors ${
          theme === 'dark'
            ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col items-center space-y-6">
            {/* INDICADOR DE STATUS */}
            <div className="relative flex items-center justify-center">
              <div className={`w-32 h-32 rounded-full ${getStatusColor()} flex items-center justify-center transition-all shadow-lg`}>
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>

            {/* MENSAGEM DE STATUS */}
            <div className="text-center w-full">
              <p className={`text-xl font-bold mb-2 transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {getStatusMessage()}
              </p>
              <p className={`text-sm mt-2 transition-colors ${
                theme === 'dark' ? 'text-white/50' : 'text-gray-500'
              }`}>
                Modo Alexa: use palavra de ativação
              </p>
            </div>

            {/* ERRO */}
            {error && (
              <div className={`w-full p-4 rounded-xl border-2 transition-colors ${
                theme === 'dark'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* BOTÃO INICIAR */}
            {showStartButton && permissionGranted && (
              <button
                onClick={handleStart}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-xl hover:from-blue-700 hover:to-green-600 transition font-bold shadow-xl text-lg"
              >
                Iniciar Assistente
              </button>
            )}

            {/* INPUT DE TEXTO */}
            {!showStartButton && (
              <div className="w-full mt-auto">
                <TextInputChat
                  onSendMessage={handleTextMessage}
                  isProcessing={isProcessing || isPlayingAudio}
                  theme={theme}
                  disabled={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
