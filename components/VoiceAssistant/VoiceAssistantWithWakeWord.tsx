'use client';

// ============================================================
// VoiceAssistantWithWakeWord.tsx  ← ORQUESTRADOR PRINCIPAL
// Caminho: components/assistant/VoiceAssistant/VoiceAssistantWithWakeWord.tsx
//
// CORREÇÕES desta versão:
// - activeModal (state unificado) substitui meuSistemaModalOpen,
//   nossaMarcaData e enderecoModalData
// - ActionModals.tsx usado no lugar dos condicionais individuais
// - handleFunctionClick usa setActiveModal
// - processQuestion e handleTextMessage passam setActiveModal
// - import dinâmico de checkIfFunctionIsEnabled removido
//   (agora importado no topo do arquivo)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { AvatarFace } from '@/components/AvatarFace';
import FunctionCarousel from '@/components/assistant/FunctionCarousel';
import TextInputChat from '@/components/VoiceAssistant/TextInputChat';
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';
import { VoiceCommandProcessor } from '@/lib/voice-command-processor';
import { getFunctionByKey } from '@/lib/functions-registry';
import { useIsMobile } from '@/hooks/useIsMobile';

// ── Tipos ──────────────────────────────────────────────────
import {
  VoiceAssistantProps,
  QRCodeData,
  PixConfirmationData,
  ActiveModal,
  ActiveFunctionContext,
  FunctionSettings,
} from './types';

// ── ActionModals (renderizador unificado de modais) ────────
import { ActionModals } from './ActionModals';

// ── Hooks ──────────────────────────────────────────────────
import { useCompanyConfig } from './hooks/useCompanyConfig';
import { useFunctionSettings } from './hooks/useFunctionSettings';
import { useNoiseWarning } from './hooks/useNoiseWarning';
import { useWakeWordDetector } from './hooks/useWakeWordDetector';
import { useAudioPlayer } from './hooks/useAudioPlayer';

// ── Utilitários ────────────────────────────────────────────
import { unlockAudio, requestMicrophonePermission, playProcessingFeedback } from './utils/audioUtils';
import { detectStopCommand, extractCommand } from './utils/textUtils';

// ── Handlers ──────────────────────────────────────────────
import {
  registerFunctionUsage,
  saveInteractionToHistory,
  checkIfFunctionIsEnabled,
} from './handlers/functionUsage';
import { handleQRCodeCommand } from './handlers/qrcodeHandlers';
import { handlePixCommand, handleConfirmPix, handleCancelPix } from './handlers/pixHandlers';
import { handleNossaMarcaCommand, handleEnderecoCommand } from './handlers/companyHandlers';
import { detectVoiceCommand } from './handlers/voiceCommandDetector';

export function VoiceAssistantWithWakeWord({
  companyId,
  companyName,
  wakeWord,
  greetingMessage,
  theme = 'dark',
  isMaximized = false,
  onAssistantStart,
  hideDisabledFunctions = false,
  autoScroll = true,
}: VoiceAssistantProps) {

  // ── States básicos ────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ── States de PIX (mantidos separados pois têm lógica própria) ──
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [pixConfirmationData, setPixConfirmationData] = useState<PixConfirmationData | null>(null);

  // ✅ State unificado de modal — substitui meuSistemaModalOpen,
  // nossaMarcaData e enderecoModalData. Alimenta o ActionModals.tsx.
  // Para abrir qualquer modal: setActiveModal({ type: 'NomeDisplay', data: {...} })
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  // ── Sistema híbrido ───────────────────────────────────────
  const [commandProcessor, setCommandProcessor] = useState<VoiceCommandProcessor | null>(null);

  // ── Refs de controle ──────────────────────────────────────
  const isActiveRef = useRef(true);
  const audioUnlocked = useRef<boolean>(false);
  const processingQuestion = useRef<boolean>(false);
  const googleSpeechRef = useRef<GoogleSpeechWebSocket | null>(null);
  const shouldProcessAudio = useRef<boolean>(true);
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeFunctionContextRef = useRef<ActiveFunctionContext | null>(null);

  // ── Ref de estado PIX (acesso em callbacks sem closure stale) ──
  const pixStateRef = useRef<{ qrCodeData: any; pixConfirmationData: any } | null>(null);
  useEffect(() => {
    pixStateRef.current = { qrCodeData, pixConfirmationData };
  }, [qrCodeData, pixConfirmationData]);

  // ── Hooks customizados ────────────────────────────────────
  const { wakeWord: companyWakeWord, greeting: companyGreeting } = useCompanyConfig(
    companyId, wakeWord, greetingMessage
  );
  const functionSettings = useFunctionSettings(companyId);
  const { noiseWarning, repromptWarning, handleVolumeChange, triggerRepromptWarning } = useNoiseWarning();
  const { wakeWordDetectorRef, endCommands } = useWakeWordDetector(companyWakeWord);
  const { currentAudioRef, feedbackAudioRef, playText, stopAudioImmediately } = useAudioPlayer(setIsPlayingAudio);
  const isMobile = useIsMobile();

  // ── Inicialização ─────────────────────────────────────────
  useEffect(() => {
    isActiveRef.current = true;

    requestMicrophonePermission().then(granted => {
      setPermissionGranted(granted);
      if (!granted) setError('Permissão do microfone negada.');
    });

    const handleExternalFunctionClick = (event: any) => {
      handleFunctionClick(event.detail.functionKey);
    };
    window.addEventListener('voiceAssistantFunctionClick', handleExternalFunctionClick);

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopEverything();
    };
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      isActiveRef.current = false;
      cleanup();
      window.removeEventListener('voiceAssistantFunctionClick', handleExternalFunctionClick);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // ── Inicializar VoiceCommandProcessor ────────────────────
  useEffect(() => {
    async function initCommandProcessor() {
      if (!companyId) return;
      const processor = new VoiceCommandProcessor(companyId);
      await processor.initialize();
      setCommandProcessor(processor);
      console.log('✅ VoiceCommandProcessor inicializado');
    }
    initCommandProcessor();
  }, [companyId]);

  // ── Google Speech ─────────────────────────────────────────
  async function startGoogleSpeech() {
    if (!isActiveRef.current || !shouldProcessAudio.current) return;

    const vadConfig = isMobile
      ? { volumeThreshold: 0.030, silenceThreshold: 60 }
      : { volumeThreshold: 0.015, silenceThreshold: 120 };

    console.log(`🎛️ Google Speech [${isMobile ? 'MOBILE' : 'DESKTOP'}]`, vadConfig);

    try {
      if (googleSpeechRef.current) {
        googleSpeechRef.current.stopRecording();
        googleSpeechRef.current.disconnect();
      }

      googleSpeechRef.current = new GoogleSpeechWebSocket({
        onTranscript: (text, isFinal) => {
          if (text && text.trim().length > 0) {
            if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
            if (!isFinal) {
              setIsListening(true);
            } else {
              listeningTimeoutRef.current = setTimeout(() => {
                if (!isProcessing && !isPlayingAudio) setIsListening(false);
              }, 1000);
            }
          }
          handleGoogleTranscript(text, isFinal);
        },
        onError: (err) => {
          console.error('❌ Erro Google Speech:', err);
          setIsListening(false);
        },
        onStatusChange: (status) => {
          setIsListening(status === 'recording');
        },
        onVolumeChange: handleVolumeChange,
        ...vadConfig,
      });

      await googleSpeechRef.current.connect();
      await googleSpeechRef.current.startRecording();
      console.log('🎤 Google Speech iniciado (VAD Local Ativo)');
    } catch (err) {
      console.error('❌ Erro ao iniciar Google Speech:', err);
      setIsListening(false);
    }
  }

  async function stopGoogleSpeech() {
    if (googleSpeechRef.current) {
      await googleSpeechRef.current.stopRecording();
      googleSpeechRef.current.disconnect();
      googleSpeechRef.current = null;
      setIsListening(false);
    }
  }

  function cleanup() {
    if (googleSpeechRef.current) {
      googleSpeechRef.current.stopRecording();
      googleSpeechRef.current.disconnect();
      googleSpeechRef.current = null;
    }
    stopAudioImmediately();
  }

  // ── Handler de fechamento unificado ───────────────────────
  // Usado pelo ActionModals.tsx ao fechar qualquer modal.
  const handleCloseModal = async () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsPlayingAudio(false);
    setActiveModal(null);
    setTimeout(async () => {
      if (isActiveRef.current) {
        shouldProcessAudio.current = true;
        await startGoogleSpeech();
      }
    }, 500);
  };

  // ── Contexto de função ativa ──────────────────────────────
  function getActiveFunctionContext(): string | null {
    if (!activeFunctionContextRef.current) return null;

    const now = Date.now();
    const elapsed = now - activeFunctionContextRef.current.activatedAt;

    if (elapsed > activeFunctionContextRef.current.expiresIn) {
      console.log('⏰ Contexto de função expirou');
      activeFunctionContextRef.current = null;
      return null;
    }

    const remaining = Math.floor((activeFunctionContextRef.current.expiresIn - elapsed) / 1000);
    console.log(`🎯 Contexto ativo: ${activeFunctionContextRef.current.functionKey} (${remaining}s)`);
    return activeFunctionContextRef.current.functionKey;
  }

  // ── Stop everything ───────────────────────────────────────
  function stopEverything() {
    console.log('🛑 Parando tudo');

    stopAudioImmediately();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsProcessing(false);
    setIsSpeaking(false);
    setQrCodeData(null);
    setPixConfirmationData(null);
    setActiveModal(null); // ✅ fecha qualquer modal aberto

    processingQuestion.current = false;
    shouldProcessAudio.current = true;
    activeFunctionContextRef.current = null;

    console.log('✅ Parado');

    setTimeout(async () => {
      if (isActiveRef.current) await startGoogleSpeech();
    }, 500);
  }

  // ── Transcript handler ────────────────────────────────────
  function handleGoogleTranscript(text: string, isFinal: boolean) {
    if (!text || !isActiveRef.current || !shouldProcessAudio.current) return;

    const lowerText = text.toLowerCase().trim();
    console.log(`${isFinal ? '✅ Final' : '📝 Interim'}: "${lowerText}"`);

    const wakeWordResult = wakeWordDetectorRef.current?.detect(lowerText);

    if (!wakeWordResult?.detected) {
      // ✅ Fecha modal aberto mesmo quando áudio já terminou
      if ((isPlayingAudio || isSpeaking || isProcessing || activeModal !== null) && detectStopCommand(lowerText)) {
        stopEverything();
      }
      return;
    }

    const WAKE_WORD_MIN_CONFIDENCE = 0.75;
    if (wakeWordResult.confidence < WAKE_WORD_MIN_CONFIDENCE) {
      console.log(`⚠️ Wake word rejeitada — confiança: ${(wakeWordResult.confidence * 100).toFixed(0)}%`);
      return;
    }

    console.log(`✅ Wake word aceita: "${wakeWordResult.keyword}" (${(wakeWordResult.confidence * 100).toFixed(0)}%)`);

    if (isPlayingAudio || isSpeaking) stopEverything();
    if (processingQuestion.current || isProcessing) return;
    if (!isFinal) return;

    const command = extractCommand(lowerText, wakeWordResult);
    const commandWords = command.split(' ').filter((w: string) => w.length > 2);
    const MIN_COMMAND_WORDS = 2;

    if (!audioUnlocked.current) unlockAudio(audioUnlocked);

    if (!processingQuestion.current) {
      processingQuestion.current = true;

      if (!command) {
        const greeting = companyGreeting || greetingMessage || 'Oi! Como posso ajudar?';
        playText(greeting).finally(() => { processingQuestion.current = false; });
      } else if (commandWords.length < MIN_COMMAND_WORDS) {
        console.log(`⚠️ Comando muito curto: "${command}"`);
        triggerRepromptWarning();
        playText('Pode completar sua pergunta?').finally(() => {
          processingQuestion.current = false;
          setTimeout(async () => {
            if (isActiveRef.current) {
              shouldProcessAudio.current = true;
              await startGoogleSpeech();
            }
          }, 300);
        });
      } else {
        processWakeWordQuestion(command);
      }
    }
  }

  // ── Start assistant ───────────────────────────────────────
  async function handleStart() {
    setSessionId(null);
    console.log('🚀 Iniciando assistente...');

    unlockAudio(audioUnlocked);

    try {
      const testAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUB4QU6vo66lXGAo+meL0wmskBSyBzvLYiTcIGWi77OefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQU=');
      testAudio.volume = 0.01;
      await testAudio.play();
      testAudio.pause();
    } catch (e) {
      console.log('⚠️ Falha no contexto de áudio');
    }

    setShowStartButton(false);
    onAssistantStart?.();

    setTimeout(async () => {
      if (isActiveRef.current) await startGoogleSpeech();
    }, 300);
  }

  // ── Function click (carrossel) ────────────────────────────
  // ✅ PARA ADICIONAR NOVA FUNÇÃO: adicione um case no switch abaixo.
  async function handleFunctionClick(functionKey: string) {
    console.log('🎯 Função clicada:', functionKey);

    const isEnabled = await checkIfFunctionIsEnabled(companyId, functionKey);

    if (!isEnabled) {
      await playText('Esta função está desativada no momento. Entre em contato com o suporte para ativá-la.');
      setTimeout(async () => {
        if (isActiveRef.current) {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
        }
      }, 500);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    setIsProcessing(true);

    try {
      switch (functionKey) {

        // ── Funções de texto (só falam) ──────────────────────
        case 'faq':
          await playText('Me faça qualquer pergunta sobre nossos produtos, serviços, horários ou políticas.');
          break;

        case 'chatgpt':
          await playText('Pode me fazer qualquer pergunta! Estou aqui para conversar e te ajudar.');
          break;

        case 'pix_generate':
          await playText('Para gerar um pix, me diga o valor. Por exemplo: gerar pix de 50 reais.');
          break;

        case 'orcamento':
          await playText('Posso calcular orçamentos, prazos e valores totais. O que você precisa?');
          break;

        // ── QR Codes ─────────────────────────────────────────
        case 'qrcode_whatsapp':
        case 'qrcode_instagram':
        case 'qrcode_website':
        case 'qrcode_facebook':
        case 'qrcode_email':
        case 'qrcode_linkedin':
        case 'qrcode_tiktok':
        case 'qrcode_twitter':
        case 'qrcode_telefone':
          await handleQRCodeCommand(functionKey.replace('qrcode_', ''), {
            companyId, setIsProcessing, setQrCodeData, playText,
          });
          break;

        // ── Funções com modal (usam setActiveModal) ──────────
        case 'meu_sistema':
          // ✅ Abre via ActionModals usando type 'MeuSistemaDisplay'
          setActiveModal({ type: 'MeuSistemaDisplay', data: { companyId } });
          playText('E A I, sou um funcionário de Voz com Inteligência Artificial. Escaneie o QR Code para saber mais. eai.app.br').catch(() => {});
          break;

        case 'nossa_marca':
          await handleNossaMarcaCommand({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'endereco':
          await handleEnderecoCommand({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        // ────────────────────────────────────────────────────
        // ✅ MODELO PARA NOVA FUNÇÃO COM MODAL:
        // case 'minha_nova_funcao':
        //   await handleMinhaNovaFuncao({ companyId, setIsProcessing, setActiveModal, playText });
        //   break;
        //
        // ✅ MODELO PARA NOVA FUNÇÃO SEM MODAL:
        // case 'minha_funcao_simples':
        //   await playText('Texto que o assistente vai falar.');
        //   break;
        // ────────────────────────────────────────────────────

        default:
          console.log('⚠️ Função não mapeada:', functionKey);
          await playText(`A função ${functionKey} ainda não está configurada.`);
      }

      await registerFunctionUsage(companyId, functionKey, functionSettings[functionKey]?.creditsPerUse ?? 0);
    } catch (error) {
      console.error('Erro ao executar função:', error);
      await playText('Desculpe, ocorreu um erro ao executar esta função.');
    } finally {
      setIsProcessing(false);
      setTimeout(async () => {
        if (isActiveRef.current) {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
        }
      }, 500);
    }
  }

  // ── Processamento de pergunta ─────────────────────────────
  function processWakeWordQuestion(transcript: string) {
    let clean = transcript.replace(/[,\.!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();

    const hasEndCommand = endCommands.some(cmd => clean.toLowerCase().includes(cmd));
    if (hasEndCommand) {
      processingQuestion.current = false;
      playGoodbye();
      return;
    }

    const words = clean.split(' ').filter((w: string) => w.length > 2);
    if (words.length === 0) {
      processingQuestion.current = false;
      setTimeout(async () => {
        if (isActiveRef.current) {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
        }
      }, 300);
      return;
    }

    processQuestion(clean);
  }

  async function processQuestion(questionText: string) {
    console.log('⚡ Processando:', questionText);

    shouldProcessAudio.current = false;
    await stopGoogleSpeech();

    // Verificar contexto de função ativa
    const activeFunction = getActiveFunctionContext();
    if (activeFunction) {
      const func = getFunctionByKey(activeFunction);
      if (func?.handler) {
        setIsProcessing(true);
        try {
          const handlerSuccess = await func.handler({
            transcript: questionText,
            companyId,
            functionSettings,
            playText,
            setIsProcessing,
            sessionId,
            // ✅ setActiveModal unificado
            setActiveModal,
          });

          if (handlerSuccess) {
            activeFunctionContextRef.current = {
              functionKey: func.functionKey,
              activatedAt: Date.now(),
              expiresIn: 5 * 60 * 1000,
            };
            await registerFunctionUsage(companyId, activeFunction, functionSettings[activeFunction]?.creditsPerUse ?? 2);
          }
        } catch (error) {
          console.error('❌ Erro no handler do contexto:', error);
          setIsProcessing(false);
        }

        processingQuestion.current = false;
        setTimeout(async () => {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
        }, 500);
        return;
      }
    }

    // Detectar comando de voz/texto
    const isCommand = await detectVoiceCommand(questionText, {
      companyId,
      functionSettings,
      setIsProcessing,
      setQrCodeData,
      setPixConfirmationData,
      playText,
      sessionId,
      commandProcessor,
      pixStateRef,
      setActiveModal, // ✅ state unificado
      activeFunctionContextRef,
    });

    if (isCommand) {
      processingQuestion.current = false;
      setTimeout(async () => {
        shouldProcessAudio.current = true;
        await startGoogleSpeech();
      }, 500);
      return;
    }

    // Fallback: API /api/voice/process (ChatGPT/FAQ)
    setIsProcessing(true);

    try {
      const startTime = Date.now();
      const formData = new FormData();
      const textBlob = new Blob([questionText], { type: 'text/plain' });
      formData.append('audio', textBlob, 'question.txt');
      formData.append('companyId', companyId);
      formData.append('directQuestion', questionText);
      if (sessionId) formData.append('sessionId', sessionId);

      let feedbackStarted = false;
      const feedbackTimeout = setTimeout(() => {
        if (!feedbackStarted) {
          feedbackStarted = true;
          playProcessingFeedback().then(audio => {
            feedbackAudioRef.current = audio;
          }).catch(() => {});
        }
      }, 1000);

      const response = await fetch('/api/voice/process', { method: 'POST', body: formData });

      const newSessionId = response.headers.get('X-Session-Id');
      if (newSessionId && !sessionId) setSessionId(newSessionId);

      if (!response.ok) throw new Error(`Erro: ${response.status}`);

      clearTimeout(feedbackTimeout);

      if (feedbackStarted && feedbackAudioRef.current) {
        const elapsed = Date.now() - startTime;
        const minFeedbackTime = 1200;
        if (elapsed < minFeedbackTime) {
          await new Promise(resolve => setTimeout(resolve, minFeedbackTime - elapsed));
        }
        try {
          feedbackAudioRef.current.pause();
          feedbackAudioRef.current.currentTime = 0;
          feedbackAudioRef.current = null;
        } catch (e) {}
      }

      setIsProcessing(false);

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.05;
      currentAudioRef.current = audio;
      setIsPlayingAudio(true);

      audio.onplay = () => setIsPlayingAudio(true);
      audio.onended = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        setTimeout(async () => {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
        }, 2000);
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        setTimeout(async () => {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
        }, 1000);
      };

      const safetyTimeout = setTimeout(() => {
        if (!isPlayingAudio && currentAudioRef.current === audio) {
          setIsPlayingAudio(false);
          currentAudioRef.current = null;
          processingQuestion.current = false;
          setTimeout(async () => {
            if (isActiveRef.current) {
              shouldProcessAudio.current = true;
              await startGoogleSpeech();
            }
          }, 1000);
        }
      }, 1500);

      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => clearTimeout(safetyTimeout))
            .catch(() => {
              setTimeout(() => {
                audio.play()
                  .then(() => clearTimeout(safetyTimeout))
                  .catch(() => {
                    clearTimeout(safetyTimeout);
                    setIsPlayingAudio(false);
                    currentAudioRef.current = null;
                    processingQuestion.current = false;
                  });
              }, 100);
            });
        }
      } catch (err) {
        clearTimeout(safetyTimeout);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
      }

    } catch (err: any) {
      console.error('❌ Erro processar:', err);
      setError('Erro processar');
      setIsProcessing(false);
      processingQuestion.current = false;

      if (feedbackAudioRef.current) {
        try { feedbackAudioRef.current.pause(); feedbackAudioRef.current = null; } catch (e) {}
      }

      setTimeout(async () => {
        shouldProcessAudio.current = true;
        await startGoogleSpeech();
      }, 1000);
    }
  }

  // ── Text input handler ────────────────────────────────────
  const handleTextMessage = async (message: string) => {
    if (detectStopCommand(message)) { stopEverything(); return; }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    setIsProcessing(true);

    try {
      const isCommand = await detectVoiceCommand(message, {
        companyId,
        functionSettings,
        setIsProcessing,
        setQrCodeData,
        setPixConfirmationData,
        playText,
        sessionId,
        commandProcessor,
        pixStateRef,
        setActiveModal, // ✅ state unificado
        activeFunctionContextRef,
      });

      if (isCommand) return;

      const formData = new FormData();
      formData.append('audio', new Blob([message], { type: 'text/plain' }));
      formData.append('companyId', companyId);
      formData.append('directQuestion', message);
      if (sessionId) formData.append('sessionId', sessionId);

      const response = await fetch('/api/voice/process', { method: 'POST', body: formData });

      const newSessionId = response.headers.get('X-Session-Id');
      if (newSessionId && !sessionId) setSessionId(newSessionId);

      if (!response.ok) throw new Error(`Erro: ${response.status}`);

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.05;
      currentAudioRef.current = audio;
      setIsPlayingAudio(true);
      audio.onended = () => { setIsPlayingAudio(false); currentAudioRef.current = null; };
      audio.onerror = () => { setIsPlayingAudio(false); currentAudioRef.current = null; };
      await audio.play();
    } catch (error: any) {
      console.error('❌ Erro ao processar mensagem:', error);
      await playText('Desculpe, ocorreu um erro ao processar sua mensagem.');
    } finally {
      setIsProcessing(false);
      setTimeout(async () => {
        if (isActiveRef.current) { shouldProcessAudio.current = true; await startGoogleSpeech(); }
      }, 500);
    }
  };

  // ── Misc helpers ──────────────────────────────────────────
  async function playGoodbye() {
    try { await playText('Até logo!'); } catch (e) {}
    setTimeout(async () => {
      if (isActiveRef.current) { shouldProcessAudio.current = true; await startGoogleSpeech(); }
    }, 1000);
  }

  // PIX handlers (mantidos localmente pois acessam pixStateRef)
  const handleConfirmPixLocal = () =>
    handleConfirmPix(pixStateRef.current?.pixConfirmationData ?? null, {
      companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings,
    });

  const handleCancelPixLocal = () =>
    handleCancelPix(pixStateRef.current?.pixConfirmationData ?? null, {
      companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings,
    });

  // ── Status helpers ────────────────────────────────────────
  const getStatusMessage = () => {
    if (!permissionGranted) return 'Aguardando permissão...';
    if (showStartButton) return 'Clique em "Iniciar"';
    if (isPlayingAudio) return 'Falando...';
    if (isProcessing) return 'Processando...';
    const primaryWakeWord = companyWakeWord?.split(',')[0].trim();
    return primaryWakeWord ? `Diga: "${primaryWakeWord}" + sua solicitação` : 'Aguarde...';
  };

  const getStatusColor = () => {
    if (!permissionGranted) return 'bg-gray-400';
    if (isPlayingAudio) return 'bg-blue-500 animate-pulse';
    if (isProcessing) return 'bg-yellow-400 animate-pulse';
    if (isListening) return 'bg-blue-400 animate-pulse';
    return 'bg-green-400 animate-pulse';
  };

  // ── RENDER: MAXIMIZED ─────────────────────────────────────
  if (isMaximized) {
    return (
      <div className="flex flex-col items-center gap-4 md:gap-8 w-full">
        {isSpeaking && (
          <button onClick={stopEverything} className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all">
            🛑 PARAR
          </button>
        )}

        <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
          <AvatarFace
            isListening={isListening}
            isSpeaking={isPlayingAudio}
            isProcessing={isProcessing}
            theme={theme}
            qrCodeData={qrCodeData}
            pixConfirmationData={pixConfirmationData}
            onCloseQRCode={() => setQrCodeData(null)}
            onCopyQRCode={() => console.log('📋 QR Code copiado!')}
            onConfirmPix={handleConfirmPixLocal}
            onCancelPix={handleCancelPixLocal}
          />
        </div>

        <div className="min-h-[2.5rem] flex items-center justify-center w-full max-w-sm px-4">
  {(repromptWarning || noiseWarning) && (
    <div className={`w-full px-4 py-2 rounded-xl text-sm font-medium text-center ${
      theme === 'dark'
        ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
        : 'bg-blue-50 border border-blue-200 text-blue-700'
    }`}>
      {repromptWarning ? 'Não consegui entender — pode repetir a pergunta?' : 'Ambiente ruidoso — fale mais perto do microfone'}
    </div>

        <div className="min-h-[2.5rem] flex items-center justify-center w-full max-w-sm px-4">
          {(repromptWarning || noiseWarning) && (
            <div className={`w-full px-4 py-2 rounded-xl text-sm font-medium text-center ${
              theme === 'dark'
                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {repromptWarning ? 'Não consegui entender — pode repetir a pergunta?' : 'Ambiente ruidoso — fale mais perto do microfone'}
            </div>
          )}
        </div>

        {showStartButton && permissionGranted && (
          <button onClick={handleStart} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-xl hover:from-blue-700 hover:to-green-600 transition font-bold shadow-xl text-lg">
            Iniciar Assistente
          </button>
        )}

        {/* ✅ ActionModals — renderiza qualquer modal via state unificado */}
        <ActionModals
          activeModal={activeModal}
          onClose={handleCloseModal}
          theme={theme}
          onConfirmPix={handleConfirmPixLocal}
          onCancelPix={handleCancelPixLocal}
        />
      </div>
    );
  }

  // ── RENDER: NORMAL ────────────────────────────────────────
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">

        {/* Card esquerdo: Avatar */}
        <div className={`rounded-3xl shadow-2xl p-8 border relative overflow-hidden transition-colors ${
          theme === 'dark' ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'
        }`}>
          {isSpeaking && (
            <button onClick={stopEverything} className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all z-10">
              🛑 PARAR
            </button>
          )}
          <div className="relative h-96">
            <AvatarFace
              isListening={isListening}
              isSpeaking={isPlayingAudio}
              isProcessing={isProcessing}
              theme={theme}
              qrCodeData={qrCodeData}
              pixConfirmationData={pixConfirmationData}
              onCloseQRCode={() => setQrCodeData(null)}
              onCopyQRCode={() => console.log('📋 QR Code copiado!')}
              onConfirmPix={handleConfirmPixLocal}
              onCancelPix={handleCancelPixLocal}
            />
          </div>
        </div>

        {/* Card direito: Status / Microfone */}
        <div className={`rounded-3xl shadow-2xl p-8 border transition-colors ${
          theme === 'dark' ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col items-center space-y-6">
            <div className="relative flex items-center justify-center">
              <div className={`w-32 h-32 rounded-full ${getStatusColor()} flex items-center justify-center transition-all shadow-lg`}>
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>

            <div className="text-center w-full">
              <p className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getStatusMessage()}
              </p>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}`}>
                No modo voz, utilize a palavra de ativação
              </p>
            </div>

            {error && (
              <div className={`w-full p-4 rounded-xl border-2 ${
                theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {showStartButton && permissionGranted && (
              <button onClick={handleStart} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-xl hover:from-blue-700 hover:to-green-600 transition font-bold shadow-xl text-lg">
                Iniciar Assistente
              </button>
            )}

            {!showStartButton && (
              <div className="w-full mt-auto flex flex-col gap-2">
                <TextInputChat
                  onSendMessage={handleTextMessage}
                  isProcessing={isProcessing || isPlayingAudio}
                  theme={theme}
                  disabled={false}
                />
                <div className="min-h-[2rem]">
                  {(repromptWarning || noiseWarning) && (
                    <div className={`w-full px-4 py-2 rounded-xl text-sm font-medium text-center ${
                      theme === 'dark'
                        ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                        : 'bg-blue-50 border border-blue-200 text-blue-700'
                    }`}>
                      {repromptWarning ? 'Não consegui entender — pode repetir a pergunta?' : 'Ambiente com ruídos — fale mais perto do microfone'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Carrossel de funções */}
      {!showStartButton && (
        <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mt-8">
          <FunctionCarousel
            companyId={companyId}
            onFunctionClick={handleFunctionClick}
            theme={theme}
            hideDisabledFunctions={hideDisabledFunctions}
            autoScroll={autoScroll}
          />
        </div>
      )}

      {/* ✅ ActionModals — UMA linha substitui todos os condicionais de modal */}
      <ActionModals
        activeModal={activeModal}
        onClose={handleCloseModal}
        theme={theme}
        onConfirmPix={handleConfirmPixLocal}
        onCancelPix={handleCancelPixLocal}
      />
    </div>
  );
}
