'use client';

// ============================================================
// VoiceAssistantWithWakeWord.tsx  ← ORQUESTRADOR PRINCIPAL
// Caminho: components/assistant/VoiceAssistant/VoiceAssistantWithWakeWord.tsx
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { AvatarFace } from '@/components/AvatarFace';
import TextInputChat from '@/components/VoiceAssistant/TextInputChat';
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';
import { VoiceCommandProcessor } from '@/lib/voice-command-processor';
import { getFunctionByKey, FUNCTIONS_REGISTRY } from '@/lib/functions-registry';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { handleCriarLembrete, handleCronometro, handleTemporizador, handleRelogioMundial, handleAlarme } from './handlers/utilitiesHandlers';
import { useLembreteWatcher } from './hooks/useLembreteWatcher';
import { handleWifiQRCode, handleCardapio, handleCadastro, handleNossoQRCode } from '@/components/VoiceAssistant/handlers/companyHandlers';
import { resolvePendingPaymentChoice } from '@/lib/paymentGatewayEntries';
import { useGroqContext } from '@/hooks/useGroqContext';
import { useProfile } from '@/hooks/useProfile';
import { getContextualRoute } from '@/lib/routing-utils';
import { createClient } from '@/lib/supabase-browser';

// ── Ponto 1: Novos imports ─────────────────────────────────
import { useFAQs } from './hooks/useFAQs';
import { findMatchingFAQLocal } from './utils/faqUtils';
import { useInactivityDetector } from '@/hooks/useInactivityDetector';
import { getRandomActiveFunctionHighlight } from '@/lib/function-highlights';
import { FeatureHighlightModal } from './FeatureHighlightModal';

// ── Tipos ──────────────────────────────────────────────────
import {
  VoiceAssistantProps,
  QRCodeData,
  PixConfirmationData,
  ActiveModal,
  ActiveFunctionContext,
  FunctionSettings,
} from './types';

// ── ActionModals ───────────────────────────────────────────
import { ActionModals } from './ActionModals';

import {
  handleLerQRCode,
  handleLerCodigoBarras,
  handleValidarCupom,
  handleImagemEmTexto,
  handleTabelaEmTexto,
  handleContratoEmTexto,
  handleCanalYoutube,
} from './handlers/companyHandlers';

// ── Hooks ──────────────────────────────────────────────────
import { useCompanyConfig } from './hooks/useCompanyConfig';
import { useFunctionSettings } from './hooks/useFunctionSettings';
import { useNoiseWarning } from './hooks/useNoiseWarning';
import { useWakeWordDetector } from './hooks/useWakeWordDetector';
import { useAudioPlayer } from './hooks/useAudioPlayer';

// ── Utilitários ────────────────────────────────────────────
import {
  unlockAudio,
  requestMicrophonePermission,
  playProcessingFeedback,
  requestCameraPermission,
  requestLocationPermission,
} from './utils/audioUtils';
import { detectStopCommand, extractCommand } from './utils/textUtils';

// ── Handlers ──────────────────────────────────────────────
import {
  registerFunctionUsage,
  saveInteractionToHistory,
  checkIfFunctionIsEnabled,
} from './handlers/functionUsage';
import { handleQRCodeCommand } from './handlers/qrcodeHandlers';
import { handlePixCommand, handleConfirmPix, handleCancelPix } from './handlers/pixHandlers';
import { handleNossaMarcaCommand, handleEnderecoCommand, handleVideoInstrucoesCommand, handleSequenciaVideosCommand } from './handlers/companyHandlers';
import { detectVoiceCommand } from './handlers/voiceCommandDetector';

export function VoiceAssistantWithWakeWord({
  companyId,
  companyName,
  slug,
  wakeWord,
  greetingMessage,
  theme = 'dark',
  isMaximized = false,
  onAssistantStart,
  hideDisabledFunctions = false,
  autoScroll = true,
  onTextMessage,
  textMode = false,
}: VoiceAssistantProps & {
  onTextMessage?: (handler: (text: string) => Promise<{ text: string; functionKey?: string } | null>) => void;
  textMode?: boolean;
}) {

  // ── States básicos ────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(true);
  const [showStartButton, setShowStartButton] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(
    () => crypto.randomUUID() // gera UUID local na montagem do componente
  );
  const [externalInput, setExternalInput] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // -- States de Destaque de Função (Inatividade) --
  const [showFeatureHighlight, setShowFeatureHighlight] = useState(false);
  const [highlightedFeature, setHighlightedFeature] = useState<{ function_name: string; short_description: string; function_category: string } | null>(null);

  // ── States de PIX ────────────────────────────────────────
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [pixConfirmationData, setPixConfirmationData] = useState<PixConfirmationData | null>(null);

  // ── State unificado de modal ──────────────────────────────
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  // ── Sistema híbrido ───────────────────────────────────────
  const [commandProcessor, setCommandProcessor] = useState<VoiceCommandProcessor | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showLastConversation, setShowLastConversation] = useState(false);
  const conversationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Refs de controle ──────────────────────────────────────
  const isActiveRef = useRef(true);
  const audioUnlocked = useRef<boolean>(false);
  const processingQuestion = useRef<boolean>(false);
  const googleSpeechRef = useRef<GoogleSpeechWebSocket | null>(null);
  const shouldProcessAudio = useRef<boolean>(true);
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeFunctionContextRef = useRef<ActiveFunctionContext | null>(null);

  // ── Ref de estado PIX ─────────────────────────────────────
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
  const { currentAudioRef, feedbackAudioRef, playText: _playText, stopAudioImmediately } = useAudioPlayer(setIsPlayingAudio);
  const isMobile = useIsMobile();
  const { profile, register: registerProfile, login: loginProfile, logout: logoutProfile } = useProfile(slug ?? '');
  const groqContextRef = useGroqContext(companyId, profile);

  // ── Ponto 2: Hook de FAQs ─────────────────────────────────
  const faqs = useFAQs(companyId);
  const faqsRef = useRef<typeof faqs>([]);
  useEffect(() => { faqsRef.current = faqs; }, [faqs]);

  // ── Lógica de Inatividade (5 minutos) ────────────────────
  // onInactivity fica num ref para não recriar a cada render e não
  // disparar o useEffect do hook (que reiniciaria o timer).
  const onInactivityRef = useRef(async () => {});
  useEffect(() => {
    onInactivityRef.current = async () => {
      if (activeModal || isSpeaking || isPlayingAudio || isProcessing || showFeatureHighlight) return;
      const feature = await getRandomActiveFunctionHighlight();
      if (feature) {
        setHighlightedFeature(feature);
        setShowFeatureHighlight(true);
        setTimeout(() => handleCloseFeatureHighlight(), 10000);
      }
    };
  }); // sem deps → sempre atualizado, mas sem recriar o resetTimer

  const { resetTimer: resetInactivityTimer } = useInactivityDetector({
    timeoutSeconds: 120,
    onInactivity: useCallback(() => onInactivityRef.current(), []),
    onActivity: useCallback(() => {}, []),
  });

  const handleCloseFeatureHighlight = useCallback(() => {
    setShowFeatureHighlight(false);
    setHighlightedFeature(null);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // ── Push-to-talk ───────────────────────────────────────────
  const voiceRecorder = useVoiceRecorder();

  // Wrap de playText para capturar lastResponse
  const playText = (text: string) => {
    if (text && text.trim()) setLastResponse(text.trim());
    return _playText(text);
  };

  useLembreteWatcher({ setActiveModal, playText, companyId });

  // playText silencioso para modo texto
  const effectivePlayText = textMode
    ? (text: string): Promise<void> => {
        if (text && text.trim()) setLastResponse(text.trim());
        return Promise.resolve();
      }
    : playText;

  // ── Timer 30s para card de conversa ───────────────────────
  useEffect(() => {
    if (!lastTranscript && !lastResponse) return;
    setShowLastConversation(true);
    if (conversationTimerRef.current) clearTimeout(conversationTimerRef.current);
    conversationTimerRef.current = setTimeout(() => {
      setShowLastConversation(false);
      conversationTimerRef.current = null;
    }, 30000);
    return () => { if (conversationTimerRef.current) clearTimeout(conversationTimerRef.current); };
  }, [lastTranscript, lastResponse]);

  useEffect(() => {
    if (isMaximized && externalInput) {
      setLastTranscript(externalInput);
      setExternalInput('');
      handleTextMessage(externalInput);
    }
  }, [externalInput, isMaximized]);

  // ── Inicialização ─────────────────────────────────────────
  useEffect(() => {
    isActiveRef.current = true;

    requestMicrophonePermission().then(result => {
      setPermissionGranted(result.granted);
      setHasMicrophone(result.hasMicrophone);
      if (!result.hasMicrophone) {
        setError('Nenhum microfone detectado. O modo de voz está desativado, mas você pode usar a digitação.');
      } else if (!result.granted) {
        setError('Permissão do microfone negada. O modo de voz está desativado.');
      }
    });

    requestCameraPermission().catch(() => {});
    requestLocationPermission().catch(() => {});

    const handleVerProdutoPix = (event: any) => {
      const { companyId: cId, valorCents } = event.detail;
      handlePixCommand(`gerar pix de ${(valorCents / 100).toFixed(2)}`, {
        companyId: cId,
        setIsProcessing,
        setQrCodeData,
        setPixConfirmationData,
        playText,
        functionSettings,
        sessionId,
        commandProcessor,
        pixStateRef,
        setActiveModal,
        activeFunctionContextRef,
      });
    };
    window.addEventListener('verProdutoPix', handleVerProdutoPix);

    const handleExternalFunctionClick = (event: any) => {
      handleFunctionClick(event.detail.functionKey, event);
    };
    window.addEventListener('voiceAssistantFunctionClick', handleExternalFunctionClick);

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopEverything();
    };
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      isActiveRef.current = false;
      cleanup();
      window.removeEventListener('verProdutoPix', handleVerProdutoPix);
      window.removeEventListener('voiceAssistantFunctionClick', handleExternalFunctionClick);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // ── VoiceCommandProcessor ─────────────────────────────────
  useEffect(() => {
    async function initCommandProcessor() {
      if (!companyId) return;
      const processor = new VoiceCommandProcessor(companyId);
      await processor.initialize();
      setCommandProcessor(processor);
    }
    initCommandProcessor();
  }, [companyId]);

  // ── Auto-start ────────────────────────────────────────────
  useEffect(() => {
    if (!companyWakeWord || !permissionGranted) return;
    const timer = setTimeout(() => { handleStart(); }, 800);
    return () => clearTimeout(timer);
  }, [companyWakeWord, permissionGranted]);

  // ── Google Speech ─────────────────────────────────────────
  async function startGoogleSpeech() {
    if (!isActiveRef.current || !shouldProcessAudio.current) return;

    const isInputModalOpen =
      activeModal?.type === 'SendEmailModal' ||
      activeModal?.type === 'CreateEventModal' ||
      activeModal?.type === 'NossaMarcaDisplay' ||
      activeModal?.type === 'EnderecoDisplay' ||
      activeModal?.type === 'MeuSistemaDisplay' ||
      activeModal?.type === 'VideoInstrucoesDisplay' ||
      activeModal?.type === 'MeuCupomDisplay' ||
      activeModal?.type === 'TocarMusicaDisplay' ||
      activeModal?.type === 'SequenciaVideosDisplay';
    if (isInputModalOpen) return;

    const vadConfig = isMobile
      ? { volumeThreshold: 0.030, silenceThreshold: 60 }
      : { volumeThreshold: 0.015, silenceThreshold: 120 };

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
              const lowerText = text.toLowerCase().trim();
              const partialWakeWord = wakeWordDetectorRef.current?.detect(lowerText);
              if (partialWakeWord?.detected && partialWakeWord.confidence >= 0.75) {
                setIsWakeWordDetected(true);
                setTimeout(() => setIsWakeWordDetected(false), 3000);
              }
            } else {
              listeningTimeoutRef.current = setTimeout(() => {
                if (!isProcessing && !isPlayingAudio) setIsListening(false);
              }, 1000);
            }
          }
          handleGoogleTranscript(text, isFinal);
        },
        onError: () => setIsListening(false),
        onStatusChange: (status) => setIsListening(status === 'recording'),
        onVolumeChange: handleVolumeChange,
        ...vadConfig,
      });

      await googleSpeechRef.current.connect();
      await googleSpeechRef.current.startRecording();
    } catch {
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

  // ── Push-to-talk ──────────────────────────────────────────
  const transcribeAndSetInput = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      });
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio }),
      });
      if (!response.ok) throw new Error('Erro na transcrição');
      const { text } = await response.json();
      if (text && text.trim()) setExternalInput(text.trim());
    } catch {
      // silencioso
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicButtonDown = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && isPlayingAudio) { e.preventDefault(); e.stopPropagation(); }
    if (isPlayingAudio) { stopEverything(); return; }
    if (!permissionGranted || isProcessing || isTranscribing) return;
    resetInactivityTimer(); // Microfone pressionado = atividade real
    shouldProcessAudio.current = false;
    await stopGoogleSpeech();
    setIsListening(true);
    await voiceRecorder.startRecording();
  };

  const handleMicButtonUp = async () => {
    if (!voiceRecorder.isRecording) return;
    setIsListening(false);
    try {
      const audioBlob = await voiceRecorder.stopRecording();
      await transcribeAndSetInput(audioBlob);
    } catch {
      // silencioso
    } finally {
      shouldProcessAudio.current = true;
      setTimeout(async () => { if (isActiveRef.current) await startGoogleSpeech(); }, 300);
    }
  };

  // ── Fechar modal ──────────────────────────────────────────
  const handleCloseModal = async () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsPlayingAudio(false);
    setActiveModal(null);
    if (googleSpeechRef.current) await googleSpeechRef.current.stopRecording();
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
    const elapsed = Date.now() - activeFunctionContextRef.current.activatedAt;
    if (elapsed > activeFunctionContextRef.current.expiresIn) {
      activeFunctionContextRef.current = null;
      return null;
    }
    return activeFunctionContextRef.current.functionKey;
  }

  // ── Stop everything ───────────────────────────────────────
  function stopEverything() {
    stopAudioImmediately();
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setIsProcessing(false);
    setIsSpeaking(false);
    setIsPlayingAudio(false);
    setIsTranscribing(false);
    setIsListening(false);
    setQrCodeData(null);
    setPixConfirmationData(null);
    setActiveModal(null);
    setShowConversationModal(false);
    processingQuestion.current = false;
    shouldProcessAudio.current = true;
    activeFunctionContextRef.current = null;
    if (voiceRecorder?.isRecording) voiceRecorder.stopRecording().catch(() => {});
    setTimeout(async () => { if (isActiveRef.current) await startGoogleSpeech(); }, 500);
  }

  // ── Transcript handler ────────────────────────────────────
  async function handleGoogleTranscript(text: string, isFinal: boolean) {
    if (!text || !isActiveRef.current || !shouldProcessAudio.current) return;
    const lowerText = text.toLowerCase().trim();

    if (isFinal && detectStopCommand(lowerText)) {
      if (isPlayingAudio || isSpeaking || isProcessing || activeModal !== null) {
        stopEverything();
        return;
      }
    }

    const CONTROL_COMMANDS = [{
      triggers: ['finalizar cronômetro', 'parar cronômetro', 'finalizar contagem', 'parar contagem'],
      action: () => window.dispatchEvent(new Event('eai:cronometro:stop')),
    }];
    for (const cmd of CONTROL_COMMANDS) {
      if (cmd.triggers.some(t => lowerText.includes(t))) {
        if (!isFinal) return;
        cmd.action();
        return;
      }
    }

    if (isFinal) {
      const resolved = await resolvePendingPaymentChoice(lowerText, setActiveModal, playText);
      if (resolved) {
        processingQuestion.current = false;
        setTimeout(async () => { shouldProcessAudio.current = true; await startGoogleSpeech(); }, 500);
        return;
      }
    }

    const wakeWordResult = wakeWordDetectorRef.current?.detect(lowerText);
    if (!wakeWordResult?.detected) {
      if ((isPlayingAudio || isSpeaking || isProcessing || activeModal !== null) && detectStopCommand(lowerText)) {
        stopEverything();
      }
      return;
    }

    if (wakeWordResult.confidence < 0.75) return;

    resetInactivityTimer(); // Wake word detectada (parcial ou final) = atividade real
    setIsWakeWordDetected(true);
    setTimeout(() => setIsWakeWordDetected(false), 1500);

    if (isPlayingAudio || isSpeaking) stopEverything();
    if (processingQuestion.current || isProcessing) return;
    if (!isFinal) return;

    const command = extractCommand(lowerText, wakeWordResult);
    const commandWords = command.split(' ').filter((w: string) => w.length > 2);

    if (!audioUnlocked.current) unlockAudio(audioUnlocked);

    if (!processingQuestion.current) {
      processingQuestion.current = true;
      if (!command) {
        const greeting = companyGreeting || greetingMessage || 'Oi! Como posso ajudar?';
        playText(greeting).finally(() => { processingQuestion.current = false; });
      } else if (commandWords.length < 2) {
        triggerRepromptWarning();
        playText('Pode completar sua pergunta?').finally(() => {
          processingQuestion.current = false;
          setTimeout(async () => {
            if (isActiveRef.current) { shouldProcessAudio.current = true; await startGoogleSpeech(); }
          }, 300);
        });
      } else {
        processWakeWordQuestion(command);
      }
    }
  }

  // ── Start ─────────────────────────────────────────────────
  async function handleStart() {
    resetInactivityTimer();
    setSessionId(null);
    unlockAudio(audioUnlocked);
    try {
      const testAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUB4QU6vo66lXGAo+meL0wmskBSyBzvLYiTcIGWi77OefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQU=');
      testAudio.volume = 0.01;
      await testAudio.play();
      testAudio.pause();
    } catch {}
    setShowStartButton(false);
    onAssistantStart?.();
    setTimeout(async () => { if (isActiveRef.current) await startGoogleSpeech(); }, 300);
  }

  // ── Function click ────────────────────────────────────────
  async function handleFunctionClick(functionKey: string, event?: any) {
    resetInactivityTimer();
    const pt = effectivePlayText;

    const isEnabled = await checkIfFunctionIsEnabled(companyId, functionKey);
    if (!isEnabled) {
      await pt('Esta função está desativada no momento. Entre em contato com o suporte para ativá-la.');
      setTimeout(async () => {
        if (isActiveRef.current) { shouldProcessAudio.current = true; await startGoogleSpeech(); }
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
        case 'faq':
          await pt('Me faça qualquer pergunta sobre nossos produtos, serviços, horários ou políticas.');
          break;
        case 'chatgpt':
          await pt('Pode me fazer qualquer pergunta! Estou aqui para conversar e te ajudar.');
          break;
        case 'pix_generate':
          await pt('Para gerar um pix, me diga o valor. Por exemplo: gerar pix de 50 reais.');
          break;
        case 'orcamento':
          await pt('Posso calcular orçamentos, prazos e valores totais. O que você precisa?');
          break;
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
            companyId, setIsProcessing, setQrCodeData, playText: pt,
          });
          break;
        case 'tocar_video':
          await stopGoogleSpeech();
          setActiveModal({ type: 'TocarVideoDisplay', data: { companyId, query: '' } });
          pt('Qual vídeo você quer assistir? Me diga o assunto.').catch(() => {});
          break;

case 'fila_atendimento':
  stopGoogleSpeech();
  setActiveModal({
    type: 'FilaAtendimentoDisplay',
    data: { companyId },
  });
  playText('Abrindo painel de atendimento...').catch(() => {});
  break;

case 'gerar_senha':
  stopGoogleSpeech();
  setActiveModal({
    type: 'GerarSenhaDisplay',
    data: { companyId, slug },
  });
  playText('Gerando sua senha...').catch(() => {});
  break;

// Funções internas (chamadas via voz ou dentro dos modais)
case 'chamar_proxima_senha':
case 'finalizar_atendimento':
case 'pausar_fila':
case 'retomar_fila':
case 'cancelar_senha':
case 'minha_posicao_fila':
  // Executar handler diretamente (não abre modal)
  await functionRegistry[functionKey]?.handler({
    companyId,
    playText,
    transcript: lastTranscript || '',
    slug,
  });
  break;

        case 'converter_medidas':
          setActiveModal({ type: 'ConverterMedidasDisplay', data: { companyId } });
          pt('Abrindo a calculadora de conversão de medidas.').catch(() => {});
          break;

        case 'calculadora_juros':
          setActiveModal({ type: 'CalculadoraJurosDisplay', data: { companyId } });
          pt('Abrindo a calculadora de juros.').catch(() => {});
          break;

        case 'calculadora_imc':
          setActiveModal({ type: 'CalculadoraIMCDisplay', data: { companyId } });
          pt('Abrindo a calculadora de IMC. Informe seu peso e altura.').catch(() => {});
          break;

case 'modo_fila':
  await stopGoogleSpeech();
  const filaUrl = getContextualRoute('fila', slug);
  window.location.href = filaUrl;
  break;

case 'responder_pesquisa':
  await stopGoogleSpeech();
  try {
    const supabase = createClient();
    const { data: pesquisa } = await supabase
      .from('pesquisas')
      .select('id, titulo')
      .eq('company_id', companyId)
      .eq('ativa', true)
      .maybeSingle();

    if (!pesquisa) {
      await pt('Não há pesquisas disponíveis no momento.');
      setIsProcessing(false);
      break;
    }

    setActiveModal({
      type: 'ResponderPesquisaDisplay',
      data: { companyId, pesquisaId: pesquisa.id },
    });
    pt(`Por favor, responda nossa pesquisa: ${pesquisa.titulo}`).catch(() => {});
  } catch (err) {
    console.error('Erro responder_pesquisa:', err);
    await pt('Erro ao abrir pesquisa.');
    setIsProcessing(false);
  }
  break;

case 'pre_atendimento':
  await stopGoogleSpeech();
  try {
    const supabase = createClient();
    const { data: form } = await supabase
      .from('pre_atendimento_forms')
      .select('id, nome')
      .eq('company_id', companyId)
      .eq('ativo', true)
      .maybeSingle();

    if (!form) {
      await pt('Não há formulários de pré-atendimento configurados.');
      setIsProcessing(false);
      break;
    }

    setActiveModal({
      type: 'PreAtendimentoDisplay',
      data: { companyId, formId: form.id },
    });
    pt(`Por favor, preencha o formulário: ${form.nome}`).catch(() => {});
  } catch (err) {
    console.error('Erro pre_atendimento:', err);
    await pt('Erro ao abrir formulário.');
    setIsProcessing(false);
  }
  break;
          
case 'juntar_pdfs':
  setActiveModal({ type: 'JuntarPdfsDisplay', data: { companyId } });
  await saveInteractionToHistory(
    companyId,
    'Juntar PDFs',
    'Modal de juntar PDFs aberto'
  );
  break;
        case 'minha_conta':
          await stopGoogleSpeech();
          setActiveModal({ type: 'LoginClienteDisplay', data: { profile, companyId, slug: slug ?? '' } });
          pt(profile ? `Olá ${profile.nome}! Sua conta está aberta.` : 'Abrindo sua conta. Faça login ou crie uma nova conta.').catch(() => {});
          return;
        case 'segunda_via_boleto':
          setActiveModal({ type: 'SegundaViaBoletoDisplay', data: { companyId } });
          await saveInteractionToHistory(companyId, 'Segunda Via Boleto', 'Geração de segunda via iniciada');
          break;
        case 'traduzir_texto':
          setActiveModal({ type: 'TranslateTextModal', data: { companyId } });
          pt('Abrindo ferramenta de tradução.').catch(() => {});
          break;
        case 'transcrever_audio':
          setActiveModal({ type: 'TranscribeAudioModal', data: { companyId } });
          pt('Abrindo ferramenta de transcrição.').catch(() => {});
          break;
        case 'ver_noticias':
          setActiveModal({ type: 'VerNoticiasDisplay', data: { companyId } });
          break;
        case 'procurar_produto':
          setActiveModal({ type: 'ProcurarProdutoDisplay', data: { companyId } });
          break;
        case 'lista_compras':
          await stopGoogleSpeech();
          setActiveModal({ type: 'ListaComprasDisplay', data: { companyId } });
          break;
        case 'meu_sistema':
          await stopGoogleSpeech();
          setActiveModal({ type: 'MeuSistemaDisplay', data: { companyId } });
          pt('Sou min I A, uma IA pra chamar de sua! Sou um funcionário de Voz e texto com Inteligência Artificial. Escaneie o QR Code para saber mais. minhai.app').catch(() => {});
          break;
        case 'consultar_cambio':
          setActiveModal({ type: 'CotacaoMoedasDisplay', data: { companyId } });
          break;
        case 'consultar_cep':
          setActiveModal({ type: 'ConsultarCEPDisplay', data: { companyId } });
          break;
        case 'consultar_cnpj':
          setActiveModal({ type: 'ConsultarCnpjModal', data: { companyId } });
          break;
        case 'consultar_cpf':
          setActiveModal({ type: 'ConsultarCpfModal', data: { companyId } });
          break;
        case 'restricoes_cpf':
          setActiveModal({ type: 'RestricoesCPFDisplay', data: { companyId } });
          break;
        case 'restricoes_cnpj':
          setActiveModal({ type: 'RestricoesCNPJDisplay', data: { companyId } });
          break;
        case 'consultar_feriados':
          setActiveModal({ type: 'FeriadosNacionaisDisplay', data: { companyId } });
          break;
        case 'consultar_ddd':
          setActiveModal({ type: 'ConsultarDDDDisplay', data: { companyId } });
          break;
        case 'consultar_placa':
          setActiveModal({ type: 'ConsultarPlacaModal', data: { companyId } });
          break;
        case 'consultar_leilao':
          setActiveModal({ type: 'ConsultarLeilaoModal', data: { companyId } });
          break;
        case 'cadastro':
          await handleCadastro({ companyId, setIsProcessing, setActiveModal });
          break;
        case 'registrar_venda':
          await stopGoogleSpeech();
          setActiveModal({ type: 'RegistrarVendaDisplay', data: { companyId } });
          pt('Abrindo o PDV...').catch(() => {});
          break;
        case 'ver_clientes':
          await stopGoogleSpeech();
          setActiveModal({ type: 'VerClientesDisplay', data: { companyId } });
          pt('Carregando lista de clientes...').catch(() => {});
          break;
        case 'fechar_caixa':
          await stopGoogleSpeech();
          setActiveModal({ type: 'FecharCaixaDisplay', data: { companyId } });
          pt('Preparando fechamento de caixa...').catch(() => {});
          break;
        case 'trocar_turno':
          await stopGoogleSpeech();
          setActiveModal({ type: 'TrocarTurnoDisplay', data: { companyId } });
          pt('Preparando troca de turno...').catch(() => {});
          break;
        case 'relatorio_vendas':
          await stopGoogleSpeech();
          setActiveModal({ type: 'RelatorioVendasDisplay', data: { companyId } });
          pt('Gerando relatório de vendas...').catch(() => {});
          break;
        case 'minhas_compras':
          await stopGoogleSpeech();
          setActiveModal({ type: 'MinhasComprasDisplay', data: { companyId } });
          pt('Carregando seu histórico de compras...').catch(() => {});
          break;
        case 'enviar_sms': {
          await stopGoogleSpeech();
          setActiveModal({ type: 'EnviarSmsDisplay', data: { companyId } });
          pt('Abrindo formulário de SMS...').catch(() => {});
          break;
        }
        case 'chamar_gerente': {
          await stopGoogleSpeech();
          const motivo = event?.detail?.transcript
            ? event.detail.transcript
                .replace(/chamar (o )?gerente/gi, '')
                .replace(/preciso (do|da) gerente/gi, '')
                .trim()
            : '';
          setActiveModal({ type: 'ChamarGerenteDisplay', data: { companyId, motivo: motivo || undefined } });
          pt('Chamando o gerente...').catch(() => {});
          break;
        }
        case 'identificar_fraude':
          setActiveModal({ type: 'IdentificarFraudeDisplay', data: { companyId } });
          await saveInteractionToHistory(companyId, 'Identificar Fraude', 'Análise de fraude iniciada');
          pt('Modo de identificação de fraude. Escolha imagem para fotografar ou link para analisar um site.').catch(() => {});
          break;
        case 'enviar_arquivo':
          await stopGoogleSpeech();
          setActiveModal({ type: 'EnviarArquivoDisplay', data: { companyId } });
          pt('Você pode enviar um arquivo diretamente para a empresa, que já recebem na hora!').catch(() => {});
          break;
        case 'gerar_qrcode':
          await stopGoogleSpeech();
          setActiveModal({ type: 'GerarQRCodeDisplay', data: { companyId } });
          pt('Abrindo gerador de QR Code. Diga ou digite o texto ou link.').catch(() => {});
          break;
        case 'gerar_codigo_barras':
          await stopGoogleSpeech();
          setActiveModal({ type: 'GerarCodigoBarrasDisplay', data: { companyId } });
          pt('Abrindo gerador de código de barras. Escolha o formato e diga o conteúdo.').catch(() => {});
          break;
        case 'tocar_musica':
          setActiveModal({ type: 'TocarMusicaDisplay', data: { companyId, query: '' } });
          pt('Qual música você quer ouvir?').catch(() => {});
          break;
        case 'playlist':
          setActiveModal({ type: 'PlaylistDisplay', data: { companyId } });
          pt('Abrindo playlist...').catch(() => {});
          break;
        case 'porta_retrato':
          setActiveModal({ type: 'PortaRetratoDisplay', data: { companyId } });
          pt('Abrindo porta retrato...').catch(() => {});
          break;
        case 'painel_ofertas':
          setActiveModal({ type: 'PainelOfertasDisplay', data: { companyId } });
          pt('Abrindo painel de ofertas...').catch(() => {});
          break;
        case 'aparelhos_smart':
          setActiveModal({ type: 'AparelhosSmartDisplay', data: { companyId, transcript: '' } });
          pt('Abrindo controle de dispositivos...').catch(() => {});
          break;
        case 'confirmar_presenca':
          setActiveModal({ type: 'ConfirmPresenceModal', data: { companyId } });
          pt('Vou buscar seu agendamento para confirmar presença.').catch(() => {});
          break;
        case 'reagendar_compromisso':
          setActiveModal({ type: 'RescheduleModal', data: { companyId } });
          pt('Vou buscar seu agendamento para reagendar.').catch(() => {});
          break;
        case 'cancelar_agendamento':
          setActiveModal({ type: 'CancelAppointmentModal', data: { companyId } });
          pt('Vou buscar seu agendamento para cancelar.').catch(() => {});
          break;
        case 'horarios_disponiveis':
          break;
        case 'meu_cupom':
          await stopGoogleSpeech();
          setActiveModal({ type: 'MeuCupomDisplay', data: { companyId, prefillName: '' } });
          await pt('Digite seu nome para gerar seu cupom de indicação.');
          break;
        case 'ler_qrcode':
          await stopGoogleSpeech();
          await handleLerQRCode({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'ler_codigo_barras':
          await stopGoogleSpeech();
          await handleLerCodigoBarras({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'validar_cupom':
          await stopGoogleSpeech();
          await handleValidarCupom({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'imagem_em_texto':
          await stopGoogleSpeech();
          await handleImagemEmTexto({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'tabela_em_texto':
          await stopGoogleSpeech();
          await handleTabelaEmTexto({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'contrato_em_texto':
          await stopGoogleSpeech();
          await handleContratoEmTexto({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'wifi_qrcode':
          await stopGoogleSpeech();
          await handleWifiQRCode({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'canal_youtube':
          await stopGoogleSpeech();
          await handleCanalYoutube({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'cardapio':
          await stopGoogleSpeech();
          await handleCardapio({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'nosso_qrcode':
          await stopGoogleSpeech();
          await handleNossoQRCode({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'nossa_marca':
          await stopGoogleSpeech();
          await handleNossaMarcaCommand({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'endereco':
          await stopGoogleSpeech();
          await handleEnderecoCommand({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'tracar_rota':
          setActiveModal({ type: 'TracarRotaDisplay', data: { companyId, destinoInicial: '' } });
          await saveInteractionToHistory(companyId, 'Traçar Rota', 'Modal aberto para calcular rota');
          break;
        case 'buscar_endereco':
          setActiveModal({ type: 'BuscarEnderecoDisplay', data: { companyId, termoInicial: '' } });
          await saveInteractionToHistory(companyId, 'Buscar Endereço', 'Modal aberto para busca');
          break;
        case 'rastreio_correios':
          setActiveModal({ type: 'RastreioCorreiosDisplay', data: { companyId } });
          await saveInteractionToHistory(companyId, 'Rastreio Correios', 'Modal de rastreamento aberto');
          break;
        case 'video_instrucoes':
          await stopGoogleSpeech();
          await handleVideoInstrucoesCommand({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'sequencia_videos':
          await stopGoogleSpeech();
          await handleSequenciaVideosCommand({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'enviar_email':
          await stopGoogleSpeech();
          setActiveModal({ type: 'SendEmailModal', data: { companyId } });
          pt('Diga o conteúdo e quando acabar, diga CONCLUIR.').catch(() => {});
          break;
        case 'fichas_producao_conversacional':
          await stopGoogleSpeech();
          stopAudioImmediately();
          setActiveModal({ type: 'FichaProducaoConversacionalDisplay', data: { companyId, fichaType: 'produto' } });
          break;
        case 'agendar_compromisso':
          await stopGoogleSpeech();
          setActiveModal({ type: 'CreateEventModal', data: { companyId, prefilledData: {} } });
          pt('Posso te marcar na agenda, basta me dizer qual o dia, mês, hora e seu nome.').catch(() => {});
          break;
        case 'ver_agenda':
          setActiveModal({ type: 'ViewAgendaModal', data: { companyId, initialView: 'month' } });
          pt('Abrindo o calendário.').catch(() => {});
          break;
        case 'criar_lembrete':
          await handleCriarLembrete({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'cronometro':
          await handleCronometro({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'temporizador':
          await pt('Qual o tempo do temporizador? Por exemplo: 5 minutos, 30 segundos.');
          break;
        case 'relogio_mundial':
          await handleRelogioMundial({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'alarme':
          await handleAlarme({ companyId, setIsProcessing, setActiveModal, playText: pt });
          break;
        case 'cobrar_debito':
          await stopGoogleSpeech();
          pt('Pode me dizer o valor para cobrar no débito.').catch(() => {});
          break;
        case 'cobrar_credito':
          await stopGoogleSpeech();
          pt('Pode me dizer o valor para cobrar no crédito.').catch(() => {});
          break;
        case 'link_pagamento':
          await stopGoogleSpeech();
          pt('Posso gerar um Link de Pagamento, basta pedir um Link com o valor.').catch(() => {});
          break;
        case 'nfc_credito':
          await stopGoogleSpeech();
          pt('Posso gerar uma Cobrança no Cartão de Crédito via NFC, basta pedir uma cobrança NFC crédito e o valor.').catch(() => {});
          break;
        case 'nfc_debito':
          await stopGoogleSpeech();
          pt('Posso gerar uma Cobrança no Cartão de Débito via NFC, basta pedir uma cobrança NFC débito e o valor.').catch(() => {});
          break;
        case 'tef_debito':
          await stopGoogleSpeech();
          pt('Posso cobrar no débito direto na maquininha Point. Basta pedir uma cobrança TEF débito com o valor.').catch(() => {});
          break;
        case 'tef_credito':
          await stopGoogleSpeech();
          pt('Posso cobrar no crédito direto na maquininha Point, à vista ou parcelado. Basta pedir uma cobrança TEF crédito com o valor.').catch(() => {});
          break;
        case 'clima_tempo':
          await stopGoogleSpeech();
          setActiveModal({ type: 'ClimaTempoDisplay', data: { companyId, city: null } });
          pt('Consultando o clima agora...').catch(() => {});
          break;
        case 'cadastrar_produto':
          await stopGoogleSpeech();
          setActiveModal({ type: 'CadastrarProdutoDisplay', data: { companyId } });
          pt('Vou te guiar no cadastro do produto. Qual o nome?').catch(() => {});
          return;
        case 'modo_venda': {
          await stopGoogleSpeech();
          const vendaUrl = getContextualRoute('vendas', slug);
          window.location.href = vendaUrl;
          break;
        }
        case 'link_na_bio': {
          await stopGoogleSpeech();
          const linkUrl = getContextualRoute('link', slug);
          window.location.href = linkUrl;
          break;
        }
        case 'analisar_planilha':
          await stopGoogleSpeech();
          setActiveModal({ type: 'AnalisarPlanilhaDisplay', data: { companyId } });
          break;
        case 'ver_produtos':
          break;
        default: {
          // Fallback via FUNCTIONS_REGISTRY
          const registryFunc = getFunctionByKey(functionKey);
          if (registryFunc?.handler) {
            const success = await registryFunc.handler({
              transcript: '',
              companyId,
              functionSettings,
              playText: pt,
              setIsProcessing,
              sessionId,
              setActiveModal,
              registerFunctionUsage: async (key: string, credits: number) =>
                registerFunctionUsage(companyId, key, credits),
              checkIfFunctionIsEnabled: async (key: string) =>
                checkIfFunctionIsEnabled(companyId, key),
            });
            if (success) {
              await registerFunctionUsage(companyId, functionKey, registryFunc.creditsPerUse ?? 0);
              return;
            }
          } else {
            await pt(`A função ${functionKey} ainda não está configurada.`);
          }
        }
      }

      await registerFunctionUsage(companyId, functionKey, functionSettings[functionKey]?.creditsPerUse ?? 0);
    } catch (error) {
      console.error('Erro ao executar função:', error);
      await pt('Desculpe, ocorreu um erro ao executar esta função.');
    } finally {
      setIsProcessing(false);
      setTimeout(async () => {
        if (isActiveRef.current) { shouldProcessAudio.current = true; await startGoogleSpeech(); }
      }, 500);
    }
  }

  // ── processWakeWordQuestion ───────────────────────────────
  function processWakeWordQuestion(transcript: string) {
    const clean = transcript.replace(/[,\.!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (endCommands.some(cmd => clean.toLowerCase().includes(cmd))) {
      processingQuestion.current = false;
      playGoodbye();
      return;
    }
    if (clean.split(' ').filter((w: string) => w.length > 2).length === 0) {
      processingQuestion.current = false;
      setTimeout(async () => {
        if (isActiveRef.current) { shouldProcessAudio.current = true; await startGoogleSpeech(); }
      }, 300);
      return;
    }
    setLastTranscript(clean);
    processQuestion(clean);
  }

  // ── Ponto 3: processQuestion com FAQ FIRST ────────────────
  async function processQuestion(questionText: string) {
    console.log('⚡ Processando:', questionText);
    shouldProcessAudio.current = false;
    await stopGoogleSpeech();

    // ── FAQ FIRST ─────────────────────────────────────────────
    const matchedFAQ = findMatchingFAQLocal(faqsRef.current, questionText);
    if (matchedFAQ) {
      console.log('📚 FAQ resolvida localmente:', matchedFAQ.question);

      if (matchedFAQ.function_key) {
        // FAQ com função vinculada — falar introdução e disparar função
        if (matchedFAQ.answer) await playText(matchedFAQ.answer);
        handleFunctionClickSilent(matchedFAQ.function_key, matchedFAQ.function_params ?? undefined);
      } else {
        // FAQ simples — apenas responder
        await playText(matchedFAQ.answer);
      }

      await registerFunctionUsage(companyId, 'faq', 1);
      processingQuestion.current = false;
      setTimeout(async () => {
        shouldProcessAudio.current = true;
        await startGoogleSpeech();
      }, 500);
      return;
    }
    // ── FIM FAQ FIRST ─────────────────────────────────────────

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
        } catch { setIsProcessing(false); }
        processingQuestion.current = false;
        setTimeout(async () => { shouldProcessAudio.current = true; await startGoogleSpeech(); }, 500);
        return;
      }
    }

    // ✅ slug passado aqui
    const isCommand = await detectVoiceCommand(questionText, {
      companyId,
      slug,
      functionSettings,
      setIsProcessing,
      setQrCodeData,
      setPixConfirmationData,
      playText,
      sessionId,
      commandProcessor,
      pixStateRef,
      setActiveModal,
      activeFunctionContextRef,
      groqContextRef,
    });

    if (isCommand) {
      processingQuestion.current = false;
      setTimeout(async () => { shouldProcessAudio.current = true; await startGoogleSpeech(); }, 500);
      return;
    }

    setIsProcessing(true);

    try {
      const startTime = Date.now();
      const formData = new FormData();
      const textBlob = new Blob([questionText], { type: 'text/plain' });
      formData.append('audio', textBlob, 'question.txt');
      formData.append('companyId', companyId);
      if (typeof window !== 'undefined' && window.location.pathname.includes('/vendas')) {
        formData.append('saleMode', 'true');
      }
      formData.append('directQuestion', questionText);
      if (sessionId) formData.append('sessionId', sessionId);

      let feedbackStarted = false;
      const feedbackTimeout = setTimeout(() => {
        if (!feedbackStarted) {
          feedbackStarted = true;
          playProcessingFeedback().then(audio => { feedbackAudioRef.current = audio; }).catch(() => {});
        }
      }, 1000);

      const response = await fetch('/api/voice/process', { method: 'POST', body: formData });

      const newSessionId = response.headers.get('X-Session-Id');
      if (newSessionId && !sessionId) setSessionId(newSessionId);

      const responseTextHeader = response.headers.get('X-Response-Text');
      if (responseTextHeader) setLastResponse(decodeURIComponent(responseTextHeader));

      if (!response.ok) throw new Error(`Erro: ${response.status}`);

      clearTimeout(feedbackTimeout);

      if (feedbackStarted && feedbackAudioRef.current) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 1200) await new Promise(resolve => setTimeout(resolve, 1200 - elapsed));
        try { feedbackAudioRef.current.pause(); feedbackAudioRef.current.currentTime = 0; feedbackAudioRef.current = null; } catch {}
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

  // ── Fase 2: atualizar memória em background ──
  if (sessionId && lastTranscript && lastResponse) {
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-session-memory`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          company_id: companyId,
          user_message: lastTranscript,
          assistant_message: lastResponse,
          function_key: null, // funções específicas atualizam via próprio handler
        }),
      }
    ).catch(() => {}); // fire-and-forget — nunca bloqueia o fluxo de voz
  }

  setTimeout(async () => { shouldProcessAudio.current = true; await startGoogleSpeech(); }, 2000);
};
      audio.onerror = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        setTimeout(async () => { shouldProcessAudio.current = true; await startGoogleSpeech(); }, 1000);
      };

      const safetyTimeout = setTimeout(() => {
        if (!isPlayingAudio && currentAudioRef.current === audio) {
          setIsPlayingAudio(false);
          currentAudioRef.current = null;
          processingQuestion.current = false;
          setTimeout(async () => { if (isActiveRef.current) { shouldProcessAudio.current = true; await startGoogleSpeech(); } }, 1000);
        }
      }, 1500);

      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => clearTimeout(safetyTimeout))
            .catch(() => {
              setTimeout(() => {
                audio.play().then(() => clearTimeout(safetyTimeout)).catch(() => {
                  clearTimeout(safetyTimeout);
                  setIsPlayingAudio(false);
                  currentAudioRef.current = null;
                  processingQuestion.current = false;
                });
              }, 100);
            });
        }
      } catch {
        clearTimeout(safetyTimeout);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
      }
    } catch {
      setIsProcessing(false);
      processingQuestion.current = false;
      if (feedbackAudioRef.current) {
        try { feedbackAudioRef.current.pause(); feedbackAudioRef.current = null; } catch {}
      }
      setTimeout(async () => { shouldProcessAudio.current = true; await startGoogleSpeech(); }, 1000);
    }
  }

  // ── handleTextMessage (modo voz input text) ───────────────
const handleTextMessage = async (message: string) => {
  resetInactivityTimer();
  if (detectStopCommand(message)) { stopEverything(); return; }
  if (message.trim()) setLastTranscript(message.trim());

  if (currentAudioRef.current) {
    currentAudioRef.current.pause();
    currentAudioRef.current.currentTime = 0;
    currentAudioRef.current = null;
  }

  // ── FAQ FIRST ─────────────────────────────────────────────
  const matchedFAQ = findMatchingFAQLocal(faqsRef.current, message);
  console.log('🔎 FAQ check (text):', faqsRef.current.length, 'faqs | match:', matchedFAQ?.question ?? 'null');
  if (matchedFAQ) {
    console.log('📚 FAQ resolvida (texto):', matchedFAQ.question);
    if (matchedFAQ.function_key) {
      if (matchedFAQ.answer) await playText(matchedFAQ.answer);
      handleFunctionClickSilent(matchedFAQ.function_key, matchedFAQ.function_params ?? undefined);
    } else {
      await playText(matchedFAQ.answer);
    }
    await registerFunctionUsage(companyId, 'faq', 1);
    return;
  }

    setIsProcessing(true);

    try {
      // ✅ slug passado aqui
      const isCommand = await detectVoiceCommand(message, {
        companyId,
        slug,
        functionSettings,
        setIsProcessing,
        setQrCodeData,
        setPixConfirmationData,
        playText,
        sessionId,
        commandProcessor,
        pixStateRef,
        setActiveModal,
        activeFunctionContextRef,
        groqContextRef,
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

      const responseTextHeader = response.headers.get('X-Response-Text');
      if (responseTextHeader) setLastResponse(decodeURIComponent(responseTextHeader));

      const hintFunctionKey = response.headers.get('X-Function-Key');
      if (hintFunctionKey) {
        setIsProcessing(false);
        processingQuestion.current = false;
        handleFunctionClick(hintFunctionKey);
        setTimeout(async () => { shouldProcessAudio.current = true; await startGoogleSpeech(); }, 500);
        return;
      }

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
    } catch {
      await playText('Desculpe, ocorreu um erro ao processar sua mensagem.');
    } finally {
      setIsProcessing(false);
      setTimeout(async () => {
        if (isActiveRef.current) { shouldProcessAudio.current = true; await startGoogleSpeech(); }
      }, 500);
    }
  };

  // ── detectRegistryFunction ────────────────────────────────
  function detectRegistryFunction(text: string) {
    const lowerText = text.toLowerCase().trim();
    let bestMatch: any = null;
    let bestScore = 0;

    for (const func of Object.values(FUNCTIONS_REGISTRY)) {
      let score = 0;
      for (const trigger of func.voiceTriggers) {
        const triggerLower = trigger.toLowerCase();
        const escaped = triggerLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(
          `(?<![a-záéíóúãõâêîôûç])${escaped}(?![a-záéíóúãõâêîôûç])`, 'i'
        );
        if (regex.test(lowerText)) {
          score += triggerLower.split(' ').length >= 2 ? 15 : 8;
        }
      }
      if (score > bestScore) { bestScore = score; bestMatch = func; }
    }

    return bestScore >= 8 ? bestMatch : null;
  }

  // ── Ponto 4: handleTextMessageForText com FAQ FIRST ───────
  const handleTextMessageForText = async (
    message: string
  ): Promise<{ text: string; functionKey?: string } | null> => {
    if (detectStopCommand(message)) { stopEverything(); return null; }

    let capturedText = '';
    const silentPlayText = (text: string): Promise<void> => {
      if (text && text.trim()) capturedText = text.trim();
      return Promise.resolve();
    };

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    setIsProcessing(true);

    try {
      // ── FAQ FIRST ─────────────────────────────────────────────
      const matchedFAQ = findMatchingFAQLocal(faqsRef.current, message);
      console.log('🔎 FAQ check:', faqsRef.current.length, 'faqs | match:', matchedFAQ?.question ?? 'null');
      if (matchedFAQ) {
        console.log('📚 FAQ resolvida localmente (texto):', matchedFAQ.question);

        if (matchedFAQ.function_key) {
          if (matchedFAQ.answer) capturedText = matchedFAQ.answer;
          handleFunctionClickSilent(matchedFAQ.function_key, matchedFAQ.function_params ?? undefined);
        } else {
          capturedText = matchedFAQ.answer;
        }

        await registerFunctionUsage(companyId, 'faq', 1);
        setIsProcessing(false);
        return { text: capturedText, functionKey: matchedFAQ.function_key ?? undefined };
      }
      // ── FIM FAQ FIRST ─────────────────────────────────────────

      // ── ETAPA 1: Contexto de função ativa
      const activeFunction = getActiveFunctionContext();
      if (activeFunction) {
        const func = getFunctionByKey(activeFunction);
        if (func?.handler) {
          const handlerSuccess = await func.handler({
            transcript: message,
            companyId,
            functionSettings,
            playText: silentPlayText,
            setIsProcessing,
            sessionId,
            setActiveModal,
            registerFunctionUsage: async (key: string, credits: number) =>
              registerFunctionUsage(companyId, key, credits),
            checkIfFunctionIsEnabled: async (key: string) =>
              checkIfFunctionIsEnabled(companyId, key),
          });
          if (handlerSuccess) {
            activeFunctionContextRef.current = null;
            await registerFunctionUsage(companyId, activeFunction, functionSettings[activeFunction]?.creditsPerUse ?? 2);
            return { text: capturedText || '', functionKey: activeFunction };
          }
        }
        activeFunctionContextRef.current = null;
      }

      // ETAPA 2: detectVoiceCommand — usa ref dummy para não poluir o ref real
      const dummyContextRef = { current: null };

      // ✅ slug passado aqui também
      const isCommand = await detectVoiceCommand(message, {
        companyId,
        slug,
        functionSettings,
        setIsProcessing,
        setQrCodeData,
        setPixConfirmationData,
        playText: silentPlayText,
        sessionId,
        commandProcessor,
        pixStateRef,
        setActiveModal,
        activeFunctionContextRef: dummyContextRef,
        groqContextRef,
      });

      if (isCommand) {
        activeFunctionContextRef.current = null;
        return { text: capturedText || '', functionKey: undefined };
      }

      // ETAPA 3: detectRegistryFunction
      const registryFunc = detectRegistryFunction(message);
      if (registryFunc?.handler) {
        const isEnabled = await checkIfFunctionIsEnabled(companyId, registryFunc.functionKey);
        if (isEnabled) {
          try {
            const success = await registryFunc.handler({
              transcript: message,
              companyId,
              functionSettings,
              playText: silentPlayText,
              setIsProcessing,
              sessionId,
              setActiveModal,
              registerFunctionUsage: async (key: string, credits: number) =>
                registerFunctionUsage(companyId, key, credits),
              checkIfFunctionIsEnabled: async (key: string) =>
                checkIfFunctionIsEnabled(companyId, key),
            });
            if (success) {
              activeFunctionContextRef.current = null;
              await registerFunctionUsage(companyId, registryFunc.functionKey, registryFunc.creditsPerUse ?? 0);
              return { text: capturedText || '', functionKey: registryFunc.functionKey };
            }
          } catch {}
        }
      }

      // ETAPA 4: Backend
      const formData = new FormData();
      formData.append('audio', new Blob([message], { type: 'text/plain' }), 'question.txt');
      formData.append('companyId', companyId);
      formData.append('directQuestion', message);
      formData.append('returnText', 'true');
      if (sessionId) formData.append('sessionId', sessionId);

      const response = await fetch('/api/voice/process', { method: 'POST', body: formData });

      const newSessionId = response.headers.get('X-Session-Id');
      if (newSessionId && !sessionId) setSessionId(newSessionId);

      const hintFunctionKey = response.headers.get('X-Function-Key');
      if (hintFunctionKey) {
        setIsProcessing(false);
        handleFunctionClickSilent(hintFunctionKey);
        const headerText = response.headers.get('X-Response-Text');
        const hintText = headerText ? decodeURIComponent(headerText) : '';
        if (hintText) setLastResponse(hintText);
        return { text: hintText || '', functionKey: hintFunctionKey };
      }

      if (!response.ok) throw new Error(`Erro: ${response.status}`);

      let responseText = '';
      let usedFAQ = false;
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        responseText = data.response || data.text || '';
        usedFAQ = !!data.usedFAQ;
      } else {
        const headerText = response.headers.get('X-Response-Text');
        responseText = headerText ? decodeURIComponent(headerText) : '';
      }

      if (responseText) setLastResponse(responseText);

      if (!usedFAQ && commandProcessor) {
        commandProcessor.saveUnrecognizedHint(message);
      }

      return { text: responseText, functionKey: undefined };
    } catch {
      return { text: 'Desculpe, ocorreu um erro ao processar sua mensagem.', functionKey: undefined };
    } finally {
      setIsProcessing(false);
    }
  };

  // ── handleFunctionClickSilent ─────────────────────────────
  const handleFunctionClickSilent = (functionKey: string, functionParams?: any) => {
    const modalOnlyFunctions: Record<string, ActiveModal> = {
      tocar_video:        { type: 'TocarVideoDisplay',                data: { companyId, query: '' } },
      meu_sistema:        { type: 'MeuSistemaDisplay',                data: { companyId } },
      consultar_cambio:   { type: 'CotacaoMoedasDisplay',             data: { companyId } },
      consultar_cep:      { type: 'ConsultarCEPDisplay',              data: { companyId } },
      consultar_cnpj:     { type: 'ConsultarCnpjModal',               data: { companyId } },
      consultar_cpf:      { type: 'ConsultarCpfModal',                data: { companyId } },
      restricoes_cpf:     { type: 'RestricoesCPFDisplay',             data: { companyId } },
      restricoes_cnpj:    { type: 'RestricoesCNPJDisplay',            data: { companyId } },
      consultar_feriados: { type: 'FeriadosNacionaisDisplay',         data: { companyId } },
      consultar_ddd:      { type: 'ConsultarDDDDisplay',              data: { companyId } },
      consultar_placa:    { type: 'ConsultarPlacaModal',              data: { companyId } },
      consultar_leilao:   { type: 'ConsultarLeilaoModal',             data: { companyId } },
      enviar_arquivo:     { type: 'EnviarArquivoDisplay',             data: { companyId } },
      gerar_qrcode:       { type: 'GerarQRCodeDisplay',               data: { companyId } },
      gerar_codigo_barras:{ type: 'GerarCodigoBarrasDisplay',         data: { companyId } },
      tocar_musica:       { type: 'TocarMusicaDisplay',               data: { companyId, query: '' } },
      playlist:           { type: 'PlaylistDisplay',                  data: { companyId } },
      porta_retrato:      { type: 'PortaRetratoDisplay',              data: { companyId } },
      painel_ofertas:     { type: 'PainelOfertasDisplay',             data: { companyId } },
      confirmar_presenca: { type: 'ConfirmPresenceModal',             data: { companyId } },
      reagendar_compromisso: { type: 'RescheduleModal',               data: { companyId } },
      cancelar_agendamento:  { type: 'CancelAppointmentModal',        data: { companyId } },
      meu_cupom:          { type: 'MeuCupomDisplay',                  data: { companyId, prefillName: '' } },
      traduzir_texto:     { type: 'TranslateTextModal',               data: { companyId } },
      transcrever_audio:  { type: 'TranscribeAudioModal',             data: { companyId } },
      ver_noticias:       { type: 'VerNoticiasDisplay',               data: { companyId } },
      procurar_produto:   { type: 'ProcurarProdutoDisplay',           data: { companyId } },
      segunda_via_boleto: { type: 'SegundaViaBoletoDisplay',          data: { companyId } },
      identificar_fraude: { type: 'IdentificarFraudeDisplay',         data: { companyId } },
      clima_tempo:        { type: 'ClimaTempoDisplay',                data: { companyId, city: null } },
      cadastrar_produto:  { type: 'CadastrarProdutoDisplay',          data: { companyId } },
      enviar_email:       { type: 'SendEmailModal',                   data: { companyId } },
      agendar_compromisso:{ type: 'CreateEventModal',                 data: { companyId, prefilledData: {} } },
      ver_agenda:         { type: 'ViewAgendaModal',                  data: { companyId, initialView: 'month' } },
      relogio_mundial:    { type: 'RelogioMundialDisplay',            data: { companyId } },
      rastreio_correios:  { type: 'RastreioCorreiosDisplay',          data: { companyId } },
      tracar_rota:        { type: 'TracarRotaDisplay',                data: { companyId, destinoInicial: '' } },
      buscar_endereco:    { type: 'BuscarEnderecoDisplay',            data: { companyId, termoInicial: '' } },
      fichas_producao_conversacional: { type: 'FichaProducaoConversacionalDisplay', data: { companyId, fichaType: 'produto' } },
      minha_conta:        { type: 'LoginClienteDisplay',              data: { profile, companyId, slug: slug ?? '' } },
      criar_nota:         { type: 'CriarNotaDisplay',                 data: { companyId } },
      lembrete_remedios:  { type: 'LembreteRemediosDisplay',          data: { companyId } },
      converter_arquivo:  { type: 'ConverterArquivoDisplay',          data: { companyId } },
      editar_imagem:      { type: 'EditarImagemDisplay',              data: { companyId } },
      remover_fundo:      { type: 'RemoverFundoDisplay',              data: { companyId } },
      duplicar_imagem:    { type: 'DuplicarImagemDisplay',            data: { companyId } },
      lista_compras:      { type: 'ListaComprasDisplay',              data: { companyId } },
      analisar_planilha:  { type: 'AnalisarPlanilhaDisplay',          data: { companyId } },
    };

    const modal = modalOnlyFunctions[functionKey];
    if (modal) {
      setActiveModal(modal);
    } else {
      const registryFunc = getFunctionByKey(functionKey);
      if (registryFunc?.handler) {
        registryFunc.handler({
          transcript: '',
          companyId,
          functionSettings,
          functionParams,
          playText: () => Promise.resolve(),
          setIsProcessing,
          sessionId,
          setActiveModal,
        }).catch(() => {});
      } else {
        handleFunctionClick(functionKey);
      }
    }
  };

  // ── Registra handler externo ──────────────────────────────
  useEffect(() => {
    if (onTextMessage) {
      onTextMessage(async (text: string) => {
        return await handleTextMessageForText(text);
      });
    }
  }, [onTextMessage, commandProcessor]);

  useEffect(() => {
    function handleOpenListaCompras(event: CustomEvent) {
      const { listaId, companyId: cId } = event.detail;
      setActiveModal({ type: 'ListaComprasDisplay', data: { companyId: cId, listaId } });
    }
    window.addEventListener('openListaCompras', handleOpenListaCompras as EventListener);
    return () => window.removeEventListener('openListaCompras', handleOpenListaCompras as EventListener);
  }, [setActiveModal]);

  // ── Helpers ───────────────────────────────────────────────
  async function playGoodbye() {
    try { await playText('Até logo!'); } catch {}
    setTimeout(async () => { if (isActiveRef.current) { shouldProcessAudio.current = true; await startGoogleSpeech(); } }, 1000);
  }

  const handleConfirmPixLocal = () =>
    handleConfirmPix(pixStateRef.current?.pixConfirmationData ?? null, {
      companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings,
    });

  const handleCancelPixLocal = () =>
    handleCancelPix(pixStateRef.current?.pixConfirmationData ?? null, {
      companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings,
    });

  const getStatusMessage = () => {
    if (!hasMicrophone) return 'Modo de voz indisponível';
    if (!permissionGranted) return 'Aguardando permissão de voz...';
    if (isTranscribing) return 'Transcrevendo...';
    if (isPlayingAudio) return 'Falando...';
    if (isProcessing) return 'Processando...';
    const primaryWakeWord = companyWakeWord?.split(',')[0].trim();
    return primaryWakeWord ? `diga: "${primaryWakeWord}" + sua solicitação` : 'Aguarde...';
  };

  const getMicButtonColor = () => {
    if (voiceRecorder.isRecording || isPlayingAudio) return 'bg-red-500 animate-pulse';
    if (isTranscribing) return 'bg-orange-400 animate-pulse';
    if (!hasMicrophone || !permissionGranted) return 'bg-gray-400';
    if (isPlayingAudio) return 'bg-blue-500 animate-pulse';
    if (isProcessing) return 'bg-yellow-400 animate-pulse';
    if (isListening) return 'bg-blue-400 animate-pulse';
    return 'bg-green-400 animate-pulse';
  };

  const getMicHintText = () => {
    if (!hasMicrophone) return 'Microfone não detectado';
    if (!permissionGranted) return 'Permissão de voz necessária';
    if (voiceRecorder.isRecording) return 'solte para enviar...';
    if (isTranscribing) return 'transcrevendo...';
    if (isPlayingAudio) return 'clique para parar';
    return 'segure para falar ou';
  };

  const avatarIsHidden =
    activeModal !== null &&
    activeModal.type !== 'QRCodeDisplay' &&
    activeModal.type !== 'PIXConfirmationModal';

  // ── RENDER: MAXIMIZED ─────────────────────────────────────
  if (isMaximized) {
    return (
      <div className="flex flex-col items-center gap-2 md:gap-3 w-full">
        <div
          className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 cursor-pointer select-none"
          onMouseDown={handleMicButtonDown}
          onMouseUp={handleMicButtonUp}
          onTouchStart={handleMicButtonDown}
          onTouchEnd={handleMicButtonUp}
        >
          {voiceRecorder.isRecording && (
            <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-40 pointer-events-none z-10" />
          )}
          <AvatarFace
            isListening={isListening || voiceRecorder.isRecording}
            isSpeaking={isPlayingAudio}
            isProcessing={isProcessing || isTranscribing}
            isWakeWordDetected={isWakeWordDetected}
            theme={theme}
            qrCodeData={qrCodeData}
            pixConfirmationData={pixConfirmationData}
            onCloseQRCode={() => setQrCodeData(null)}
            onCopyQRCode={() => {}}
            onConfirmPix={handleConfirmPixLocal}
            onCancelPix={handleCancelPixLocal}
            isHidden={avatarIsHidden}
          />
        </div>

        {!showStartButton && (
          <p className={`text-sm font-medium -mt-6 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}>
            {voiceRecorder.isRecording ? 'solte para enviar...' : isTranscribing ? 'transcrevendo...' : 'clique em mim para falar ou'}
          </p>
        )}

        <div className="text-center px-4 max-w-md">
          <p className={`text-lg sm:text-xl md:text-2xl font-bold mb-2 whitespace-nowrap ${theme === 'dark' ? 'text-white/50' : 'text-gray-900/50'}`}>
            {getStatusMessage()}
          </p>
          <div className={`mt-2 transition-all duration-300 ${(repromptWarning || noiseWarning) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <span className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              theme === 'dark' ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {repromptWarning ? 'Não consegui entender — pode repetir?' : 'Ambiente ruidoso — fale mais perto do microfone'}
            </span>
          </div>
          {error && <p className={`text-xs sm:text-sm mt-2 ${theme === 'dark' ? 'text-red-400/50' : 'text-red-600/50'}`}>{error}</p>}
        </div>

        <ActionModals
          activeModal={activeModal}
          onClose={handleCloseModal}
          theme={theme}
          onConfirmPix={handleConfirmPixLocal}
          onCancelPix={handleCancelPixLocal}
          playText={playText}
        />
      </div>
    );
  }

  // ── RENDER: NORMAL ────────────────────────────────────────
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Modal de Destaque de Função */}
      {highlightedFeature && (
        <FeatureHighlightModal
          isOpen={showFeatureHighlight}
          onClose={handleCloseFeatureHighlight}
          featureName={highlightedFeature.function_name}
          featureDescription={highlightedFeature.short_description}
          featureCategory={highlightedFeature.function_category}
          theme={theme}
        />
      )}
      <div className="grid md:grid-cols-2 gap-8">

        {/* Card esquerdo: Avatar */}
        <div className={`rounded-3xl shadow-2xl p-8 border relative overflow-hidden transition-colors ${
          theme === 'dark' ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'
        }`}>
          <div className="relative h-96">
            <AvatarFace
              isListening={isListening}
              isSpeaking={isPlayingAudio}
              isProcessing={isProcessing}
              isWakeWordDetected={isWakeWordDetected}
              theme={theme}
              qrCodeData={qrCodeData}
              pixConfirmationData={pixConfirmationData}
              onCloseQRCode={() => setQrCodeData(null)}
              onCopyQRCode={() => {}}
              onConfirmPix={handleConfirmPixLocal}
              onCancelPix={handleCancelPixLocal}
              isHidden={avatarIsHidden}
            />
          </div>
        </div>

        {/* Card direito: Status / Microfone */}
        <div className={`rounded-3xl shadow-2xl p-8 border transition-colors h-[448px] flex flex-col overflow-hidden ${
          theme === 'dark' ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col items-center flex-1 min-h-0">

            <div className="relative flex items-center justify-center mt-2">
              <button
                onMouseDown={handleMicButtonDown}
                onMouseUp={handleMicButtonUp}
                onTouchStart={handleMicButtonDown}
                onTouchEnd={handleMicButtonUp}
                disabled={(!permissionGranted && hasMicrophone) || !hasMicrophone || showStartButton || isTranscribing}
                className={`w-[102px] h-[102px] rounded-full ${getMicButtonColor()} flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300/50 disabled:opacity-50 select-none`}
                aria-label="Segurar para falar"
              >
                {isPlayingAudio ? (
                  <Square className="w-[51px] h-[51px] text-white fill-current" />
                ) : hasMicrophone && permissionGranted ? (
                  <Mic className="w-[51px] h-[51px] text-white" />
                ) : (
                  <MicOff className="w-[51px] h-[51px] text-white opacity-50" />
                )}
              </button>
            </div>

            {!showStartButton && (
              <p className={`text-xs font-medium mt-1 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}>
                {getMicHintText()}
              </p>
            )}

            <div className="text-center w-full mt-4">
              <p className={`text-xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getStatusMessage()}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}`}>
                Utilize a palavra de ativação apenas no modo voz.
              </p>
            </div>

            {error && (
              <div className={`w-full mt-3 p-3 rounded-xl border-2 ${
                theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!showStartButton && (
              <div className="w-full min-w-0 overflow-hidden mt-auto flex flex-col gap-0.5">

                <div className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all duration-300 ${
                  (repromptWarning || noiseWarning)
                    ? theme === 'dark'
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'opacity-0 pointer-events-none border-transparent bg-transparent'
                }`}>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 18.364a9 9 0 000-12.728M8.464 15.536a5 5 0 010-7.072" />
                  </svg>
                  <span className="truncate">
                    {repromptWarning ? 'Não consegui entender — pode repetir?' : 'Estou ouvindo... fale mais perto do microfone'}
                  </span>
                </div>

                <div
                  onClick={() => {
                    if (showLastConversation && (lastTranscript || lastResponse)) {
                      setShowConversationModal(true);
                      setTimeout(() => setShowConversationModal(false), 5000);
                    }
                  }}
                  className={`w-full rounded-xl border transition-all duration-500 overflow-hidden ${
                    showLastConversation
                      ? theme === 'dark'
                        ? 'bg-emerald-500/15 border-emerald-500/30 cursor-pointer hover:bg-emerald-500/25'
                        : 'bg-emerald-50 border-emerald-200 cursor-pointer hover:bg-emerald-100'
                      : 'opacity-0 pointer-events-none border-transparent bg-transparent'
                  }`}
                >
                  {lastTranscript && (
                    <div className={`px-3 py-1.5 flex items-center gap-2 text-xs font-medium min-w-0 ${
                      theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
                    }`}>
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span className="truncate min-w-0 flex-1">{lastTranscript}</span>
                    </div>
                  )}
                  {lastTranscript && lastResponse && (
                    <div className={`mx-3 h-px ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-200/60'}`} />
                  )}
                  {lastResponse && (
                    <div className={`px-3 py-1.5 flex items-center gap-2 text-xs min-w-0 ${
                      theme === 'dark' ? 'text-emerald-400/80' : 'text-emerald-600/80'
                    }`}>
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className="truncate min-w-0 flex-1">{lastResponse}</span>
                    </div>
                  )}
                </div>

                <TextInputChat
                  onSendMessage={handleTextMessage}
                  isProcessing={isProcessing || isPlayingAudio || isTranscribing}
                  theme={theme}
                  disabled={false}
                  externalValue={externalInput}
                  onExternalValueConsumed={() => setExternalInput('')}
                />
              </div>
            )}

            {showConversationModal && (
              <div
                className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)' }}
                onClick={() => setShowConversationModal(false)}
              >
                <div
                  className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
                    theme === 'dark' ? 'bg-slate-900 border border-emerald-500/30' : 'bg-white border border-emerald-200'
                  }`}
                  onClick={e => e.stopPropagation()}
                >
                  <div className={`flex items-center justify-between px-5 py-3 border-b ${
                    theme === 'dark' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-emerald-100 bg-emerald-50'
                  }`}>
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      Última conversa
                    </span>
                    <button
                      onClick={() => setShowConversationModal(false)}
                      className={`text-lg font-bold leading-none ${theme === 'dark' ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                    >✕</button>
                  </div>
                  {lastTranscript && (
                    <div className={`px-5 py-4 ${theme === 'dark' ? 'bg-emerald-500/5' : 'bg-white'}`}>
                      <div className={`flex items-start gap-2 mb-1 text-xs font-semibold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-emerald-500/60' : 'text-emerald-600/60'
                      }`}>
                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Você disse
                      </div>
                      <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}`}>{lastTranscript}</p>
                    </div>
                  )}
                  {lastTranscript && lastResponse && (
                    <div className={`mx-5 h-px ${theme === 'dark' ? 'bg-emerald-500/15' : 'bg-emerald-100'}`} />
                  )}
                  {lastResponse && (
                    <div className={`px-5 py-4 ${theme === 'dark' ? 'bg-emerald-500/5' : 'bg-white'}`}>
                      <div className={`flex items-start gap-2 mb-1 text-xs font-semibold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-emerald-500/60' : 'text-emerald-600/60'
                      }`}>
                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Resposta
                      </div>
                      <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}`}>{lastResponse}</p>
                    </div>
                  )}
                  <div className={`px-5 py-2 text-center text-xs border-t ${
                    theme === 'dark' ? 'border-emerald-500/20 text-white/25' : 'border-emerald-100 text-gray-400'
                  }`}>
                    Fecha automaticamente em 5s
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ActionModals
        activeModal={activeModal}
        onClose={handleCloseModal}
        theme={theme}
        onConfirmPix={handleConfirmPixLocal}
        onCancelPix={handleCancelPixLocal}
        playText={playText}
      />
    </div>
  );
}
