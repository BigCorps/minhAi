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
import { handleCriarLembrete, handleCronometro, handleTemporizador, handleRelogioMundial, handleAlarme } from './handlers/utilitiesHandlers';
import { useLembreteWatcher } from './hooks/useLembreteWatcher';
import { handleWifiQRCode, handleCardapio, handleNossoQRCode } from '@/components/VoiceAssistant/handlers/companyHandlers';

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
  requestCameraPermission,    // ← adicionar
  requestLocationPermission,  // ← adicionar
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
  const [lastTranscript, setLastTranscript] = useState<string>("");
  const [lastResponse, setLastResponse] = useState<string>("");
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
  const { currentAudioRef, feedbackAudioRef, playText: _playText, stopAudioImmediately } = useAudioPlayer(setIsPlayingAudio);
  const isMobile = useIsMobile();

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

  // ── Inicialização ─────────────────────────────────────────
  useEffect(() => {
    isActiveRef.current = true;

    requestMicrophonePermission().then(granted => {
      setPermissionGranted(granted);
      if (!granted) setError('Permissão do microfone negada.');
    });

    requestCameraPermission().catch(() => {});    // ← já adicionado antes
    requestLocationPermission().catch(() => {});

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

    // ✅ BLOQUEIO DE CONTEXTO: Se houver um modal de entrada de dados aberto,
    // não iniciamos o listener global para evitar conflitos de áudio.
    const isInputModalOpen = 
      activeModal?.type === 'SendEmailModal' || 
      activeModal?.type === 'CreateEventModal' ||
      activeModal?.type === 'NossaMarcaDisplay' ||  
      activeModal?.type === 'EnderecoDisplay' ||   
      activeModal?.type === 'MeuSistemaDisplay' || 
      activeModal?.type === 'VideoInstrucoesDisplay' ||
      activeModal?.type === 'MeuCupomDisplay' ||
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
    console.log('🎯 Fechando modal e liberando contexto de voz');
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    setIsPlayingAudio(false);
    setActiveModal(null);
    
    // Garantir que qualquer gravação residual seja parada
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
    setActiveModal(null); // ✅ fecha qualquer modal aberto
    setShowConversationModal(false);

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

  // ✅ 1. INTERCEPTAR STOPS — antes de qualquer filtro
  if (isFinal && detectStopCommand(lowerText)) {
    if (isPlayingAudio || isSpeaking || isProcessing || activeModal !== null) {
      console.log('🛑 Stop command interceptado antes da wake word:', lowerText);
      stopEverything();
      return;
    }
  }

  // ✅ 2. INTERCEPTAR CONTROLES DE FUNÇÃO (cronômetro, etc.)
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

  // ✅ 3. SÓ AGORA verifica wake word
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
  // ✅ PARA ADICIONAR NOVA FUNÇÃO: adicione um  no switch abaixo.
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
          await stopGoogleSpeech();
          setActiveModal({ type: 'MeuSistemaDisplay', data: { companyId } });
          playText('E A I, sou um funcionário de Voz com Inteligência Artificial. Escaneie o QR Code para saber mais. eai.app.br').catch(() => {});
          break;

case 'enviar_arquivo':
  await stopGoogleSpeech();
  setActiveModal({
    type: 'EnviarArquivoDisplay',
    data: { companyId },
  });
  playText('Você pode enviar um arquivo diretamente para a empresa, que já recebem na hora!').catch(() => {});
  break;

case 'gerar_qrcode':
  await stopGoogleSpeech();
  setActiveModal({
    type: 'GerarQRCodeDisplay',
    data: { companyId },
  });
  playText('Abrindo gerador de QR Code. Diga ou digite o texto ou link.').catch(() => {});
  break;

case 'gerar_codigo_barras':
  await stopGoogleSpeech();
  setActiveModal({
    type: 'GerarCodigoBarrasDisplay',
    data: { companyId },
  });
  playText('Abrindo gerador de código de barras. Escolha o formato e diga o conteúdo.').catch(() => {});
  break;

case 'confirmar_presenca':
  setActiveModal({ 
    type: 'ConfirmPresenceModal', 
    data: { companyId }
  });
  playText('Vou buscar seu agendamento para confirmar presença.').catch(() => {});
  break;

case 'reagendar_compromisso':
  setActiveModal({ 
    type: 'RescheduleModal', 
    data: { companyId }
  });
  playText('Vou buscar seu agendamento para reagendar.').catch(() => {});
  break;

case 'cancelar_agendamento':
  setActiveModal({ 
    type: 'CancelAppointmentModal', 
    data: { companyId }
  });
  playText('Vou buscar seu agendamento para cancelar.').catch(() => {});
  break;

case 'horarios_disponiveis':
  // Este é tratado direto no handler do registry
  break;

case 'meu_cupom': {
  await stopGoogleSpeech();
  // Tenta extrair nome do transcript global (se vier de comando de voz)
  // Se vier do botão do carrossel, prefillName fica vazio e o modal pede
  setActiveModal({
    type: 'MeuCupomDisplay',
    data: { companyId, prefillName: '' },
  });
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
          await handleVideoInstrucoesCommand({ 
            companyId, setIsProcessing, setActiveModal, playText });
          break;

        case 'sequencia_videos':
          await stopGoogleSpeech();
          await handleSequenciaVideosCommand({ companyId, setIsProcessing, setActiveModal, playText });
          break;  

        case 'enviar_email':
          // ✅ Abre modal de envio de email
          await stopGoogleSpeech(); // Para o listener global
          setActiveModal({ 
            type: 'SendEmailModal', 
            data: { companyId } 
          });
          playText('Diga o conteúdo e quando acabar, diga CONCLUIR.').catch(() => {});
          break;

case 'fichas_producao_conversacional':
  await stopGoogleSpeech();
  stopAudioImmediately();
  setActiveModal({
    type: 'FichaProducaoConversacionalDisplay',
    data: {
      companyId,
      fichaType: 'produto',
    },
  });
  break;

case 'agendar_compromisso':
  // ✅ Abre modal de criar evento no calendário
  await stopGoogleSpeech(); // Para o listener global
  setActiveModal({ 
    type: 'CreateEventModal', 
    data: { 
      companyId,
      prefilledData: {} // Vazio quando vem do botão
    } 
  });
  playText('Posso te marcar na agenda, basta me dizer qual o dia, mês, hora e seu nome.').catch(() => {});
  break;

case 'ver_agenda':
  // ✅ Abre modal de visualizar agenda
  // Quando vem do botão, abre padrão no mês
  setActiveModal({ 
    type: 'ViewAgendaModal', 
    data: { 
      companyId,
      initialView: 'month' // padrão quando vem do botão
    } 
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
          
case 'link_pagamento':
  await stopGoogleSpeech();
  playText('Posso gerar um Link de Pagamento, basta pedir um Link com o valor.').catch(() => {});
  break;

case 'nfc_credito':
  await stopGoogleSpeech();
  playText('Posso gerar uma Cobrança no Cartão de Crédito via NFC, basta pedir uma cobrança no crédito e o valor.').catch(() => {});
  break;

case 'nfc_debito':
  await stopGoogleSpeech();
  playText('Posso gerar uma Cobrança no Cartão de Débito via NFC, basta pedir uma cobrança no débito e o valor.').catch(() => {});
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

      // Capturar texto da resposta se o servidor enviar no header
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

      // Capturar texto da resposta se o servidor enviar no header
      const responseTextHeader = response.headers.get('X-Response-Text');
      if (responseTextHeader) {
        setLastResponse(decodeURIComponent(responseTextHeader));
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

        <div className="text-center px-4 max-w-md">
  <p className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 ${
    theme === 'dark' ? 'text-white/50' : 'text-gray-900/50'
  }`}>
    {getStatusMessage()}
  </p>
  {error && <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-red-400/50' : 'text-red-600/50'}`}>{error}</p>}
</div>

{/* Avisos — abaixo do status */}
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
        {/* h-[384px] = mesma altura que o card esquerdo (h-96 = 384px) + padding p-8 */}
        <div className={`rounded-3xl shadow-2xl p-8 border transition-colors h-[448px] flex flex-col overflow-hidden ${
          theme === 'dark' ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col items-center flex-1 min-h-0">

            {/* Ícone de microfone */}
            <div className="relative flex items-center justify-center mt-2">
              <div className={`w-32 h-32 rounded-full ${getStatusColor()} flex items-center justify-center transition-all shadow-lg`}>
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>

            {/* Status */}
            <div className="text-center w-full mt-4">
              <p className={`text-xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getStatusMessage()}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}`}>
                No modo voz, utilize a palavra de ativação
              </p>
            </div>

            {error && (
              <div className={`w-full mt-3 p-3 rounded-xl border-2 ${
                theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {showStartButton && permissionGranted && (
              <button onClick={handleStart} className="mt-6 px-8 py-4 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-xl hover:from-blue-700 hover:to-green-600 transition font-bold shadow-xl text-lg">
                Iniciar Assistente
              </button>
            )}

            {/* ── Área inferior fixa: cards + TextInput ── */}
            {!showStartButton && (
              <div className="w-full min-w-0 overflow-hidden mt-auto flex flex-col gap-0.5">

                {/* Card aviso de ruído / reprompt (azul) — sempre reserva espaço */}
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

                {/* Card pergunta + resposta (verde) — clicável, abre modal */}
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
                  {/* Linha: pergunta */}
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
                  {/* Divisor interno quando tem os dois */}
                  {lastTranscript && lastResponse && (
                    <div className={`mx-3 h-px ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-200/60'}`} />
                  )}
                  {/* Linha: resposta */}
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

                {/* TextInput por último */}
                <TextInputChat
                  onSendMessage={handleTextMessage}
                  isProcessing={isProcessing || isPlayingAudio}
                  theme={theme}
                  disabled={false}
                />
              </div>
            )}

            {/* ── Modal de conversa completa ── */}
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
                  {/* Header */}
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
                  {/* Pergunta */}
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
                  {/* Divisor */}
                  {lastTranscript && lastResponse && (
                    <div className={`mx-5 h-px ${theme === 'dark' ? 'bg-emerald-500/15' : 'bg-emerald-100'}`} />
                  )}
                  {/* Resposta */}
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
                  {/* Footer countdown */}
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

      {/* ✅ ActionModals — UMA linha substitui todos os condicionais de modal */}
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
