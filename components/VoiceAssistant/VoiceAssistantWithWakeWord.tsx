// components/VoiceAssistant/VoiceAssistantWithWakeWord.tsx
'use client';

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
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
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

  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(true);
  const lastRestartAttempt = useRef<number>(0);
  const audioUnlocked = useRef<boolean>(false);
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);
  const processingQuestion = useRef<boolean>(false);
  const consecutiveRestarts = useRef<number>(0);
  const lastRestartTime = useRef<number>(0);
  const conversationIdRef = useRef<string | null>(null);

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
    console.log('🎯 Inicializando WakeWordDetector...');
    wakeWordDetectorRef.current = new WakeWordDetector({
      keywords: wakeWords,
      threshold: 0.7,
      contextWindow: 5,
      usePhoneticMatching: true,
      excludeWords: endCommands
    });
  }, [wakeWords.join(','), endCommands.join(',')]);

  useEffect(() => {
    isActiveRef.current = true;
    requestMicrophonePermission();
    
    return () => {
      isActiveRef.current = false;
      cleanup();
    };
  }, []);

  function cleanup() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
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
    console.log('🚀 Iniciando assistente estilo Alexa...');
    console.log('📱 Dispositivo:', isMobile ? 'MOBILE' : 'DESKTOP');
    
    unlockAudio();
    
    if (isMobile) {
      try {
        const testAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        testAudio.volume = 0.01;
        await testAudio.play();
        testAudio.pause();
        console.log('✅ Mobile: Contexto de áudio estabelecido');
      } catch (e) {
        console.log('⚠️ Mobile: Falha no contexto de áudio');
      }
    }
    
    setShowStartButton(false);
    
    if (onAssistantStart) {
      onAssistantStart();
    }
    
    setTimeout(() => {
      if (isActiveRef.current) {
        startWakeWordDetection();
      }
    }, 300);
  }

async function checkIfFunctionIsEnabled(functionKey: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // 1. Verificar se função existe e está ativa globalmente
    const { data: func } = await supabase
      .from('assistant_functions')
      .select('is_active')
      .eq('function_key', functionKey)
      .single();
    
    if (!func || !func.is_active) {
      return false;
    }
    
    // 2. Verificar se tem configuração específica da empresa
    const { data: setting } = await supabase
      .from('company_function_settings')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('function_key', functionKey)
      .single();
    
    // Se não tem configuração, assume ATIVA (padrão)
    if (!setting) {
      return true;
    }
    
    return setting.is_enabled;
    
  } catch (error) {
    console.error('Erro ao verificar função:', error);
    // Em caso de erro, assume ativa para não bloquear
    return true;
  }
}

// ========================================
// ATUALIZAR handleFunctionClick
// ========================================

async function handleFunctionClick(functionKey: string) {
  console.log('🎯 Função clicada no carrossel:', functionKey);
  
  // ✅ VERIFICAR SE FUNÇÃO ESTÁ ATIVA
  const isEnabled = await checkIfFunctionIsEnabled(functionKey);
  
  if (!isEnabled) {
    console.log('⚠️ Função desativada:', functionKey);
    await playText('Esta função está desativada no momento. Entre em contato com o suporte para ativá-la.');
    
    setTimeout(() => {
      if (isActiveRef.current) {
        startWakeWordDetection();
      }
    }, 500);
    
    return;
  }
  
  // Parar reconhecimento de voz
  if (recognitionRef.current) {
    try {
      recognitionRef.current.stop();
    } catch (e) {}
  }

  // Parar áudio se estiver tocando
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
    
    // ✅ REGISTRAR USO DA FUNÇÃO
    await registerFunctionUsage(functionKey, 0); // 0 créditos por enquanto
    
  } catch (error) {
    console.error('Erro ao executar função:', error);
    await playText('Desculpe, ocorreu um erro.');
  } finally {
    setIsProcessing(false);
    
    setTimeout(() => {
      if (isActiveRef.current) {
        startWakeWordDetection();
      }
    }, 500);
  }
}

// ========================================
// ADICIONAR FUNÇÃO DE REGISTRO DE USO
// ========================================

async function registerFunctionUsage(functionKey: string, creditsConsumed: number) {
  try {
    const supabase = createClient();
    
    // Usar a função SQL helper
    await supabase.rpc('register_function_usage', {
      p_company_id: companyId,
      p_function_key: functionKey,
      p_credits_consumed: creditsConsumed
    });
    
    console.log('✅ Uso registrado:', functionKey);
  } catch (error) {
    console.error('Erro ao registrar uso:', error);
    // Não bloqueamos a execução se registro falhar
  }
}

  async function detectVoiceCommand(transcript: string): Promise<boolean> {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    console.log('🔍 Detectando comandos de voz:', lowerTranscript);
    
    const whatsappTriggers = [
      'mostre o whatsapp',
      'qual o whatsapp',
      'qual é o whatsapp',
      'me passa o whatsapp',
      'whatsapp da empresa',
      'número do whatsapp',
      'quero o whatsapp'
    ];
    
    if (whatsappTriggers.some(trigger => lowerTranscript.includes(trigger))) {
      console.log('📱 Comando WhatsApp detectado!');
      // ✅ VERIFICAR SE ESTÁ ATIVO
      const isEnabled = await checkIfFunctionIsEnabled('qrcode_whatsapp');
    
      if (!isEnabled) {
        await playText('A função WhatsApp está desativada no momento.');
        return true; // Retorna true para indicar que processou
      }
    
      await handleWhatsAppCommand();
      await registerFunctionUsage('qrcode_whatsapp', 0);
      return true;
    }
    
    const instagramTriggers = [
      'mostre o instagram',
      'qual o instagram',
      'qual é o instagram',
      'me passa o instagram',
      'instagram da empresa',
      'arroba do instagram',
      'quero o instagram'
    ];
    
    if (instagramTriggers.some(trigger => lowerTranscript.includes(trigger))) {
      console.log('📸 Comando Instagram detectado!');
      await handleInstagramCommand();
      return true;
    }
    
    const confirmTriggers = [
      'confirmar pix',
      'confirmar pis',
      'confirmar picos',
      'confirma pix',
      'confirmar o pix',
      'confirma o pix',
      'confirme o pix',
      'pix confirmado',
      'paguei o pix',
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
      'cancelar pix',
      'cancelar pis',
      'cancelar picos',
      'cancela pix',
      'cancelar o pix',
      'cancela o pix',
      'cancele o pix',
      'desistir do pix',
      'não quero',
      'não vou pagar',
      'fechar pix'
    ];
    
    if (cancelTriggers.some(trigger => lowerTranscript.includes(trigger))) {
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
    
    const pixRegex = /(?:gerar|gera|cria|criar|faça|faz|fazer)\s+(?:um\s+)?(?:pix|pics|pic|picks|pixs)(?:\s+de)?(?:\s+r\$)?(?:\s+reais?)?(?:\s+)?([\d]+(?:[,.]\d{1,2})?)/i;
    const pixMatch = lowerTranscript.match(pixRegex);
    
    if (pixMatch) {
      const amountStr = pixMatch[1].replace(',', '.');
      const amount = parseFloat(amountStr);
      
      if (amount > 0) {
        console.log('💰 Comando PIX detectado! Valor:', amount);
        await handlePixCommand(amount);
        return true;
      }
    }
    
    const pixFallbackRegex = /(?:pix|pics|pic|picks|pixs).*?([\d]+(?:[,.]\d{1,2})?)/i;
    const pixFallbackMatch = lowerTranscript.match(pixFallbackRegex);
    
    if (pixFallbackMatch) {
      const amountStr = pixFallbackMatch[1].replace(',', '.');
      const amount = parseFloat(amountStr);
      
      if (amount > 0) {
        console.log('💰 Comando PIX detectado (fallback)! Valor:', amount);
        await handlePixCommand(amount);
        return true;
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
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

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
          startWakeWordDetection();
        }
      }, 500);
    }
  };

  function startWakeWordDetection() {
    if (!('webkitSpeechRecognition' in window)) {
      setError('Use Chrome ou Edge.');
      return;
    }

    const now = Date.now();
    if (now - lastRestartAttempt.current < 500) {
      console.log('⚠️ Tentativa de restart muito rápida, aguardando...');
      return;
    }
    lastRestartAttempt.current = now;

    if (recognitionRef.current) {
      try {
        console.log('🧹 Limpando recognition anterior');
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (e) {
        console.log('⚠️ Erro ao limpar recognition:', e);
      }
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = isMobile ? false : true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.maxAlternatives = isMobile ? 3 : 5;

      recognition.onstart = () => {
        console.log(`🎤 Wake word detection ATIVA (continuous=${recognition.continuous})`);
        setIsListening(true);
        setError('');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        
        for (let i = event.results.length - 1; i >= 0; i--) {
          if (event.results[i].isFinal) {
            transcript = event.results[i][0].transcript;
            break;
          }
        }
        
        if (!transcript) {
          transcript = event.results[event.results.length - 1][0].transcript;
        }
        
        transcript = transcript.toLowerCase().trim();
        const isFinal = event.results[event.results.length - 1].isFinal;
        
        console.log(`${isFinal ? '✅ Final' : '📝 Interim'}: "${transcript}"`);
        
        const normalizedTranscript = transcript.toLowerCase()
          .replace(/[.,!?]/g, '')
          .trim();
        
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
        
        console.log('🔍 Verificando comandos de stop:', {
          transcript: normalizedTranscript,
          hasExplicitStop,
          isProcessing,
          isPlayingAudio,
          isActuallyPlaying,
          isFinal,
          hasAudioRef: currentAudioRef.current !== null
        });
        
        if (hasExplicitStop && isFinal && (isProcessing || isPlayingAudio || isActuallyPlaying)) {
          console.log('🛑 COMANDO STOP EXPLÍCITO DETECTADO:', transcript);
          console.log('✅ PARANDO áudio imediatamente!');
          stopAudioImmediately();
          return;
        }
        
        if (processingQuestion.current || isProcessing || isPlayingAudio || isActuallyPlaying) {
          console.log('⏸️ Ocupado, ignorando captura:', normalizedTranscript);
          return;
        }
        
        const detectionResult = wakeWordDetectorRef.current?.detect(transcript);
        
        if (detectionResult?.detected && detectionResult.keyword) {
          console.log(`🔍 Wake word detectada: "${detectionResult.keyword}"`);
          console.log(`📝 Transcrição: "${transcript}"`);
          
          if (isFinal) {
            console.log('✅ Processando pergunta completa');
            
            if (!audioUnlocked.current) {
              unlockAudio();
            }
            
            if (!processingQuestion.current) {
              processingQuestion.current = true;
              
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch (e) {}
              }
              
              processWakeWordQuestion(transcript);
            }
          } else {
            console.log('⏳ Aguardando transcrição final...');
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.log('⚠️ Recognition error:', event.error);
        
        if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'aborted') {
          return;
        }
        
        if (event.error === 'not-allowed') {
          setError('Permissão negada');
          setPermissionGranted(false);
        }
      };

      recognition.onend = () => {
        console.log('🔴 Recognition parou', {
          isActive: isActiveRef.current,
          processingQuestion: processingQuestion.current,
          isProcessing,
          isPlayingAudio,
          hasAudioRef: currentAudioRef.current !== null,
          permissionGranted
        });
        
        if (isMobile) {
          setIsListening(false);
          
          if (isActiveRef.current && 
              !processingQuestion.current && 
              !isProcessing && 
              !isPlayingAudio && 
              permissionGranted) {
            
            console.log('📱 Mobile: Auto-restart em 300ms...');
            setTimeout(() => {
              if (isActiveRef.current && 
                  !processingQuestion.current && 
                  !isProcessing && 
                  !isPlayingAudio) {
                startWakeWordDetection();
              }
            }, 300);
          } else {
            console.log('⏸️ Mobile: Restart suspenso (ocupado)');
          }
        } else {
          if (!processingQuestion.current && !isProcessing && !isPlayingAudio) {
            setIsListening(false);
          }
          
          if (isActiveRef.current && 
              !processingQuestion.current && 
              !isProcessing && 
              !isPlayingAudio && 
              permissionGranted) {
            
            const now = Date.now();
            const timeSinceLastRestart = now - lastRestartTime.current;
            
            if (timeSinceLastRestart < 2000) {
              consecutiveRestarts.current += 1;
            } else {
              consecutiveRestarts.current = 0;
            }
            
            if (consecutiveRestarts.current >= 3) {
              console.log('⚠️ Loop detectado! Aguardando 3s antes de reiniciar...');
              consecutiveRestarts.current = 0;
              
              setTimeout(() => {
                if (isActiveRef.current && 
                    !processingQuestion.current && 
                    !isProcessing && 
                    !isPlayingAudio) {
                  lastRestartTime.current = Date.now();
                  startWakeWordDetection();
                }
              }, 1500);
              return;
            }
            
            console.log('🔄 Desktop: Auto-restart em 500ms...', {
              consecutiveRestarts: consecutiveRestarts.current
            });
            
            setTimeout(() => {
              if (isActiveRef.current && 
                  !processingQuestion.current && 
                  !isProcessing && 
                  !isPlayingAudio) {
                lastRestartTime.current = Date.now();
                startWakeWordDetection();
              } else {
                console.log('⏸️ Restart cancelado: sistema ocupado');
              }
            }, 300);
          } else {
            console.log('⏸️ Restart suspenso: processando ou tocando áudio');
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (err) {
      console.error('❌ Erro iniciar recognition:', err);
      setTimeout(() => {
        if (isActiveRef.current && permissionGranted && !processingQuestion.current) {
          startWakeWordDetection();
        }
      }, 2000);
    }
  }

  function stopAudioImmediately() {
    console.log('🛑 STOP: Parando áudio imediatamente');
    
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      } catch (e) {
        console.log('⚠️ Erro ao parar áudio:', e);
      }
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
    
    console.log('🔄 Reiniciando wake word após interrupção...');
    setTimeout(() => {
      if (isActiveRef.current) {
        startWakeWordDetection();
      }
    }, 200);
  }

  function processWakeWordQuestion(transcript: string) {
    console.log('📋 processWakeWordQuestion chamada');
    console.log('  transcript:', transcript);
    console.log('  processingQuestion.current:', processingQuestion.current);
    
    if (recognitionRef.current) {
      try {
        console.log('🛑 Parando recognition antes de processar');
        recognitionRef.current.stop();
      } catch (e) {
        console.log('⚠️ Erro ao parar recognition:', e);
      }
    }
    
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
      console.log('❌ Sem pergunta, resetando e voltando para wake word');
      processingQuestion.current = false;
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
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
      console.log('✅ Comando processado, retornando ao wake word');
      processingQuestion.current = false;
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
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

      console.log('🔄 Reiniciando wake word detection ANTES do áudio...');
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 100);

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
        
        console.log('🔄 Garantindo wake word detection ativa...');
        setTimeout(() => {
          if (isActiveRef.current && !recognitionRef.current) {
            startWakeWordDetection();
          }
        }, 200);
      };

      audio.onerror = (e) => {
        console.error('❌ Erro ao tocar áudio:', e);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        
        setTimeout(() => {
          if (isActiveRef.current) {
            console.log('🔄 Reiniciando após erro...');
            startWakeWordDetection();
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
            startWakeWordDetection();
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
                        startWakeWordDetection();
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
            startWakeWordDetection();
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
          console.log('🔄 Reiniciando após erro...');
          startWakeWordDetection();
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
        startWakeWordDetection();
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

        {/* ✨ CARROSSEL NO MODO MAXIMIZADO */}
        {!showStartButton && (
          <div className="w-full max-w-4xl">
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
              <>
                {/* ✨ CARROSSEL NO MODO NORMAL */}
                <div className="w-full">
                  <FunctionCarousel
                    companyId={companyId}
                    onFunctionClick={handleFunctionClick}
                    theme={theme}
                  />
                </div>
                
                <div className="w-full mt-auto">
                  <TextInputChat
                    onSendMessage={handleTextMessage}
                    isProcessing={isProcessing || isPlayingAudio}
                    theme={theme}
                    disabled={false}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
