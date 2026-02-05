'use client';

/**
 * 🚀 Voice Assistant 100% Google (Sem Vosk) - VERSÃO COMPLETA
 * 
 * Migração de Vosk → Web Speech API
 * Backend 100% Google (Speech + Gemini + TTS)
 * 
 * Todas as funcionalidades mantidas:
 * - Wake word detection
 * - PIX generation/confirmation/cancel
 * - WhatsApp/Instagram QR codes
 * - FAQ matching (backend)
 * - Text input chat
 * - Function carousel
 * - Processing feedback audio
 * - Stop commands
 * - End commands
 */

import { useState, useEffect, useRef } from 'react';
import { AvatarFace } from '@/components/AvatarFace';
import { WakeWordDetector } from './WakeWordDetector';
import QRCodeDisplay from '@/components/assistant/QRCodeDisplay';
import PIXConfirmationModal from '@/components/assistant/PIXConfirmationModal';
import FunctionCarousel from '@/components/assistant/FunctionCarousel';
import { createClient } from '@/lib/supabase-browser';
import TextInputChat from './TextInputChat';

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
  // ========================================
  // STATES
  // ========================================
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  const [browserSpeechSupported, setBrowserSpeechSupported] = useState(false);

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

  // ========================================
  // REFS
  // ========================================
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(true);
  const audioUnlocked = useRef<boolean>(false);
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);
  const processingQuestion = useRef<boolean>(false);
  const conversationIdRef = useRef<string | null>(null);
  
  // 🎤 Web Speech API
  const recognitionRef = useRef<any>(null);
  const isRecognitionActive = useRef(false);

  // ========================================
  // CONFIGURATION
  // ========================================
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

  // ========================================
  // INITIALIZATION
  // ========================================
  useEffect(() => {
    isActiveRef.current = true;
    
    console.log('🚀 Inicializando Voice Assistant (Web Speech API)...');
    
    // ✅ Verificar suporte Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      console.log('✅ Web Speech API suportada!');
      setBrowserSpeechSupported(true);
      requestMicrophonePermission();
    } else {
      console.error('❌ Web Speech API não suportada neste navegador');
      setError('Navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.');
      setBrowserSpeechSupported(false);
    }
    
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

  // ========================================
  // CLEANUP
  // ========================================
  function cleanup() {
    console.log('🧹 Cleanup...');
    
    // Parar Web Speech API
    if (recognitionRef.current && isRecognitionActive.current) {
      try {
        recognitionRef.current.stop();
        isRecognitionActive.current = false;
        console.log('✅ Recognition stopped');
      } catch (e) {
        console.log('⚠️ Erro ao parar recognition:', e);
      }
    }
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    if (feedbackAudioRef.current) {
      feedbackAudioRef.current.pause();
      feedbackAudioRef.current = null;
    }
  }

  // ========================================
  // AUDIO UNLOCK
  // ========================================
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

  // ========================================
  // MICROPHONE PERMISSION
  // ========================================
  async function requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError('');
      console.log('✅ Permissão de microfone concedida');
    } catch (err) {
      console.error('❌ Permissão negada:', err);
      setError('Permissão do microfone negada.');
      setPermissionGranted(false);
    }
  }

  // ========================================
  // START ASSISTANT
  // ========================================
  async function handleStart() {
    console.log('🚀 Iniciando assistente de voz (Web Speech API)...');
    
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
        startWebSpeechListening();
      }
    }, 300);
  }

  // ========================================
  // WEB SPEECH API
  // ========================================
  function startWebSpeechListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Reconhecimento de voz não suportado');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      // Configurações otimizadas
      recognition.continuous = true;  // Escuta contínua
      recognition.interimResults = true;  // Resultados parciais
      recognition.lang = 'pt-BR';  // Português Brasil
      recognition.maxAlternatives = 1;
      
      // Event: Resultado parcial ou final
      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const result = event.results[last];
        const transcript = result[0].transcript;
        const isFinal = result.isFinal;
        
        console.log(`${isFinal ? '✅ Final' : '📝 Interim'}: "${transcript}"`);
        
        handleWebSpeechTranscript(transcript, isFinal);
      };
      
      // Event: Erro
      recognition.onerror = (event: any) => {
        console.error('❌ Web Speech error:', event.error);
        
        if (event.error === 'no-speech') {
          console.log('⏳ Sem fala detectada, continuando...');
        } else if (event.error === 'aborted') {
          console.log('🔄 Recognition abortado, reiniciando...');
          setTimeout(() => {
            if (isActiveRef.current && !isRecognitionActive.current) {
              startWebSpeechListening();
            }
          }, 1000);
        } else if (event.error === 'network') {
          console.error('❌ Erro de rede no Web Speech API');
          setError('Erro de conexão. Verifique sua internet.');
        } else {
          setError(`Erro de reconhecimento: ${event.error}`);
        }
      };
      
      // Event: Início
      recognition.onstart = () => {
        console.log('🎤 Recognition started');
        isRecognitionActive.current = true;
        setIsListening(true);
      };
      
      // Event: Fim
      recognition.onend = () => {
        console.log('🔚 Web Speech encerrado');
        isRecognitionActive.current = false;
        
        // Reiniciar se ainda ativo
        if (isActiveRef.current && !isProcessing && !isPlayingAudio) {
          console.log('🔄 Reiniciando reconhecimento...');
          setTimeout(() => {
            if (isActiveRef.current) {
              startWebSpeechListening();
            }
          }, 500);
        } else {
          setIsListening(false);
        }
      };
      
      // Iniciar
      recognition.start();
      console.log('✅ Web Speech API ATIVO! 🎉');
      
    } catch (err: any) {
      console.error('❌ Erro ao iniciar Web Speech:', err);
      setError('Erro ao acessar microfone');
    }
  }

  // ========================================
  // HANDLE TRANSCRIPT
  // ========================================
  function handleWebSpeechTranscript(text: string, isFinal: boolean) {
    if (!text || !isActiveRef.current) return;
    
    const lowerText = text.toLowerCase().trim();
    
    const detectionResult = wakeWordDetectorRef.current?.detect(lowerText);
    
    if (detectionResult?.detected) {
      console.log(`🔍 Wake word detectada: "${detectionResult.keyword}"`);
      console.log(`📊 Confidence: ${(detectionResult.confidence * 100).toFixed(0)}%`);
      
      const normalizedTranscript = lowerText.replace(/[.,!?]/g, '').trim();
      
      // Comandos de parar explícitos
      const explicitStopPhrases = [
        'pare',
        'para',
        'parar',
        'cala boca',
        'cala a boca',
        'calça boca',
        'silencio',
        'silêncio',
        'stop',
        'chega',
        'para de falar',
        'pare de falar',
        'para ai',
        'para aí'
      ];
      
      const hasExplicitStop = explicitStopPhrases.some(phrase => {
        const normalizedPhrase = phrase.replace(/[.,!?]/g, '').trim();
        return normalizedTranscript.includes(normalizedPhrase);
      });
      
      const isActuallyPlaying = currentAudioRef.current !== null && !currentAudioRef.current.paused;
      
      if (hasExplicitStop && isFinal && (isProcessing || isPlayingAudio || isActuallyPlaying)) {
        console.log('🛑 COMANDO STOP EXPLÍCITO DETECTADO!');
        console.log('✅ PARANDO áudio imediatamente!');
        stopAudioImmediately();
        return;
      }
      
      if (processingQuestion.current || isProcessing || isPlayingAudio || isActuallyPlaying) {
        console.log('⏸️ Ocupado, ignorando captura');
        return;
      }
      
      if (isFinal) {
        console.log('✅ Processando pergunta completa (Web Speech)');
        
        if (!audioUnlocked.current) {
          unlockAudio();
        }
        
        if (!processingQuestion.current) {
          processingQuestion.current = true;
          processWakeWordQuestion(lowerText);
        }
      } else {
        console.log('⏳ Aguardando transcrição final...');
      }
    }
  }

  // ========================================
  // FUNCTION MANAGEMENT
  // ========================================
  async function checkIfFunctionIsEnabled(functionKey: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { data: func } = await supabase
        .from('assistant_functions')
        .select('is_active')
        .eq('function_key', functionKey)
        .single();
      
      if (!func || !func.is_active) {
        console.log(`⚠️ Função ${functionKey} não ativa globalmente`);
        return false;
      }
      
      const { data: setting } = await supabase
        .from('company_function_settings')
        .select('is_enabled')
        .eq('company_id', companyId)
        .eq('function_key', functionKey)
        .single();
      
      if (!setting) {
        console.log(`✅ Função ${functionKey} habilitada (sem setting específico)`);
        return true;
      }
      
      console.log(`${setting.is_enabled ? '✅' : '❌'} Função ${functionKey} ${setting.is_enabled ? 'habilitada' : 'desabilitada'} para empresa`);
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
      
      console.log(`✅ Uso registrado: ${functionKey} (${creditsConsumed} créditos)`);
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
          console.log('✅ Web Speech continua ativo');
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
          console.log('✅ Web Speech continua ativo');
        }
      }, 500);
    }
  }

  // ========================================
  // NUMBER CONVERSION
  // ========================================
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

  // ========================================
  // VOICE COMMAND DETECTION
  // ========================================
  async function detectVoiceCommand(transcript: string): Promise<boolean> {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    console.log('🔍 Detectando comandos de voz:', lowerTranscript);
    
    const transcriptWithNumbers = convertWordsToNumbers(lowerTranscript);
    console.log('🔢 Após conversão:', transcriptWithNumbers);
    
    // WhatsApp
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
    
    // Instagram
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
    
    // Confirmar PIX
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
    
    // Cancelar PIX
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
    
    // PIX Generation
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

  // ========================================
  // COMMAND HANDLERS
  // ========================================
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

  // ========================================
  // TEXT INPUT HANDLER
  // ========================================
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
          console.log('✅ Web Speech continua ativo');
        }
      }, 500);
    }
  };

  // ========================================
  // AUDIO CONTROL
  // ========================================
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
    
    console.log('✅ Web Speech continua ativo');
  }

  // ========================================
  // QUESTION PROCESSING
  // ========================================
  function processWakeWordQuestion(transcript: string) {
    console.log('📋 processWakeWordQuestion chamada');
    console.log('  transcript:', transcript);
    
    let cleanTranscript = transcript.replace(/[,\.!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    const normalizedForEndCheck = cleanTranscript.toLowerCase();
    const hasEndCommand = endCommands.some(cmd => normalizedForEndCheck.includes(cmd));
    
    if (hasEndCommand) {
      console.log('👋 Comando de encerramento:', cleanTranscript);
      processingQuestion.current = false;
      playGoodbye();
      return;
    }
    
    for (const word of wakeWords) {
      cleanTranscript = cleanTranscript.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
    }
    
    cleanTranscript = cleanTranscript.replace(/\s+/g, ' ').trim();
    
    const words = cleanTranscript.split(' ').filter((w: string) => w.length > 2);
    
    console.log('🔍 Pergunta extraída:', cleanTranscript);
    console.log('📊 Palavras:', words.length, words);
    
    if (words.length === 0) {
      console.log('❌ Sem pergunta, resetando');
      processingQuestion.current = false;
      
      setTimeout(() => {
        if (isActiveRef.current) {
          console.log('✅ Web Speech continua ativo');
        }
      }, 300);
      return;
    }
    
    processQuestion(cleanTranscript);
  }

  async function processQuestion(questionText: string) {
    console.log('⚡ Processando:', questionText);
    
    const isCommand = await detectVoiceCommand(questionText);
    
    if (isCommand) {
      console.log('✅ Comando processado');
      processingQuestion.current = false;
      
      setTimeout(() => {
        if (isActiveRef.current) {
          console.log('✅ Web Speech continua ativo');
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

      console.log(usedFAQ ? '⚡ FAQ' : '🤖 Gemini');
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

      console.log('🔄 Web Speech continua ativo durante resposta...');

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
        
        console.log('✅ Web Speech continua ativo');
      };

      audio.onerror = (e) => {
        console.error('❌ Erro ao tocar áudio:', e);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        
        setTimeout(() => {
          if (isActiveRef.current) {
            console.log('✅ Web Speech continua ativo');
          }
        }, 200);
      };

      const safetyTimeout = setTimeout(() => {
        if (!isPlayingAudio && currentAudioRef.current === audio) {
          console.log('⚠️ Áudio não iniciou, forçando reinício');
          setIsPlayingAudio(false);
          currentAudioRef.current = null;
          processingQuestion.current = false;
          
          if (isActiveRef.current) {
            console.log('✅ Web Speech continua ativo');
          }
        }
      }, 1500);

      try {
        console.log('▶️ Tentando tocar áudio...');
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Áudio tocando');
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
          console.log('✅ Web Speech continua ativo');
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
        console.log('✅ Web Speech continua ativo');
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

  // ========================================
  // STATUS DISPLAY
  // ========================================
  const getStatusMessage = () => {
    if (!permissionGranted) return 'Aguardando permissão...';
    if (!browserSpeechSupported) return 'Navegador não suportado';
    if (showStartButton) return 'Clique em "Iniciar"';
    if (isPlayingAudio) return 'Falando...';
    if (isProcessing) return 'Processando...';
    if (isListening) return `Diga: "${wakeWords[0]}" + pergunta`;
    return 'Aguarde...';
  };

  const getStatusColor = () => {
    if (!permissionGranted || !browserSpeechSupported) return 'bg-gray-400';
    if (isPlayingAudio) return 'bg-blue-500 animate-pulse';
    if (isProcessing) return 'bg-green-600 animate-pulse';
    if (isListening) return 'bg-green-400 animate-pulse';
    return 'bg-gray-400';
  };

  // ========================================
  // RENDER
  // ========================================
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
          {error && (
            <p className={`text-xs sm:text-sm transition-colors ${
              theme === 'dark' ? 'text-red-400/50' : 'text-red-600/50'
            }`}>{error}</p>
          )}
        </div>

        {showStartButton && permissionGranted && browserSpeechSupported && (
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
                Web Speech API (Chrome/Edge/Safari)
              </p>
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

            {showStartButton && permissionGranted && browserSpeechSupported && (
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
        <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mt-8">
          <FunctionCarousel
            companyId={companyId}
            onFunctionClick={handleFunctionClick}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}