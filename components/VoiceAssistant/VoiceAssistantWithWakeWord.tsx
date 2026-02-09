'use client';

import { useState, useEffect, useRef } from 'react';
import { AvatarFace } from '@/components/AvatarFace';
import { WakeWordDetector } from './WakeWordDetector';
import QRCodeDisplay from '@/components/assistant/QRCodeDisplay';
import PIXConfirmationModal from '@/components/assistant/PIXConfirmationModal';
import FunctionCarousel from '@/components/assistant/FunctionCarousel';
import { createClient } from '@/lib/supabase-browser';
import TextInputChat from './TextInputChat';
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';

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
  
  // ✅ Google Speech WebSocket refs
  const googleSpeechRef = useRef<GoogleSpeechWebSocket | null>(null);
  const shouldProcessAudio = useRef<boolean>(true);

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
    
    console.log('🚀 Inicializando Voice Assistant (Google Speech WebSocket)...');
    
    requestMicrophonePermission();
    
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
    
    // Parar Google Speech WebSocket
    if (googleSpeechRef.current) {
      googleSpeechRef.current.stopRecording();
      googleSpeechRef.current.disconnect();
      googleSpeechRef.current = null;
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
  // GOOGLE SPEECH WEBSOCKET
  // ========================================
  async function startGoogleSpeech() {
    try {
      console.log('🎤 Iniciando Google Speech Streaming...');
      
      const client = new GoogleSpeechWebSocket({
        onTranscript: (text, isFinal) => {
          handleGoogleTranscript(text, isFinal);
        },
        onError: (error) => {
          console.error('❌ Erro Google Speech:', error);
          setError('Erro no reconhecimento de voz');
        },
        onReady: () => {
          console.log('✅ Google Speech pronto');
          setIsListening(true);
        },
        languageCode: 'pt-BR',
        sampleRate: 16000,
      });
      
      googleSpeechRef.current = client;
      
      await client.connect();
      await client.startRecording();
      
    } catch (error: any) {
      console.error('❌ Erro ao iniciar Google Speech:', error);
      setError('Erro ao acessar microfone');
    }
  }

  async function stopGoogleSpeech() {
    if (googleSpeechRef.current) {
      console.log('🛑 Parando Google Speech...');
      
      await googleSpeechRef.current.stopRecording();
      googleSpeechRef.current.disconnect();
      googleSpeechRef.current = null;
      
      setIsListening(false);
      console.log('✅ Google Speech parado');
    }
  }

  function handleGoogleTranscript(text: string, isFinal: boolean) {
    if (!text || !isActiveRef.current || !shouldProcessAudio.current) return;
    
    const lowerText = text.toLowerCase().trim();
    
    console.log(`${isFinal ? '✅ Final' : '📝 Interim'}: "${lowerText}"`);
    
    // Detectar wake word
    const detectionResult = wakeWordDetectorRef.current?.detect(lowerText);
    
    if (detectionResult?.detected) {
      console.log(`🔍 Wake word: "${detectionResult.keyword}"`);
      console.log(`📊 Confidence: ${(detectionResult.confidence * 100).toFixed(0)}%`);
      
      const normalizedTranscript = lowerText.replace(/[.,!?]/g, '').trim();
      
      // Detectar comandos de stop explícitos
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
        console.log('🛑 COMANDO STOP detectado:', lowerText);
        stopAudioImmediately();
        return;
      }
      
      // Se está ocupado, ignorar
      if (processingQuestion.current || isProcessing || isPlayingAudio || isActuallyPlaying) {
        console.log('⏸️ Ocupado, ignorando captura');
        return;
      }
      
      // Se for resultado final, processar
      if (isFinal) {
        console.log('✅ Processando pergunta completa');
        
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
  // START ASSISTANT
  // ========================================
  async function handleStart() {
    console.log('🚀 Iniciando assistente de voz (Google Speech WebSocket)...');
    
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
    
    setTimeout(async () => {
      if (isActiveRef.current) {
        await startGoogleSpeech();
      }
    }, 300);
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
      // ✅ NOVO: Perguntas Frequentes
      case 'faq':
      case 'perguntas_frequentes':
        await playText('Me faça qualquer pergunta sobre nossos serviços que responderei com base nas perguntas mais frequentes.');
        break;
      
      // ✅ NOVO: ChatGPT / Perguntas Gerais
      case 'chatgpt':
      case 'perguntas_gerais':
      case 'general_questions':
        await playText('Pode me fazer qualquer pergunta. Estou aqui para te ajudar com informações gerais.');
        break;
      
      // PIX
      case 'pix_generate':
      case 'gerar_pix':
        await playText('Me chame e diga: gerar PIX de 50 reais, que já crio a cobrança para você.');
        break;
        
      // WhatsApp
      case 'qrcode_whatsapp':
      case 'whatsapp':
        await handleWhatsAppCommand();
        break;
        
      // Instagram
      case 'qrcode_instagram':
      case 'instagram':
        await handleInstagramCommand();
        break;
      
      // ✅ NOVO: Nosso Instagram (caso seja diferente)
      case 'nosso_instagram':
        await playText('Vou te mostrar nosso Instagram. Siga a gente lá!');
        await handleInstagramCommand();
        break;
      
      // ✅ NOVO: Nosso WhatsApp (caso seja diferente)
      case 'nosso_whatsapp':
        await playText('Aqui está nosso WhatsApp. Entre em contato a qualquer momento!');
        await handleWhatsAppCommand();
        break;
        
      // Fallback
      default:
        await playText(`A função ${functionKey} ainda não está configurada. Entre em contato com o suporte.`);
    }
    
    await registerFunctionUsage(functionKey, 0);
    
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

  // ========================================
  // NUMBER CONVERSION
  // ========================================
function convertWordsToNumbers(text: string): string {
  const numberWords: {[key: string]: string} = {
    // Unidades
    'zero': '0', 'um': '1', 'dois': '2', 'três': '3', 'tres': '3',
    'quatro': '4', 'cinco': '5', 'seis': '6', 'sete': '7',
    'oito': '8', 'nove': '9',
    
    // Dezenas especiais
    'dez': '10', 'onze': '11', 'doze': '12', 'treze': '13',
    'catorze': '14', 'quatorze': '14', 'quinze': '15',
    'dezesseis': '16', 'dezessete': '17', 'dezoito': '18', 'dezenove': '19',
    
    // Dezenas
    'vinte': '20', 'trinta': '30', 'quarenta': '40', 'cinquenta': '50',
    'sessenta': '60', 'setenta': '70', 'oitenta': '80', 'noventa': '90',
    
    // Centenas
    'cem': '100', 'cento': '100',
    'duzentos': '200', 'trezentos': '300', 'quatrocentos': '400',
    'quinhentos': '500', 'seiscentos': '600', 'setecentos': '700',
    'oitocentos': '800', 'novecentos': '900',
    
    // Milhares
    'mil': '1000',
  };
  
  let result = text;
  
  // ✅ Processar composições como "vinte e cinco" → "25"
  const composicoes = [
    { pattern: /vinte e um/gi, value: '21' },
    { pattern: /vinte e dois/gi, value: '22' },
    { pattern: /vinte e três/gi, value: '23' },
    { pattern: /vinte e quatro/gi, value: '24' },
    { pattern: /vinte e cinco/gi, value: '25' },
    { pattern: /trinta e cinco/gi, value: '35' },
    { pattern: /quarenta e cinco/gi, value: '45' },
    { pattern: /cinquenta e cinco/gi, value: '55' },
    // Adicione mais conforme necessário
  ];
  
  for (const comp of composicoes) {
    result = result.replace(comp.pattern, comp.value);
  }
  
  // ✅ Substituir palavras individuais
  for (const [word, number] of Object.entries(numberWords)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, number);
  }
  
  return result;
}

function correctTranscriptionErrors(text: string): string {
  let corrected = text;
  
  // Mapa de correções (palavra errada → palavra correta)
  const corrections: { [key: string]: string } = {
    // PIX e variações
    'picos': 'pix',
    'picks': 'pix',
    'pix': 'pix', // manter original
    'piche': 'pix',
    'pics': 'pix',
    'pixel': 'pix',
    
    // Cobrança
    'cobranca': 'cobrança',
    'cobranças': 'cobrança',
    
    // WhatsApp
    'watts': 'whatsapp',
    'what\'s': 'whatsapp',
    'whats': 'whatsapp',
    'zap': 'whatsapp',
    'zapp': 'whatsapp',
    
    // Instagram
    'instagran': 'instagram',
    'insta': 'instagram',
    'istagran': 'instagram',
    
    // Números problemáticos
    'sentavos': 'centavos',
    'reais': 'reais',
    'real': 'reais',
    
    // Ações
    'gera': 'gerar',
    'cria': 'criar',
    'faz': 'fazer',
    'cobra': 'cobrar',
  };
  
  // Aplicar correções (case-insensitive)
  for (const [wrong, right] of Object.entries(corrections)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    corrected = corrected.replace(regex, right);
  }
  
  return corrected;
}

  // ========================================
  // VOICE COMMAND DETECTION
  // ========================================
async function detectVoiceCommand(transcript: string): Promise<boolean> {
  // ✅ PASSO 1: Corrigir erros de transcrição PRIMEIRO
  const correctedTranscript = correctTranscriptionErrors(transcript);
  const lowerTranscript = correctedTranscript.toLowerCase().trim();
  
  console.log('🔍 Original:', transcript);
  if (correctedTranscript !== transcript) {
    console.log('🔧 Corrigido:', correctedTranscript);
  }
  console.log('🔍 Processando:', lowerTranscript);
  
  // ✅ PASSO 2: Converter números por extenso
  const transcriptWithNumbers = convertWordsToNumbers(lowerTranscript);
  console.log('🔢 Após conversão:', transcriptWithNumbers);
  
  // WhatsApp
  const whatsappTriggers = [
    'whatsapp', 'whats', 'zap', 'número', 'contato'
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
    'instagram', 'insta', 'arroba', 'perfil'
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
    'confirmar', 'confirmado', 'paguei', 'já paguei', 'pagamento confirmado'
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
    'cancelar', 'cancela', 'desistir', 'não quero', 'fechar'
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
  
  // ✅ PIX Generation - VERSÃO MELHORADA com correção
  console.log('💰 Procurando padrões PIX...');
  
  // Padrões ampliados e mais flexíveis
  const pixPatterns = [
    // "gerar/criar/fazer pix de 50"
    /(?:gerar|gera|criar|cria|fazer|faz|faça|quero)\s*(?:um\s*|uma\s*)?(pix|cobrança|cobranca)\s*(?:de|com|no valor de)?\s*(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?/i,
    
    // "pix de 100 reais"
    /(pix|cobrança|cobranca)\s*(?:de|com|no valor de)?\s*(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?/i,
    
    // "cobrar 25 reais"
    /(?:cobrar|cobra)\s*(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?/i,
    
    // "50 reais no pix" ou "50 no pix"
    /(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?\s*(?:no|via|pelo|por)?\s*pix/i,
    
    // "valor de 30" (quando contexto já é PIX)
    /(?:valor|no valor)\s*(?:de|com)?\s*(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)/i,
  ];
  
  for (const pattern of pixPatterns) {
    const match = transcriptWithNumbers.match(pattern);
    if (match) {
      console.log('🎯 Pattern matched:', pattern.source);
      console.log('📝 Match completo:', match[0]);
      
      // Tentar extrair valor de diferentes grupos de captura
      let amountStr = match[2] || match[1];
      
      if (!amountStr) {
        console.log('⚠️ Valor não encontrado no match');
        continue;
      }
      
      console.log('💵 Valor extraído:', amountStr);
      
      // Limpar e converter
      amountStr = amountStr.replace(/[^\d,.]/, '').replace(',', '.');
      const amount = parseFloat(amountStr);
      
      console.log('💰 Valor convertido:', amount);
      
      if (amount > 0 && amount < 100000) { // Limite razoável
        console.log(`✅ PIX detectado! Valor: R$ ${amount.toFixed(2)}`);
        
        const isEnabled = await checkIfFunctionIsEnabled('pix_generate');
        
        if (!isEnabled) {
          await playText('A função PIX está desativada no momento.');
          return true;
        }
        
        await handlePixCommand(amount);
        await registerFunctionUsage('pix_generate', 0);
        return true;
      } else {
        console.log('⚠️ Valor fora do limite:', amount);
      }
    }
  }
  
  // ✅ FALLBACK: Se mencionou PIX mas não encontrou valor
  if (lowerTranscript.includes('pix')) {
    console.log('⚠️ Mencionou PIX mas sem valor claro');
    await playText('Qual o valor do PIX que você deseja gerar?');
    return true;
  }
  
  console.log('❌ Nenhum comando detectado');
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

      console.log('📤 Enviando para /api/voice/process...');
      
      const formData = new FormData();
      const textBlob = new Blob([message], { type: 'text/plain' });
      formData.append('audio', textBlob);
      formData.append('companyId', companyId);
      formData.append('directQuestion', message);

      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.status}`);
      }

      console.log('✅ Resposta recebida');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.05;
      
      currentAudioRef.current = audio;
      setIsPlayingAudio(true);
      
      audio.onended = () => {
        console.log('✅ Resposta tocada');
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        console.error('❌ Erro ao tocar áudio');
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
      };

      await audio.play();

    } catch (error: any) {
      console.error('❌ Erro ao processar mensagem:', error);
      await playText('Desculpe, ocorreu um erro ao processar sua mensagem.');
    } finally {
      setIsProcessing(false);
      
      setTimeout(async () => {
        if (isActiveRef.current) {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
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
    
    setTimeout(async () => {
      if (isActiveRef.current) {
        shouldProcessAudio.current = true;
        await startGoogleSpeech();
      }
    }, 500);
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
      
      setTimeout(async () => {
        if (isActiveRef.current) {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
        }
      }, 300);
      return;
    }
    
    processQuestion(cleanTranscript);
  }

  async function processQuestion(questionText: string) {
    console.log('⚡ Processando:', questionText);
    
    // ✅ PARAR GOOGLE SPEECH!
    shouldProcessAudio.current = false;
    await stopGoogleSpeech();
    console.log('🛑 Google Speech parado para evitar feedback');
    
    const isCommand = await detectVoiceCommand(questionText);
    
    if (isCommand) {
      console.log('✅ Comando processado');
      processingQuestion.current = false;
      
      // ✅ REATIVAR GOOGLE SPEECH APÓS 500MS
      setTimeout(async () => {
        shouldProcessAudio.current = true;
        await startGoogleSpeech();
        console.log('🎤 Google Speech reiniciado após comando');
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

      console.log('🔄 Preparando resposta de áudio...');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.playbackRate = 1.05;
      
      currentAudioRef.current = audio;
      
      setIsPlayingAudio(true);
      
      audio.onplay = () => {
        console.log('🔊 Áudio iniciou');
        setIsPlayingAudio(true);
      };
      
      // ✅ REATIVAR GOOGLE SPEECH APÓS 2 SEGUNDOS
      audio.onended = () => {
        console.log('✅ Resposta concluída');
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        
        setTimeout(async () => {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
          console.log('🎤 Google Speech reiniciado após resposta');
        }, 2000);
      };

      // ✅ REATIVAR GOOGLE SPEECH APÓS 1 SEGUNDO (erro)
      audio.onerror = (e) => {
        console.error('❌ Erro ao tocar áudio:', e);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        
        setTimeout(async () => {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
          console.log('🎤 Google Speech reiniciado após erro');
        }, 1000);
      };

      const safetyTimeout = setTimeout(() => {
        if (!isPlayingAudio && currentAudioRef.current === audio) {
          console.log('⚠️ Áudio não iniciou, forçando reinício');
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
      
      // ✅ REATIVAR GOOGLE SPEECH APÓS 1 SEGUNDO
      setTimeout(async () => {
        shouldProcessAudio.current = true;
        await startGoogleSpeech();
        console.log('🎤 Google Speech reiniciado após erro crítico');
      }, 1000);
    }
  }

async function playProcessingFeedback(): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔔 Tocando bipe de confirmação');
      
      // Bipe simples e profissional (440Hz por 150ms)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440; // Lá (A4) - tom agradável
      oscillator.type = 'sine'; // Onda senoidal suave
      
      gainNode.gain.value = 0.3; // Volume moderado
      
      const currentTime = audioContext.currentTime;
      
      // Fade in rápido (50ms)
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.05);
      
      // Fade out (50ms)
      gainNode.gain.setValueAtTime(0.3, currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.15);
      
      oscillator.start(currentTime);
      oscillator.stop(currentTime + 0.15);
      
      // Criar um HTMLAudioElement fake para compatibilidade
      const fakeAudio = new Audio();
      fakeAudio.onended = () => {};
      
      setTimeout(() => {
        resolve(fakeAudio);
      }, 150);
      
    } catch (err) {
      console.log('⚠️ Bipe falhou:', err);
      reject(err);
    }
  });
}

  async function playGoodbye() {
    try {
      await playText('Até logo!');
    } catch (e) {
      console.log('Erro despedida');
    }
    
    setTimeout(async () => {
      if (isActiveRef.current) {
        shouldProcessAudio.current = true;
        await startGoogleSpeech();
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
                No modo voz, utilize a palavra de ativação
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

            {showStartButton && permissionGranted && (
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