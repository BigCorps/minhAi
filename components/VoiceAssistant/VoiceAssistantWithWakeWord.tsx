'use client';

import { useState, useEffect, useRef } from 'react';
import { AvatarFace } from '@/components/AvatarFace';
import { WakeWordDetector } from './WakeWordDetector';
import QRCodeDisplay from '@/components/assistant/QRCodeDisplay';
import PIXConfirmationModal from '@/components/assistant/PIXConfirmationModal';
import FunctionCarousel from '@/components/assistant/FunctionCarousel';
import { createClient } from '@/lib/supabase-browser';
import TextInputChat from './TextInputChat';
import { loadVoskWithProgress } from '@/lib/vosk';
import { normalizeVoskTranscript } from '@/lib/vosk-grammar';
import { detectByContext, extractAmountFromContext } from '@/lib/voice-context-detector';

interface VoiceAssistantWithWakeWordProps {
  companyId: string;
  companyName: string;
  wakeWord: string;
  greetingMessage: string;
  theme?: 'dark' | 'light';
  isMaximized?: boolean;
  onAssistantStart?: () => void;
}

export function VoiceAssistantWithWakeWord({
  companyId,
  companyName,
  wakeWord,
  greetingMessage,
  theme = 'dark',
  isMaximized = false,
  onAssistantStart,
}: VoiceAssistantWithWakeWordProps) {
  enum AssistantState {
    LISTENING_WAKE_WORD = 'listening_wake_word',
    LISTENING_COMMAND = 'listening_command',
    PROCESSING = 'processing',
    SPEAKING = 'speaking',
  }

  const [assistantState, setAssistantState] = useState<AssistantState>(
    AssistantState.LISTENING_WAKE_WORD
  );
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  const [voskReady, setVoskReady] = useState(false);
  const [voskLoading, setVoskLoading] = useState(false);
  const [voskProgress, setVoskProgress] = useState(0);
  const [voskDownloading, setVoskDownloading] = useState(false);

  const [qrCodeData, setQrCodeData] = useState<{
    type: 'whatsapp' | 'instagram' | 'pix';
    qrCodeUrl: string;
    qrContent: string;
    displayText: string;
    amount?: string;
    companyName?: string;
  } | null>(null);

  const [pixConfirmationData, setPixConfirmationData] = useState<{
    transactionId: string;
    amount: string;
    qrCodeUrl: string;
    pixCode: string;
  } | null>(null);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(true);
  const audioUnlocked = useRef<boolean>(false);
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);
  const processingQuestion = useRef<boolean>(false);
  const conversationIdRef = useRef<string | null>(null);
  
  const voskModelRef = useRef<any>(null);
  const voskRecognizerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const wakeWords = [
    ...wakeWord.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0),
    'oi',
    'olá',
    'ola',
  ];

  const endCommands = [
    'tchau',
    'obrigado',
    'até logo',
    'encerrar',
    'finalizar',
    'pode parar',
    'pare',
    'desligar',
    'adeus',
    'valeu',
  ];

  const pixStateRef = useRef<{
    qrCodeData: any;
    pixConfirmationData: any;
  } | null>(null);

  useEffect(() => {
    pixStateRef.current = {
      qrCodeData,
      pixConfirmationData
    };
  }, [qrCodeData, pixConfirmationData]);

  useEffect(() => {
    isActiveRef.current = true;
    requestMicrophonePermission();
    
    console.log('📱 Carregando Vosk...');
    setVoskLoading(true);
    setVoskProgress(0);
    
    const timeout = setTimeout(() => {
      if (voskLoading && !voskReady) {
        console.error('⏰ Timeout ao carregar Vosk (60s)');
        setError('O carregamento está demorando muito. Verifique sua conexão e recarregue a página.');
        setVoskLoading(false);
      }
    }, 60000);
    
    loadVoskWithProgress((progress, downloading) => {
      console.log(`📊 Progresso: ${progress}% ${downloading ? '(baixando)' : '(cache)'}`);
      setVoskProgress(progress);
      setVoskDownloading(downloading);
    })
      .then(model => {
        clearTimeout(timeout);
        voskModelRef.current = model;
        setVoskReady(true);
        setVoskLoading(false);
        setVoskProgress(100);
        console.log('✅ Vosk pronto para uso!');
      })
      .catch(err => {
        clearTimeout(timeout);
        console.error('❌ Erro ao carregar Vosk:', err);
        
        const errorMsg = err.message || err.toString();
        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          setError('Modelo de voz não encontrado. Entre em contato com o suporte.');
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          setError('Erro de conexão. Verifique sua internet e recarregue a página.');
        } else {
          setError('Erro ao carregar assistente de voz. Recarregue a página.');
        }
        
        setVoskLoading(false);
        setVoskProgress(0);
      });
    
    const handleExternalFunctionClick = (event: any) => {
      const { functionKey } = event.detail;
      console.log('🎯 Evento externo recebido:', functionKey);
      handleFunctionClick(functionKey);
    };
    
    window.addEventListener('voiceAssistantFunctionClick', handleExternalFunctionClick);
    
    return () => {
      isActiveRef.current = false;
      cleanup();
      window.removeEventListener('voiceAssistantFunctionClick', handleExternalFunctionClick);
    };
  }, []);

  useEffect(() => {
    console.log('🎯 Inicializando WakeWordDetector...');
    wakeWordDetectorRef.current = new WakeWordDetector({
      keywords: wakeWords,
      threshold: 0.7,
      contextWindow: 5,
      usePhoneticMatching: true,
      excludeWords: endCommands
    });
  }, [wakeWords.join(','), endCommands.join(',')]);

  function cleanup() {
    if (voskRecognizerRef.current) {
      try {
        voskRecognizerRef.current.free();
        voskRecognizerRef.current = null;
      } catch (e) {}
    }
    
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      } catch (e) {}
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      } catch (e) {}
    }
    
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }
  }

  function unlockAudio() {
    if (audioUnlocked.current) return;
    
    console.log('🔓 Tentando unlock áudio...');
    
    try {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.volume = 0.01;
      
      const playPromise = silentAudio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            silentAudio.pause();
            audioUnlocked.current = true;
            console.log('✅ Audio unlocked!');
          })
          .catch(e => {
            console.log('⚠️ Audio unlock failed:', e.message);
            
            setTimeout(() => {
              if (!audioUnlocked.current) {
                console.log('🔄 Retry unlock...');
                unlockAudio();
              }
            }, 1000);
          });
      }
    } catch (e: any) {
      console.log('⚠️ Audio unlock error:', e.message);
    }
  }

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

  async function handleStart() {
    console.log('🚀 Iniciando assistente de voz...');
    
    unlockAudio();
    
    try {
      const testAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUB4QU6vo66lXGAo+meL0wmskBSyBzvLYiTcIGWi77OefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQU=');
      testAudio.volume = 0.01;
      await testAudio.play();
      testAudio.pause();
      console.log('✅ Contexto de áudio estabelecido');
    } catch (e) {
      console.log('⚠️ Falha no contexto de áudio');
    }
    
    setShowStartButton(false);
    
    if (onAssistantStart) {
      onAssistantStart();
    }
    
    setTimeout(() => {
      if (isActiveRef.current) {
        startVoskListening();
      }
    }, 300);
  }

  async function startVoskListening() {
    if (!voskModelRef.current) {
      setError('Erro ao iniciar assistente de voz. Recarregue a página.');
      console.error('❌ Vosk não foi carregado corretamente');
      return;
    }

    try {
      console.log('🎤 Iniciando Vosk...');
      
      const recognizer = new voskModelRef.current.KaldiRecognizer(16000);
      
      voskRecognizerRef.current = recognizer;
      
      recognizer.on('result', (message: any) => {
        const text = message.result.text;
        console.log('✅ Vosk resultado final:', text);
        handleVoskTranscript(text, true);
      });
      
      recognizer.on('partialresult', (message: any) => {
        const partial = message.result.partial;
        if (partial) {
          handleVoskTranscript(partial, false);
        }
      });
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });
      
      mediaStreamRef.current = mediaStream;
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioContext;
      
      const recognizerNode = audioContext.createScriptProcessor(4096, 1, 1);
      
      recognizerNode.onaudioprocess = (event) => {
        try {
          if (voskRecognizerRef.current && isActiveRef.current) {
            voskRecognizerRef.current.acceptWaveform(event.inputBuffer);
          }
        } catch (error) {
          console.error('❌ Erro acceptWaveform:', error);
        }
      };
      
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(recognizerNode);
      recognizerNode.connect(audioContext.destination);
      
      setIsListening(true);
      console.log('✅ Vosk ATIVO - Reconhecimento contínuo! 🎉');
      
    } catch (err: any) {
      console.error('❌ Erro ao iniciar Vosk:', err);
      setError('Erro ao acessar microfone');
    }
  }

  function handleVoskTranscript(text: string, isFinal: boolean) {
    if (!text || !isActiveRef.current) return;
    
    if (assistantState !== AssistantState.LISTENING_WAKE_WORD) {
      return;
    }
    
    const normalizedText = normalizeVoskTranscript(text);
    const lowerText = normalizedText.toLowerCase().trim();
    
    const detectionResult = wakeWordDetectorRef.current?.detect(lowerText);
    
    if (detectionResult?.detected && isFinal) {
      console.log('🎯 Wake word detectada:', detectionResult.keyword);
      console.log('📝 Texto completo:', lowerText);
      
      setAssistantState(AssistantState.LISTENING_COMMAND);
      
      playActivationBeep();
      
      startCommandListening();
    }
  }

  function startCommandListening() {
    console.log('🎤 Iniciando captura de comando via Web Speech...');
    
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ Web Speech API não suportada');
      setAssistantState(AssistantState.LISTENING_WAKE_WORD);
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    speechRecognitionRef.current = recognition;
    
    commandTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Timeout: voltando para wake word');
      stopCommandListening();
      playErrorBeep();
      setAssistantState(AssistantState.LISTENING_WAKE_WORD);
    }, 15000);
    
    recognition.onstart = () => {
      console.log('✅ Web Speech iniciado, aguardando fala...');
    };
    
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      
      console.log(`${isFinal ? '✅' : '📝'} Web Speech: "${transcript}"`);
      
      if (isFinal) {
        console.log('✅ Comando capturado completo:', transcript);
        
        if (commandTimeoutRef.current) {
          clearTimeout(commandTimeoutRef.current);
          commandTimeoutRef.current = null;
        }
        
        stopCommandListening();
        
        playProcessingBeep();
        
        setAssistantState(AssistantState.PROCESSING);
        
        processCommand(transcript);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('❌ Erro Web Speech:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('⚠️ Nenhuma fala detectada, aguardando...');
        return;
      }
      
      if (event.error === 'aborted') {
        console.log('⚠️ Reconhecimento abortado');
      }
      
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
        commandTimeoutRef.current = null;
      }
      stopCommandListening();
      playErrorBeep();
      setAssistantState(AssistantState.LISTENING_WAKE_WORD);
    };
    
    recognition.onend = () => {
      console.log('🎤 Web Speech encerrado');
      
      if (assistantState === AssistantState.LISTENING_COMMAND) {
        console.log('⚠️ Encerrou sem capturar comando, voltando...');
        setAssistantState(AssistantState.LISTENING_WAKE_WORD);
      }
    };
    
    try {
      recognition.start();
      console.log('✅ Web Speech ativo, FALE AGORA!');
    } catch (e) {
      console.error('❌ Erro ao iniciar Web Speech:', e);
      setAssistantState(AssistantState.LISTENING_WAKE_WORD);
    }
  }

  function stopCommandListening() {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      } catch (e) {}
    }
    
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }
  }

  async function processCommand(transcript: string) {
    console.log('⚡ Processando comando:', transcript);
    
    const isSpecificCommand = await detectVoiceCommand(transcript);
    
    if (!isSpecificCommand) {
      await processQuestion(transcript);
    }
    
    setAssistantState(AssistantState.LISTENING_WAKE_WORD);
  }

  function playActivationBeep() {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      console.log('🔔 Beep ativação tocado');
    } catch (e) {
      console.log('⚠️ Erro beep:', e);
    }
  }

  function playProcessingBeep() {
    try {
      const audioContext = new AudioContext();
      
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.value = 600;
      gain1.gain.setValueAtTime(0.2, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.1);
      
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 800;
      gain2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
      osc2.start(audioContext.currentTime + 0.15);
      osc2.stop(audioContext.currentTime + 0.25);
      
      console.log('🔔 Beep processamento tocado');
    } catch (e) {
      console.log('⚠️ Erro beep:', e);
    }
  }

  function playErrorBeep() {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      console.log('🔔 Beep erro tocado');
    } catch (e) {
      console.log('⚠️ Erro beep:', e);
    }
  }

  async function checkIfFunctionIsEnabled(functionKey: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { data: func } = await supabase
        .from('assistant_functions')
        .select('is_active')
        .eq('function_key', functionKey)
        .single();
      
      if (!func || !func.is_active) {
        return false;
      }
      
      const { data: setting } = await supabase
        .from('company_function_settings')
        .select('is_enabled')
        .eq('company_id', companyId)
        .eq('function_key', functionKey)
        .single();
      
      if (!setting) {
        return true;
      }
      
      return setting.is_enabled;
      
    } catch (error) {
      console.error('Erro ao verificar função:', error);
      return true;
    }
  }

  async function registerFunctionUsage(functionKey: string, creditsConsumed: number) {
    try {
      const supabase = createClient();
      
      await supabase.rpc('register_function_usage', {
        p_company_id: companyId,
        p_function_key: functionKey,
        p_credits_consumed: creditsConsumed
      });
      
      console.log('✅ Uso registrado:', functionKey);
    } catch (error) {
      console.error('Erro ao registrar uso:', error);
    }
  }

  async function handleFunctionClick(functionKey: string) {
    console.log('🎯 Função clicada no carrossel:', functionKey);
    
    const isEnabled = await checkIfFunctionIsEnabled(functionKey);
    
    if (!isEnabled) {
      console.log('⚠️ Função desativada:', functionKey);
      await playText('Esta função está desativada no momento. Entre em contato com o suporte para ativá-la.');
      
      setTimeout(() => {
        if (isActiveRef.current) {
          console.log('✅ Vosk continua ativo');
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
        case 'pix_generate':
          await playText('Me chame e fale: gerar PIX com o valor, que já gero a cobrança.');
          break;
          
        case 'qrcode_whatsapp':
          await handleWhatsAppCommand();
          break;
          
        case 'qrcode_instagram':
          await handleInstagramCommand();
          break;
          
        default:
          await playText(`Função ${functionKey} ainda não implementada.`);
      }
      
      await registerFunctionUsage(functionKey, 0);
      
    } catch (error) {
      console.error('Erro ao executar função:', error);
      await playText('Desculpe, ocorreu um erro ao executar esta função.');
    } finally {
      setIsProcessing(false);
      
      setTimeout(() => {
        if (isActiveRef.current) {
          console.log('✅ Vosk continua ativo');
        }
      }, 500);
    }
  }

  function convertWordsToNumbers(text: string): string {
    const numberWords: {[key: string]: string} = {
      'zero': '0',
      'um': '1',
      'dois': '2',
      'três': '3',
      'tres': '3',
      'quatro': '4',
      'cinco': '5',
      'seis': '6',
      'sete': '7',
      'oito': '8',
      'nove': '9',
      'dez': '10',
      'onze': '11',
      'doze': '12',
      'treze': '13',
      'catorze': '14',
      'quatorze': '14',
      'quinze': '15',
      'dezesseis': '16',
      'dezessete': '17',
      'dezoito': '18',
      'dezenove': '19',
      'vinte': '20',
      'trinta': '30',
      'quarenta': '40',
      'cinquenta': '50',
      'sessenta': '60',
      'setenta': '70',
      'oitenta': '80',
      'noventa': '90',
      'cem': '100',
      'cento': '100',
      'duzentos': '200',
      'trezentos': '300',
      'quatrocentos': '400',
      'quinhentos': '500',
      'seiscentos': '600',
      'setecentos': '700',
      'oitocentos': '800',
      'novecentos': '900',
      'mil': '1000',
    };
    
    let result = text;
    
    for (const [word, number] of Object.entries(numberWords)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, number);
    }
    
    return result;
  }

async function detectVoiceCommand(transcript: string): Promise<boolean> {
  const lowerTranscript = transcript.toLowerCase().trim();
  
  console.log('🔍 Detectando comandos de voz:', lowerTranscript);
  
  const transcriptWithNumbers = convertWordsToNumbers(lowerTranscript);
  console.log('🔢 Após conversão:', transcriptWithNumbers);
  
  const whatsappTriggers = [
    'whatsapp',
    'whats',
    'zap',
    'número',
    'contato'
  ];
  
  if (whatsappTriggers.some(trigger => lowerTranscript.includes(trigger))) {
    console.log('📱 Comando WhatsApp detectado!');
    
    const isEnabled = await checkIfFunctionIsEnabled('qrcode_whatsapp');
    
    if (!isEnabled) {
      await playText('A função WhatsApp está desativada no momento.');
      return true;
    }
    
    await handleWhatsAppCommand();
    await registerFunctionUsage('qrcode_whatsapp', 0);
    return true;
  }
  
  const instagramTriggers = [
    'instagram',
    'insta',
    'arroba',
    'perfil'
  ];
  
  if (instagramTriggers.some(trigger => lowerTranscript.includes(trigger))) {
    console.log('📸 Comando Instagram detectado!');
    
    const isEnabled = await checkIfFunctionIsEnabled('qrcode_instagram');
    
    if (!isEnabled) {
      await playText('A função Instagram está desativada no momento.');
      return true;
    }
    
    await handleInstagramCommand();
    await registerFunctionUsage('qrcode_instagram', 0);
    return true;
  }
  
  const confirmTriggers = [
    'confirmar',
    'confirmado',
    'paguei',
    'já paguei',
    'pagamento confirmado'
  ];
  
  if (confirmTriggers.some(trigger => lowerTranscript.includes(trigger))) {
    console.log('✅ Comando CONFIRMAR PIX detectado!');
    
    const currentPixState = pixStateRef.current;
    
    if (currentPixState?.pixConfirmationData || currentPixState?.qrCodeData) {
      console.log('💳 PIX aberto encontrado, confirmando...');
      await handleConfirmPix();
      return true;
    } else {
      console.log('⚠️ Nenhum PIX aberto para confirmar');
      await playText('Não há nenhum PIX aberto para confirmar');
      return true;
    }
  }
  
  const cancelTriggers = [
    'cancelar',
    'cancela',
    'desistir',
    'não quero',
    'fechar'
  ];
  
  if (cancelTriggers.some(trigger => lowerTranscript.includes(trigger)) && 
      lowerTranscript.includes('pix')) {
    console.log('❌ Comando CANCELAR PIX detectado!');
    
    const currentPixState = pixStateRef.current;
    
    if (currentPixState?.pixConfirmationData || currentPixState?.qrCodeData) {
      console.log('💳 PIX aberto encontrado, cancelando...');
      await handleCancelPix();
      return true;
    } else {
      console.log('⚠️ Nenhum PIX aberto para cancelar');
      await playText('Não há nenhum PIX aberto');
      return true;
    }
  }
  
  const pixPatterns = [
    /(?:gerar|gera|criar|cria|fazer|faz|faça)\s*(?:um\s*|uma\s*)?(pix|cobrança|cobranca)\s*(?:de|com|no valor de)?\s*(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?/i,
    /(pix|cobrança|cobranca)\s*(?:de|com)?\s*(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?/i,
  ];
  
  for (const pattern of pixPatterns) {
    const match = transcriptWithNumbers.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(',', '.'));
      
      if (amount > 0) {
        console.log('💰 Comando PIX detectado! Valor:', amount);
        
        const isEnabled = await checkIfFunctionIsEnabled('pix_generate');
        
        if (!isEnabled) {
          await playText('A função PIX está desativada no momento.');
          return true;
        }
        
        await handlePixCommand(amount);
        await registerFunctionUsage('pix_generate', 0);
        return true;
      }
    }
  }
  
  return false;
}
  
  async function handleWhatsAppCommand() {
    try {
      setIsProcessing(true);
      
      const supabase = createClient();
      const response = await supabase.functions.invoke('gerar-qrcode-contato', {
        body: {
          company_id: companyId,
          qr_type: 'whatsapp'
        }
      });
      
      if (response.error) throw response.error;
      
      const data = response.data;
      
      setQrCodeData({
        type: 'whatsapp',
        qrCodeUrl: data.qr_code_url,
        qrContent: data.qr_content,
        displayText: data.display_text,
        companyName: data.company_name
      });
      
      await playText(`Aqui está o WhatsApp: ${data.display_text}`);
      
    } catch (error: any) {
      console.error('Erro WhatsApp:', error);
      await playText('Desculpe, não consegui obter o WhatsApp.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleInstagramCommand() {
    try {
      setIsProcessing(true);
      
      const supabase = createClient();
      const response = await supabase.functions.invoke('gerar-qrcode-contato', {
        body: {
          company_id: companyId,
          qr_type: 'instagram'
        }
      });
      
      if (response.error) throw response.error;
      
      const data = response.data;
      
      setQrCodeData({
        type: 'instagram',
        qrCodeUrl: data.qr_code_url,
        qrContent: data.qr_content,
        displayText: data.display_text,
        companyName: data.company_name
      });
      
      await playText(`Aqui está o Instagram: ${data.display_text}`);
      
    } catch (error: any) {
      console.error('Erro Instagram:', error);
      await playText('Desculpe, não consegui obter o Instagram.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handlePixCommand(amount: number) {
    try {
      setIsProcessing(true);
      
      const amountCents = Math.round(amount * 100);
      
      const supabase = createClient();
      const response = await supabase.functions.invoke('gerar-pix-assistente', {
        body: {
          company_id: companyId,
          amount_cents: amountCents
        }
      });
      
      if (response.error) throw response.error;
      
      const data = response.data;
      
      setPixConfirmationData({
        transactionId: data.transaction_id,
        amount: data.amount_brl,
        qrCodeUrl: data.qr_code_url,
        pixCode: data.pix_code
      });
      
      await playText(`PIX de ${amount.toFixed(2).replace('.', ',')} reais gerado. Aguardando confirmação.`);
      
    } catch (error: any) {
      console.error('Erro PIX:', error);
      await playText('Desculpe, não consegui gerar o PIX.');
    } finally {
      setIsProcessing(false);
    }
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
        console.log('📦 Context:', response.error.context);
        
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

  function handleCloseQRCode() {
    setQrCodeData(null);
    playText('QR Code fechado.').catch(() => {});
  }

  function handleCopyQRCode() {
    console.log('📋 QR Code copiado!');
  }

  const handleTextMessage = async (message: string) => {
    console.log('📝 Mensagem de texto recebida:', message);

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    setIsProcessing(true);

    try {
      const isCommand = await detectVoiceCommand(message);
      
      if (isCommand) {
        console.log('✅ Comando detectado via texto');
        return;
      }

      console.log('📤 Enviando mensagem para API...');
      
      const supabase = createClient();
      
      let currentConversationId = conversationIdRef.current;
      
      if (!currentConversationId) {
        const { data: newConversation } = await supabase
          .from('conversations')
          .insert({
            company_id: companyId,
            started_at: new Date().toISOString(),
            status: 'active'
          })
          .select()
          .single();
        
        if (newConversation) {
          currentConversationId = newConversation.id;
          conversationIdRef.current = currentConversationId;
        }
      }

      if (currentConversationId) {
        await supabase.from('messages').insert({
          conversation_id: currentConversationId,
          role: 'user',
          content: message
        });
      }

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

      if (currentConversationId) {
        await supabase.from('messages').insert({
          conversation_id: currentConversationId,
          role: 'assistant',
          content: answer
        });
      }

      await playText(answer);

    } catch (error: any) {
      console.error('❌ Erro ao processar mensagem:', error);
      await playText('Desculpe, ocorreu um erro ao processar sua mensagem.');
    } finally {
      setIsProcessing(false);
      
      setTimeout(() => {
        if (isActiveRef.current) {
          console.log('✅ Vosk continua ativo');
        }
      }, 500);
    }
  };

  function stopAudioImmediately() {
    console.log('🛑 STOP: Parando áudio imediatamente');
    
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      } catch (e) {}
    }
    
    if (feedbackAudioRef.current) {
      try {
        feedbackAudioRef.current.pause();
        feedbackAudioRef.current.currentTime = 0;
        feedbackAudioRef.current = null;
      } catch (e) {}
    }
    
    setIsPlayingAudio(false);
    setIsProcessing(false);
    processingQuestion.current = false;
    
    console.log('✅ Vosk continua ativo');
  }

  async function processQuestion(questionText: string) {
    console.log('⚡ Processando:', questionText);
    
    const isCommand = await detectVoiceCommand(questionText);
    
    if (isCommand) {
      console.log('✅ Comando processado, retornando ao wake word');
      processingQuestion.current = false;
      
      setTimeout(() => {
        if (isActiveRef.current) {
          console.log('✅ Vosk continua ativo');
        }
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

      console.log('🔄 Vosk continua ativo durante resposta...');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.playbackRate = 1.05;
      
      currentAudioRef.current = audio;
      
      setIsPlayingAudio(true);
      
      audio.onplay = () => {
        console.log('🔊 Áudio iniciou (reconhecimento ATIVO)');
        setIsPlayingAudio(true);
      };
      
      audio.onended = () => {
        console.log('✅ Resposta concluída');
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        
        console.log('✅ Vosk continua ativo');
      };

      audio.onerror = (e) => {
        console.error('❌ Erro ao tocar áudio:', e);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        
        setTimeout(() => {
          if (isActiveRef.current) {
            console.log('✅ Vosk continua ativo');
          }
        }, 200);
      };

      const safetyTimeout = setTimeout(() => {
        if (!isPlayingAudio && currentAudioRef.current === audio) {
          console.log('⚠️ Áudio não iniciou em 3s, forçando reinício');
          setIsPlayingAudio(false);
          currentAudioRef.current = null;
          processingQuestion.current = false;
          
          if (isActiveRef.current) {
            console.log('✅ Vosk continua ativo');
          }
        }
      }, 1500);

      try {
        console.log('▶️ Tentando tocar áudio...');
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Áudio tocando com sucesso');
              clearTimeout(safetyTimeout);
            })
            .catch(err => {
              console.error('❌ Erro play():', err);
              
              setTimeout(() => {
                console.log('🔄 Retry play()...');
                audio.play()
                  .then(() => {
                    clearTimeout(safetyTimeout);
                  })
                  .catch(e => {
                    console.error('❌ Retry falhou:', e);
                    clearTimeout(safetyTimeout);
                    
                    setIsPlayingAudio(false);
                    currentAudioRef.current = null;
                    processingQuestion.current = false;
                    
                    setTimeout(() => {
                      if (isActiveRef.current) {
                        console.log('✅ Vosk continua ativo');
                      }
                    }, 200);
                  });
              }, 100);
            });
        }
      } catch (err) {
        console.error('❌ Erro crítico play():', err);
        clearTimeout(safetyTimeout);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        
        setTimeout(() => {
          if (isActiveRef.current) {
            console.log('✅ Vosk continua ativo');
          }
        }, 200);
      }
      
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
          console.log('✅ Vosk continua ativo');
        }
      }, 1000);
    }
  }

  async function playProcessingFeedback(): Promise<HTMLAudioElement> {
    return new Promise(async (resolve, reject) => {
      try {
        const feedbackMessages = [
          'Entendi!',
          'Processando...',
          'Um momento!',
          'Aguarde...',
          'Um instante!',
        ];
        
        const randomMessage = feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)];
        
        console.log(`💬 Tocando feedback: "${randomMessage}"`);
        
        const response = await fetch('/api/voice/tts-fast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: randomMessage }),
        });

        if (!response.ok) {
          throw new Error('Fast TTS não disponível');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.volume = 0.9;
        audio.playbackRate = 1.0;
        
        audio.onplay = () => {
          setIsPlayingAudio(true);
        };

        audio.onended = () => {
          setIsPlayingAudio(false);
        };

        audio.onerror = () => {
          setIsPlayingAudio(false);
          reject(new Error('Erro ao tocar feedback'));
        };

        await audio.play();
        resolve(audio);
        
      } catch (err) {
        console.log('⚠️ TTS feedback falhou, usando backup');
        
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUB4QU6vo66lXGAo+meL0wmskBSyBzvLYiTcIGWi77OefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQU=');
          audio.volume = 0.5;
          await audio.play();
          resolve(audio);
        } catch (beepErr) {
          reject(beepErr);
        }
      }
    });
  }

  async function playGoodbye() {
    try {
      await playText('Até logo!');
    } catch (e) {
      console.log('Erro despedida');
    }
    
    setTimeout(() => {
      if (isActiveRef.current) {
        console.log('✅ Vosk continua ativo');
      }
    }, 1000);
  }

  async function playText(text: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }

        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`TTS ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        currentAudioRef.current = audio;

        audio.onplay = () => {
          setIsPlayingAudio(true);
        };

        audio.onended = () => {
          setIsPlayingAudio(false);
          currentAudioRef.current = null;
          resolve();
        };

        audio.onerror = () => {
          setIsPlayingAudio(false);
          currentAudioRef.current = null;
          reject(new Error('Erro reproduzir'));
        };

        await audio.play();
      } catch (err) {
        setIsPlayingAudio(false);
        reject(err);
      }
    });
  }

  const getStatusMessage = () => {
    if (!permissionGranted) return 'Aguardando permissão...';
    if (voskLoading && !voskReady) return 'Carregando assistente...';
    if (showStartButton) return 'Clique em "Iniciar"';
    
    if (assistantState === AssistantState.LISTENING_COMMAND) {
      return 'Estou ouvindo... 🎤';
    }
    
    if (assistantState === AssistantState.PROCESSING) {
      return 'Processando...';
    }
    
    if (isPlayingAudio) return 'Falando...';
    if (isProcessing) return 'Processando...';
    
    if (assistantState === AssistantState.LISTENING_WAKE_WORD) {
      return `Diga: "${wakeWords[0]}"`;
    }
    
    return 'Aguarde...';
  };

  const getStatusColor = () => {
    if (!permissionGranted) return 'bg-gray-400';
    if (isPlayingAudio) return 'bg-blue-500 animate-pulse';
    if (isProcessing) return 'bg-green-600 animate-pulse';
    if (isListening) return 'bg-green-400 animate-pulse';
    return 'bg-gray-400';
  };

if (isMaximized) {
    return (
      <div className="flex flex-col items-center gap-4 md:gap-8 w-full">
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
          {assistantState === AssistantState.LISTENING_COMMAND && (
            <div className="mt-4 flex items-center justify-center gap-2 animate-pulse">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <p className={`text-sm font-bold ${
                theme === 'dark' ? 'text-green-400' : 'text-green-600'
              }`}>
                Estou ouvindo... fale agora!
              </p>
            </div>
          )}
          {error && (
            <p className={`text-xs sm:text-sm transition-colors ${
              theme === 'dark' ? 'text-red-400/50' : 'text-red-600/50'
            }`}>{error}</p>
          )}
          {voskLoading && !voskReady && (
            <div className="w-full max-w-sm mx-auto mt-6 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
                  {voskDownloading ? 'Baixando modelo de voz...' : 'Carregando...'}
                </p>
              </div>
              
              {voskDownloading && (
                <div className="w-full">
                  <div className={`w-full h-2 rounded-full overflow-hidden ${
                    theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'
                  }`}>
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300 ease-out"
                      style={{ width: `${voskProgress}%` }}
                    ></div>
                  </div>
                  <p className={`text-xs text-center mt-2 ${
                    theme === 'dark' ? 'text-white/50' : 'text-gray-500'
                  }`}>
                    {voskProgress}% baixado (~40MB)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {showStartButton && permissionGranted && !voskLoading && (
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

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
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

        <div className={`rounded-3xl shadow-2xl p-8 border transition-colors ${
          theme === 'dark'
            ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl'
            : 'bg-white border-gray-200'
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
              {assistantState === AssistantState.LISTENING_COMMAND && (
                <div className="mt-4 flex items-center justify-center gap-2 animate-pulse">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <p className={`text-sm font-bold ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`}>
                    Estou ouvindo... fale agora!
                  </p>
                </div>
              )}
              {voskLoading && !voskReady && (
                <div className="w-full max-w-sm mx-auto mt-6 space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
                      {voskDownloading ? 'Baixando modelo de voz...' : 'Carregando...'}
                    </p>
                  </div>
                  
                  {voskDownloading && (
                    <div className="w-full">
                      <div className={`w-full h-2 rounded-full overflow-hidden ${
                        theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'
                      }`}>
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                          style={{ width: `${voskProgress}%` }}
                        ></div>
                      </div>
                      <p className={`text-xs text-center mt-2 ${
                        theme === 'dark' ? 'text-white/50' : 'text-gray-500'
                      }`}>
                        {voskProgress}% baixado (~40MB)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className={`w-full p-4 rounded-xl border-2 transition-colors ${
                theme === 'dark'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {showStartButton && permissionGranted && !voskLoading && (
              <button
                onClick={handleStart}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-xl hover:from-blue-700 hover:to-green-600 transition font-bold shadow-xl text-lg"
              >
                Iniciar Assistente
              </button>
            )}
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

      {!showStartButton && (
        <>
          <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mt-8">
            <FunctionCarousel
              companyId={companyId}
              onFunctionClick={handleFunctionClick}
              theme={theme}
            />
          </div>
        </>
      )}
    </div>
  );
}