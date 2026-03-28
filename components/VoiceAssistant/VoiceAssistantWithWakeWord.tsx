'use client';

// ============================================================
// VoiceAssistantWithWakeWord.tsx  ← ORQUESTRADOR PRINCIPAL
// Caminho: components/assistant/VoiceAssistant/VoiceAssistantWithWakeWord.tsx
//
// CORREÇÕES desta versão:
// - Push-to-talk usa useVoiceRecorder + /api/voice/transcribe
//   (sem depender do VAD do GoogleSpeechWebSocket)
// - Wake word continua via GoogleSpeechWebSocket normalmente
// - activeModal (state unificado) substitui modais individuais
// - ActionModals.tsx usado no lugar dos condicionais individuais
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { AvatarFace } from '@/components/AvatarFace';
import FunctionCarousel from '@/components/assistant/FunctionCarousel';
import TextInputChat from '@/components/VoiceAssistant/TextInputChat';
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';
import { VoiceCommandProcessor } from '@/lib/voice-command-processor';
import { getFunctionByKey } from '@/lib/functions-registry';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { handleCriarLembrete, handleCronometro, handleTemporizador, handleRelogioMundial, handleAlarme } from './handlers/utilitiesHandlers';
import { useLembreteWatcher } from './hooks/useLembreteWatcher';
import { handleWifiQRCode, handleCardapio, handleCadastro, handleNossoQRCode } from '@/components/VoiceAssistant/handlers/companyHandlers';
import { resolvePendingPaymentChoice } from '@/lib/paymentGatewayEntries';
import { useGroqContext } from '@/hooks/useGroqContext';

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

import {
  handleLerQRCode,
  handleLerCodigoBarras,
  handleValidarCupom,
  handleImagemEmTexto,
  handleTabelaEmTexto,
  handleContratoEmTexto,
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
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(true);
  const [showStartButton, setShowStartButton] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [externalInput, setExternalInput] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

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
  const groqContextRef = useGroqContext(companyId);

  // ── Push-to-talk: gravação direta via MediaRecorder ────────
  const voiceRecorder = useVoiceRecorder();

  // Wrap de playText para capturar lastResponse automaticamente
  const playText = (text: string) => {
    if (text && text.trim()) {
      setLastResponse(text.trim());
    }
    return _playText(text);
  };

  useLembreteWatcher({
    setActiveModal,
    playText,
    companyId,
  });

  // ── Timer 30s para sumir card de conversa ─────────────────
  useEffect(() => {
    if (!lastTranscript && !lastResponse) return;
    setShowLastConversation(true);
    if (conversationTimerRef.current) clearTimeout(conversationTimerRef.current);
    conversationTimerRef.current = setTimeout(() => {
      setShowLastConversation(false);
      conversationTimerRef.current = null;
    }, 30000);
    return () => {
      if (conversationTimerRef.current) clearTimeout(conversationTimerRef.current);
    };
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
  const { companyId: cId, valorCents, produto, quantidade, opcoes } = event.detail;
  // Reutiliza o mesmo fluxo do PIX existente
  // Dispara handlePixCommand com o valor pré-definido
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
// No cleanup do useEffect:
// window.removeEventListener('verProdutoPix', handleVerProdutoPix);

const handleExternalFunctionClick = (event: any) => {
  handleFunctionClick(event.detail.functionKey, event);  // ← passa event inteiro
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

// Auto-start: inicia o assistente automaticamente após wake word + permissão estarem prontos
useEffect(() => {
  if (!companyWakeWord || !permissionGranted) return;
  const timer = setTimeout(() => {
    handleStart();
  }, 800);
  return () => clearTimeout(timer);
}, [companyWakeWord, permissionGranted]);

  // ── Google Speech (wake word) ─────────────────────────────
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
    if (isInputModalOpen) {
      console.log(`🚫 Bloqueio de Contexto: Modal ${activeModal?.type} aberto. Listener global suspenso.`);
      return;
    }

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
              // ✅ Detecta wake word em tempo real nos parciais
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

  // ── Push-to-talk: transcrição via API ─────────────────────
  const transcribeAndSetInput = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
      });

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (!response.ok) throw new Error('Erro na transcrição');
      const { text } = await response.json();

      if (text && text.trim()) {
        console.log('🎤 Push-to-talk transcrito:', text);
        setExternalInput(text.trim());
      } else {
        console.log('⚠️ Push-to-talk: nenhuma fala detectada');
      }
    } catch (err) {
      console.error('❌ Erro ao transcrever push-to-talk:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── Push-to-talk handlers ─────────────────────────────────
  const handleMicButtonDown = async () => {
    if (!permissionGranted || isProcessing || isPlayingAudio || isTranscribing) return;
    console.log('🎙️ Push-to-talk: iniciando gravação');
    // Para o Google Speech (wake word) durante a gravação
    shouldProcessAudio.current = false;
    await stopGoogleSpeech();
    setIsListening(true);
    await voiceRecorder.startRecording();
  };

  const handleMicButtonUp = async () => {
    if (!voiceRecorder.isRecording) return;
    console.log('🎙️ Push-to-talk: parando gravação');
    setIsListening(false);
    try {
      const audioBlob = await voiceRecorder.stopRecording();
      await transcribeAndSetInput(audioBlob);
    } catch (err) {
      console.error('❌ Erro no push-to-talk:', err);
    } finally {
      // Reativa o Google Speech (wake word)
      shouldProcessAudio.current = true;
      setTimeout(async () => {
        if (isActiveRef.current) await startGoogleSpeech();
      }, 300);
    }
  };

  // ── Handler de fechamento unificado ───────────────────────
  const handleCloseModal = async () => {
    console.log('🎯 Fechando modal e liberando contexto de voz');

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    setIsPlayingAudio(false);
    setActiveModal(null);

    if (googleSpeechRef.current) {
      await googleSpeechRef.current.stopRecording();
    }

    setTimeout(async () => {
      if (isActiveRef.current) {
        console.log('🔄 Reativando listener global...');
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
    setActiveModal(null);
    setShowConversationModal(false);

    processingQuestion.current = false;
    shouldProcessAudio.current = true;
    activeFunctionContextRef.current = null;

    console.log('✅ Parado');

    setTimeout(async () => {
      if (isActiveRef.current) await startGoogleSpeech();
    }, 500);
  }

  // ── Transcript handler (wake word) ────────────────────────
  async function handleGoogleTranscript(text: string, isFinal: boolean) {
    if (!text || !isActiveRef.current || !shouldProcessAudio.current) return;

    const lowerText = text.toLowerCase().trim();

    // ✅ 1. INTERCEPTAR STOPS
    if (isFinal && detectStopCommand(lowerText)) {
      if (isPlayingAudio || isSpeaking || isProcessing || activeModal !== null) {
        console.log('🛑 Stop command interceptado antes da wake word:', lowerText);
        stopEverything();
        return;
      }
    }

    // ✅ 2. INTERCEPTAR CONTROLES DE FUNÇÃO
    const CONTROL_COMMANDS = [
      {
        triggers: ['finalizar cronômetro', 'parar cronômetro', 'finalizar contagem', 'parar contagem'],
        action: () => window.dispatchEvent(new Event('eai:cronometro:stop')),
      },
    ];
    for (const cmd of CONTROL_COMMANDS) {
      if (cmd.triggers.some(t => lowerText.includes(t))) {
        if (!isFinal) return;
        cmd.action();
        return;
      }
    }

    // ✅ INTERCEPTAR ESCOLHA DE MÉTODO DE PAGAMENTO
    if (isFinal) {
      const resolved = await resolvePendingPaymentChoice(lowerText, setActiveModal, playText);
      if (resolved) {
        processingQuestion.current = false;
        setTimeout(async () => {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
        }, 500);
        return;
      }
    }

    // ✅ 3. VERIFICA WAKE WORD
    const wakeWordResult = wakeWordDetectorRef.current?.detect(lowerText);

    if (!wakeWordResult?.detected) {
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

    // Feedback visual instantâneo — azul por 1.5s
    setIsWakeWordDetected(true);
    setTimeout(() => setIsWakeWordDetected(false), 1500);

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
  async function handleFunctionClick(functionKey: string, event?: any) {
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

        case 'tocar_video':
          await stopGoogleSpeech();
          setActiveModal({
            type: 'TocarVideoDisplay',
            data: { companyId, query: '' },
          });
          playText('Qual vídeo você quer assistir? Me diga o assunto.').catch(() => {});
          break; 

        case 'meu_sistema':
          await stopGoogleSpeech();
          setActiveModal({ type: 'MeuSistemaDisplay', data: { companyId } });
          playText('Sou min I A, uma IA pra chamar de sua! Sou um funcionário de Voz e texto com Inteligência Artificial. Escaneie o QR Code para saber mais. minhai.app').catch(() => {});
          break;

case 'minha_conta':
  await stopGoogleSpeech();
  setActiveModal({
    type: 'LoginClienteDisplay',
    data: { companyId, slug: slug ?? '' },
  });
  playText(
    profile
      ? `Olá ${profile.nome}! Sua conta está aberta.`
      : 'Abrindo sua conta. Faça login ou crie uma nova conta.'
  ).catch(() => {});
  return;

        case 'consultar_cambio':
          setActiveModal?.({ type: 'CotacaoMoedasDisplay', data: { companyId } });
          break;

        case 'consultar_cep':
          setActiveModal?.({ type: 'ConsultarCEPDisplay', data: { companyId } });
          break;

        case 'consultar_cnpj':
          setActiveModal?.({ type: 'ConsultarCnpjModal', data: { companyId } });
          break;

        case 'consultar_cpf':
          setActiveModal?.({ type: 'ConsultarCpfModal', data: { companyId } });
          break;

        case 'restricoes_cpf':
          setActiveModal?.({ type: 'RestricoesCPFDisplay', data: { companyId } });
          break;

        case 'restricoes_cnpj':
          setActiveModal?.({ type: 'RestricoesCNPJDisplay', data: { companyId } });
          break;

        case 'consultar_feriados':
          setActiveModal?.({ type: 'FeriadosNacionaisDisplay', data: { companyId } });
          break;

        case 'consultar_ddd':
          setActiveModal?.({ type: 'ConsultarDDDDisplay', data: { companyId } });
          break;

        case 'consultar_placa':
          setActiveModal?.({ type: 'ConsultarPlacaModal', data: { companyId } });
          break;

        case 'consultar_leilao':
          setActiveModal?.({ type: 'ConsultarLeilaoModal', data: { companyId } });
          break;

        case 'cadastro':
          await handleCadastro({ companyId, setIsProcessing, setActiveModal });
          break;

case 'identificar_fraude':
  setActiveModal({
    type: 'IdentificarFraudeDisplay',
    data: { companyId },
  });
  await saveInteractionToHistory(
    companyId,
    'Identificar Fraude',
    'Análise de fraude iniciada'
  );
  playText('Modo de identificação de fraude. Escolha imagem para fotografar ou link para analisar um site.').catch(() => {});
  break;

        case 'enviar_arquivo':
          await stopGoogleSpeech();
          setActiveModal({ type: 'EnviarArquivoDisplay', data: { companyId } });
          playText('Você pode enviar um arquivo diretamente para a empresa, que já recebem na hora!').catch(() => {});
          break;

        case 'gerar_qrcode':
          await stopGoogleSpeech();
          setActiveModal({ type: 'GerarQRCodeDisplay', data: { companyId } });
          playText('Abrindo gerador de QR Code. Diga ou digite o texto ou link.').catch(() => {});
          break;

        case 'gerar_codigo_barras':
          await stopGoogleSpeech();
          setActiveModal({ type: 'GerarCodigoBarrasDisplay', data: { companyId } });
          playText('Abrindo gerador de código de barras. Escolha o formato e diga o conteúdo.').catch(() => {});
          break;

case 'tocar_musica':
  setActiveModal({
    type: 'TocarMusicaDisplay',
    data: { companyId, query: '' },
  });
  playText('Qual música você quer ouvir?').catch(() => {});
  break;

case 'playlist':
  setActiveModal({ type: 'PlaylistDisplay', data: { companyId } });
  playText('Abrindo playlist...').catch(() => {});
  break;

case 'porta_retrato':
  setActiveModal({ type: 'PortaRetratoDisplay', data: { companyId } });
  playText('Abrindo porta retrato...').catch(() => {});
  break;

case 'painel_ofertas':
  setActiveModal({ type: 'PainelOfertasDisplay', data: { companyId } });
  playText('Abrindo painel de ofertas...').catch(() => {});
  break;

case 'aparelhos_smart':
  setActiveModal({ type: 'AparelhosSmartDisplay', data: { companyId, transcript: '' } });
  playText('Abrindo controle de dispositivos...').catch(() => {});
  break;

        case 'confirmar_presenca':
          setActiveModal({ type: 'ConfirmPresenceModal', data: { companyId } });
          playText('Vou buscar seu agendamento para confirmar presença.').catch(() => {});
          break;

        case 'reagendar_compromisso':
          setActiveModal({ type: 'RescheduleModal', data: { companyId } });
          playText('Vou buscar seu agendamento para reagendar.').catch(() => {});
          break;

        case 'cancelar_agendamento':
          setActiveModal({ type: 'CancelAppointmentModal', data: { companyId } });
          playText('Vou buscar seu agendamento para cancelar.').catch(() => {});
          break;

        case 'horarios_disponiveis':
          break;

        case 'meu_cupom': {
          await stopGoogleSpeech();
          setActiveModal({ type: 'MeuCupomDisplay', data: { companyId, prefillName: '' } });
          await playText('Digite seu nome para gerar seu cupom de indicação.');
          break;
        }

        case 'ler_qrcode':
          await stopGoogleSpeech();
          await handleLerQRCode({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'ler_codigo_barras':
          await stopGoogleSpeech();
          await handleLerCodigoBarras({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'validar_cupom':
          await stopGoogleSpeech();
          await handleValidarCupom({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'imagem_em_texto':
          await stopGoogleSpeech();
          await handleImagemEmTexto({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'tabela_em_texto':
          await stopGoogleSpeech();
          await handleTabelaEmTexto({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'contrato_em_texto':
          await stopGoogleSpeech();
          await handleContratoEmTexto({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'wifi_qrcode':
          await stopGoogleSpeech();
          await handleWifiQRCode({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'canal_youtube':
          await stopGoogleSpeech();
          await handleCanalYoutube({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'cardapio':
          await stopGoogleSpeech();
          await handleCardapio({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'nosso_qrcode':
          await stopGoogleSpeech();
          await handleNossoQRCode({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'nossa_marca':
          await stopGoogleSpeech();
          await handleNossaMarcaCommand({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'endereco':
          await stopGoogleSpeech();
          await handleEnderecoCommand({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'video_instrucoes':
          await stopGoogleSpeech();
          await handleVideoInstrucoesCommand({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'sequencia_videos':
          await stopGoogleSpeech();
          await handleSequenciaVideosCommand({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'enviar_email':
          await stopGoogleSpeech();
          setActiveModal({ type: 'SendEmailModal', data: { companyId } });
          playText('Diga o conteúdo e quando acabar, diga CONCLUIR.').catch(() => {});
          break;

        case 'fichas_producao_conversacional':
          await stopGoogleSpeech();
          stopAudioImmediately();
          setActiveModal({
            type: 'FichaProducaoConversacionalDisplay',
            data: { companyId, fichaType: 'produto' },
          });
          break;

        case 'agendar_compromisso':
          await stopGoogleSpeech();
          setActiveModal({
            type: 'CreateEventModal',
            data: { companyId, prefilledData: {} },
          });
          playText('Posso te marcar na agenda, basta me dizer qual o dia, mês, hora e seu nome.').catch(() => {});
          break;

        case 'ver_agenda':
          setActiveModal({
            type: 'ViewAgendaModal',
            data: { companyId, initialView: 'month' },
          });
          playText('Abrindo o calendário.').catch(() => {});
          break;

        case 'criar_lembrete':
          await handleCriarLembrete({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'cronometro':
          await handleCronometro({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'temporizador':
          await playText('Qual o tempo do temporizador? Por exemplo: 5 minutos, 30 segundos.');
          break;

        case 'relogio_mundial':
          await handleRelogioMundial({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'alarme':
          await handleAlarme({ companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'cobrar_debito':
          await stopGoogleSpeech();
          playText('Pode me dizer o valor para cobrar no débito.').catch(() => {});
          break;

        case 'cobrar_credito':
          await stopGoogleSpeech();
          playText('Pode me dizer o valor para cobrar no crédito.').catch(() => {});
          break;

        case 'link_pagamento':
          await stopGoogleSpeech();
          playText('Posso gerar um Link de Pagamento, basta pedir um Link com o valor.').catch(() => {});
          break;

        case 'nfc_credito':
          await stopGoogleSpeech();
          playText('Posso gerar uma Cobrança no Cartão de Crédito via NFC, basta pedir uma cobrança NFC crédito e o valor.').catch(() => {});
          break;

        case 'nfc_debito':
          await stopGoogleSpeech();
          playText('Posso gerar uma Cobrança no Cartão de Débito via NFC, basta pedir uma cobrança NFC débito e o valor.').catch(() => {});
          break;

        case 'tef_debito':
          await stopGoogleSpeech();
          playText('Posso cobrar no débito direto na maquininha Point. Basta pedir uma cobrança TEF débito com o valor.').catch(() => {});
          break;

        case 'tef_credito':
          await stopGoogleSpeech();
          playText('Posso cobrar no crédito direto na maquininha Point, à vista ou parcelado. Basta pedir uma cobrança TEF crédito com o valor.').catch(() => {});
          break;

        case 'clima_tempo':
          await stopGoogleSpeech();
          setActiveModal({
            type: 'ClimaTempoDisplay',
            data: { companyId, city: null },
          });
          playText('Consultando o clima agora...').catch(() => {});
          break;

case 'cadastrar_produto':
  await stopGoogleSpeech();
  setActiveModal({
    type: 'CadastrarProdutoDisplay',
    data: { companyId },
  });
  playText('Vou te guiar no cadastro do produto. Qual o nome?').catch(() => {});
  return; // pula o registerFunctionUsage — cobrado só quando salvar

case 'modo_venda':
  await stopGoogleSpeech();
  setActiveModal({
    type: 'SaleModeModal',
    data: {
      companyId,
      produtoInicial:   (event?.detail?.produtoInicial)   ?? undefined,  // ← NOVO
      quantidadeInicial:(event?.detail?.quantidadeInicial) ?? undefined,  // ← NOVO
      opcoesIniciais:   (event?.detail?.opcoesIniciais)   ?? undefined,  // ← NOVO
      isListening, isProcessing, isPlayingAudio, isTranscribing,
      onMicDown: handleMicButtonDown,
      onMicUp:   handleMicButtonUp,
      onTextMessage: handleTextMessage,
    },
  });
  playText('Modo venda aberto!').catch(() => {});
  break;

        case 'ver_produtos':
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

    setLastTranscript(clean);
    processQuestion(clean);
  }

  async function processQuestion(questionText: string) {
    console.log('⚡ Processando:', questionText);

    shouldProcessAudio.current = false;
    await stopGoogleSpeech();

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
      setActiveModal,
      activeFunctionContextRef,
      groqContextRef, 
    });

    if (isCommand) {
      processingQuestion.current = false;
      setTimeout(async () => {
        shouldProcessAudio.current = true;
        await startGoogleSpeech();
      }, 500);
      return;
    }

    setIsProcessing(true);

    try {
      const startTime = Date.now();
      const formData = new FormData();
      const textBlob = new Blob([questionText], { type: 'text/plain' });
      formData.append('audio', textBlob, 'question.txt');
      formData.append('companyId', companyId);
      if (activeModal?.type === 'SaleModeModal') {
        formData.append('saleMode', 'true');
      }
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

      const responseTextHeader = response.headers.get('X-Response-Text');
      if (responseTextHeader) {
        setLastResponse(decodeURIComponent(responseTextHeader));
      }

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
    if (message.trim()) setLastTranscript(message.trim());

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
if (responseTextHeader) {
  setLastResponse(decodeURIComponent(responseTextHeader));
}

// ✅ ADICIONAR AQUI — antes do if (!response.ok)
const hintFunctionKey = response.headers.get('X-Function-Key');
if (hintFunctionKey) {
  console.log('🎯 Hint ativou função via header:', hintFunctionKey);
  clearTimeout(feedbackTimeout);
  setIsProcessing(false);
  processingQuestion.current = false;
  handleFunctionClick(hintFunctionKey);
  setTimeout(async () => {
    shouldProcessAudio.current = true;
    await startGoogleSpeech();
  }, 500);
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
    if (!hasMicrophone) return 'Modo de voz indisponível';
    if (!permissionGranted) return 'Aguardando permissão de voz...';
    if (isTranscribing) return 'Transcrevendo...';
    if (isPlayingAudio) return 'Falando...';
    if (isProcessing) return 'Processando...';
    const primaryWakeWord = companyWakeWord?.split(',')[0].trim();
    return primaryWakeWord ? `diga: "${primaryWakeWord}" + sua solicitação` : 'Aguarde...';
  };

  const getMicButtonColor = () => {
    if (voiceRecorder.isRecording) return 'bg-red-500 animate-pulse';
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
    return 'segure para falar ou';
  };

  // ── RENDER: MAXIMIZED ─────────────────────────────────────
  if (isMaximized) {
    return (
      <div className="flex flex-col items-center gap-2 md:gap-3 w-full">
        {isSpeaking && (
          <button onClick={stopEverything} className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all">
            🛑 PARAR
          </button>
        )}

        <div
          className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 cursor-pointer select-none"
          onMouseDown={handleMicButtonDown}
          onMouseUp={handleMicButtonUp}
          onTouchStart={handleMicButtonDown}
          onTouchEnd={handleMicButtonUp}
        >
          {/* Anel vermelho pulsante ao gravar */}
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
            onCopyQRCode={() => console.log('📋 QR Code copiado!')}
            onConfirmPix={handleConfirmPixLocal}
            onCancelPix={handleCancelPixLocal}
            isHidden={activeModal !== null}
          />
        </div>

        {!showStartButton && (
          <p className={`text-sm font-medium -mt-6 ${
            theme === 'dark' ? 'text-white/40' : 'text-gray-400'
          }`}>
            {voiceRecorder.isRecording ? 'solte para enviar...' : isTranscribing ? 'transcrevendo...' : 'clique em mim para falar ou'}
          </p>
        )}

        <div className="text-center px-4 max-w-md">
          <p className={`text-lg sm:text-xl md:text-2xl font-bold mb-2 whitespace-nowrap ${
            theme === 'dark' ? 'text-white/50' : 'text-gray-900/50'
          }`}>
            {getStatusMessage()}
          </p>

          {/* Aviso de ruído — aparece abaixo do status, sem deslocar o layout */}
          <div className={`mt-2 transition-all duration-300 ${
            (repromptWarning || noiseWarning) ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <span className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              theme === 'dark'
                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {repromptWarning
                ? 'Não consegui entender — pode repetir?'
                : 'Ambiente ruidoso — fale mais perto do microfone'}
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
      <div className="grid md:grid-cols-2 gap-8">

        {/* Card esquerdo: Avatar */}
        <div className={`rounded-3xl shadow-2xl p-8 border relative overflow-hidden transition-colors ${
          theme === 'dark' ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'
          }`}
          onClick={() => window.dispatchEvent(new CustomEvent('eai:avatarClick'))}
          title="Clique para expandir"
        >
          {isSpeaking && (
            <button onClick={stopEverything} className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all z-10">
              🛑 PARAR
            </button>
          )}
          <div
            className="relative h-96 cursor-pointer"
            onClick={() => window.dispatchEvent(new CustomEvent('eai:setMaximized', { detail: { value: true } }))}
            title="Clique para expandir"
          >
            <AvatarFace
              isListening={isListening}
              isSpeaking={isPlayingAudio}
              isProcessing={isProcessing}
              isWakeWordDetected={isWakeWordDetected}
              theme={theme}
              qrCodeData={qrCodeData}
              pixConfirmationData={pixConfirmationData}
              onCloseQRCode={() => setQrCodeData(null)}
              onCopyQRCode={() => console.log('📋 QR Code copiado!')}
              onConfirmPix={handleConfirmPixLocal}
              onCancelPix={handleCancelPixLocal}
              isHidden={activeModal !== null}
            />
          </div>
        </div>

        {/* Card direito: Status / Microfone */}
        <div className={`rounded-3xl shadow-2xl p-8 border transition-colors h-[448px] flex flex-col overflow-hidden ${
          theme === 'dark' ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col items-center flex-1 min-h-0">

            {/* Botão de microfone push-to-talk */}
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
                {hasMicrophone && permissionGranted ? (
                  <Mic className="w-[51px] h-[51px] text-white" />
                ) : (
                  <MicOff className="w-[51px] h-[51px] text-white opacity-50" />
                )}
              </button>
            </div>

            {!showStartButton && (
              <p className={`text-xs font-medium mt-1 ${
                theme === 'dark' ? 'text-white/40' : 'text-gray-400'
              }`}>
                {getMicHintText()}
              </p>
            )}

            {/* Status */}
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

            {/* Área inferior: cards + TextInput */}
            {!showStartButton && (
              <div className="w-full min-w-0 overflow-hidden mt-auto flex flex-col gap-0.5">

                {/* Card aviso de ruído / reprompt */}
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

                {/* Card pergunta + resposta */}
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

                {/* TextInput */}
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

            {/* Modal de conversa completa */}
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
                      <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}`}>
                        {lastTranscript}
                      </p>
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
                      <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}`}>
                        {lastResponse}
                      </p>
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
