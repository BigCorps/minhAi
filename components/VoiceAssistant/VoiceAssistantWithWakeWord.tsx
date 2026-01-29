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
  
  // NOVA CORREÇÃO: Controle mais rigoroso para evitar loops no mobile
  const isRestartingRef = useRef<boolean>(false);
  const lastOnEndTime = useRef<number>(0);

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
    
    // Listener para cliques do carrossel externo (modo maximizado)
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
      
      // Se tem configuração, usar o valor dela
      return setting.is_enabled;
      
    } catch (error) {
      console.error('❌ Erro verificar função:', error);
      return false;
    }
  }

  async function handleFunctionClick(functionKey: string) {
    console.log('🔵 handleFunctionClick chamado:', functionKey);
    
    // Verificar se está processando ou falando
    if (isProcessing || isPlayingAudio) {
      console.log('⚠️ Ignorando clique: processando ou falando');
      return;
    }
    
    // Parar reconhecimento de voz
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        console.log('⚠️ Erro ao parar reconhecimento:', e);
      }
    }
    
    // Verificar se função está habilitada
    const isEnabled = await checkIfFunctionIsEnabled(functionKey);
    if (!isEnabled) {
      console.log('❌ Função desabilitada:', functionKey);
      await playText('Desculpe, esta função está desabilitada no momento.');
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
      return;
    }
    
    console.log('✅ Função habilitada, processando:', functionKey);
    
    try {
      setIsProcessing(true);
      
      let responseText = '';
      let shouldPlayResponse = true;
      
      switch (functionKey) {
        case 'whatsapp':
          const phoneNumber = '5511999999999'; // Substituir pelo número real
          const message = 'Olá! Vim através do assistente virtual.';
          const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
          
          // Gerar QR Code
          const whatsappQR = await generateQRCode(whatsappUrl);
          
          setQrCodeData({
            type: 'whatsapp',
            qrCodeUrl: whatsappQR,
            qrContent: whatsappUrl,
            displayText: 'Escaneie para abrir no WhatsApp',
            companyName: companyName
          });
          
          responseText = 'Aqui está o QR Code para nosso WhatsApp. Você pode escanear com seu celular.';
          break;

        case 'instagram':
          const instagramUsername = 'suaempresa'; // Substituir pelo username real
          const instagramUrl = `https://instagram.com/${instagramUsername}`;
          
          const instagramQR = await generateQRCode(instagramUrl);
          
          setQrCodeData({
            type: 'instagram',
            qrCodeUrl: instagramQR,
            qrContent: instagramUrl,
            displayText: 'Escaneie para seguir no Instagram',
            companyName: companyName
          });
          
          responseText = 'Aqui está o QR Code para nosso Instagram. Escaneie para nos seguir!';
          break;

        case 'chatgpt':
          responseText = 'Iniciando conversa livre com ChatGPT. Como posso ajudar você?';
          break;

        case 'pix':
          responseText = 'Para gerar um PIX, por favor me diga o valor que deseja pagar. Por exemplo: "Quero pagar 50 reais"';
          break;

        default:
          responseText = 'Função não implementada ainda.';
      }
      
      setIsProcessing(false);
      
      if (shouldPlayResponse && responseText) {
        await playText(responseText);
      }
      
      // Só retomar escuta se não tiver QR Code ativo
      if (!qrCodeData) {
        setTimeout(() => {
          if (isActiveRef.current) {
            startWakeWordDetection();
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar função:', error);
      setIsProcessing(false);
      setError('Erro ao processar a função');
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  async function generateQRCode(text: string): Promise<string> {
    try {
      const response = await fetch('/api/qrcode/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) throw new Error('Erro ao gerar QR Code');
      
      const data = await response.json();
      return data.qrCodeUrl;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw error;
    }
  }

  async function handleTextMessage(message: string) {
    if (!message.trim() || isProcessing || isPlayingAudio) {
      return;
    }
    
    console.log('💬 Mensagem de texto recebida:', message);
    
    // Parar reconhecimento se estiver ativo
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        console.log('⚠️ Erro ao parar reconhecimento:', e);
      }
    }
    
    // Processar como se fosse comando de voz
    await processVoiceCommand(message);
  }

  function handleCloseQRCode() {
    setQrCodeData(null);
    setPixConfirmationData(null);
    
    setTimeout(() => {
      if (isActiveRef.current) {
        startWakeWordDetection();
      }
    }, 500);
  }

  function handleCopyQRCode(content: string) {
    navigator.clipboard.writeText(content);
    console.log('✅ Copiado:', content);
  }

  async function handleConfirmPix(transactionId: string) {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/pix/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          companyId,
          conversationId: conversationIdRef.current
        })
      });
      
      if (!response.ok) throw new Error('Erro ao confirmar pagamento');
      
      const data = await response.json();
      
      setPixConfirmationData(null);
      setQrCodeData(null);
      
      setIsProcessing(false);
      
      await playText(data.message || 'Pagamento confirmado com sucesso! Obrigado!');
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro ao confirmar PIX:', error);
      setIsProcessing(false);
      await playText('Desculpe, houve um erro ao confirmar o pagamento. Tente novamente.');
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  function handleCancelPix() {
    setPixConfirmationData(null);
    setQrCodeData(null);
    
    playText('Pagamento cancelado.').then(() => {
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 500);
    });
  }

  function startWakeWordDetection() {
    // CORREÇÃO: Verificar se já está reiniciando
    if (isRestartingRef.current) {
      console.log('⚠️ Já está reiniciando, ignorando...');
      return;
    }
    
    if (!isActiveRef.current) {
      console.log('❌ Assistente inativo');
      return;
    }

    if (processingQuestion.current) {
      console.log('⏳ Ainda processando pergunta...');
      return;
    }

    console.log('🎤 Iniciando detecção de wake word...');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Reconhecimento de voz não suportado');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (e) {
        console.log('⚠️ Erro ao parar reconhecimento anterior');
      }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';
    recognition.maxAlternatives = 3;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (!isActiveRef.current) {
        recognition.stop();
        return;
      }
      console.log('✅ Reconhecimento iniciado');
      setIsListening(true);
      setError('');
      consecutiveRestarts.current = 0;
    };

    recognition.onresult = async (event: any) => {
      if (!isActiveRef.current || processingQuestion.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.toLowerCase().trim();
        
        console.log(`🎯 [${result.isFinal ? 'FINAL' : 'interim'}] Ouvido:`, transcript);

        if (result.isFinal) {
          const detectionResult = wakeWordDetectorRef.current?.detect(transcript);
          
          if (detectionResult?.detected) {
            console.log('🎉 WAKE WORD DETECTADA!');
            console.log('📝 Texto completo:', transcript);
            console.log('🔑 Wake word:', detectionResult.keyword);
            console.log('💬 Comando:', detectionResult.commandAfterKeyword);

            if (detectionResult.commandAfterKeyword && 
                detectionResult.commandAfterKeyword.trim().length > 0) {
              
              processingQuestion.current = true;
              
              try {
                recognition.stop();
                setIsListening(false);
              } catch (e) {
                console.log('⚠️ Erro ao parar reconhecimento');
              }

              await playFeedbackSound();
              await processVoiceCommand(detectionResult.commandAfterKeyword);
            }
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.log('❌ Erro reconhecimento:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('⚠️ Nenhuma fala detectada, reiniciando...');
        if (isActiveRef.current && !processingQuestion.current) {
          setTimeout(() => {
            if (isActiveRef.current && !isRestartingRef.current) {
              startWakeWordDetection();
            }
          }, 500);
        }
        return;
      }
      
      if (event.error === 'aborted') {
        console.log('⚠️ Reconhecimento abortado');
        return;
      }

      setError(`Erro: ${event.error}`);
      
      if (isActiveRef.current && !processingQuestion.current) {
        setTimeout(() => {
          if (isActiveRef.current && !isRestartingRef.current) {
            startWakeWordDetection();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      console.log('🔴 Reconhecimento encerrado');
      setIsListening(false);

      // CORREÇÃO PRINCIPAL: Debounce para evitar múltiplos onend
      const now = Date.now();
      if (now - lastOnEndTime.current < 1000) {
        console.log('⚠️ onend muito rápido, ignorando (debounce)');
        return;
      }
      lastOnEndTime.current = now;

      // CORREÇÃO: Verificar se já está reiniciando
      if (isRestartingRef.current) {
        console.log('⚠️ Já está reiniciando, pulando restart adicional');
        return;
      }

      if (!isActiveRef.current) {
        console.log('❌ Assistente inativo, não reiniciar');
        return;
      }

      if (processingQuestion.current) {
        console.log('⏳ Processando pergunta, não reiniciar ainda');
        return;
      }

      // CORREÇÃO: Mobile precisa de delay maior entre reinícios
      const delayBeforeRestart = isMobile ? 800 : 500;

      console.log(`🔄 Agendando restart em ${delayBeforeRestart}ms...`);
      
      // CORREÇÃO: Marcar que está reiniciando
      isRestartingRef.current = true;
      
      setTimeout(() => {
        if (isActiveRef.current && !processingQuestion.current) {
          console.log('🔄 Executando restart...');
          isRestartingRef.current = false; // Liberar flag antes de reiniciar
          startWakeWordDetection();
        } else {
          isRestartingRef.current = false; // Liberar flag se não for reiniciar
          console.log('❌ Condições mudaram, restart cancelado');
        }
      }, delayBeforeRestart);
    };

    try {
      recognition.start();
      console.log('🚀 Start() chamado');
    } catch (e: any) {
      console.log('❌ Erro ao iniciar:', e.message);
      setError('Erro ao iniciar reconhecimento');
      
      // CORREÇÃO: Liberar flag em caso de erro
      isRestartingRef.current = false;
      
      setTimeout(() => {
        if (isActiveRef.current && !isRestartingRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  async function processVoiceCommand(command: string) {
    console.log('🎯 Processando comando:', command);
    setIsProcessing(true);

    const lowerCommand = command.toLowerCase();

    const isEndCommand = endCommands.some(cmd => lowerCommand.includes(cmd));
    if (isEndCommand) {
      console.log('👋 Comando de despedida detectado');
      setIsProcessing(false);
      await playGoodbye();
      return;
    }

    // Verificar comandos de PIX
    const pixMatch = lowerCommand.match(/(?:pagar|pagamento|pix).*?(\d+(?:[,.]\d{1,2})?)\s*(?:reais?|r\$)?/i);
    if (pixMatch) {
      const amount = pixMatch[1].replace(',', '.');
      await handlePixPayment(amount);
      processingQuestion.current = false;
      return;
    }

    try {
      if (!conversationIdRef.current) {
        conversationIdRef.current = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      const response = await fetch('/api/assistant/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: command,
          companyId,
          conversationId: conversationIdRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Resposta recebida:', data);

      setIsProcessing(false);
      
      if (data.response) {
        await playText(data.response);
      }

      processingQuestion.current = false;

      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 500);

    } catch (err: any) {
      console.error('❌ Erro ao processar:', err);
      setIsProcessing(false);
      setError('Erro ao processar pergunta');
      
      processingQuestion.current = false;

      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  async function handlePixPayment(amount: string) {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/pix/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          companyId,
          conversationId: conversationIdRef.current
        })
      });
      
      if (!response.ok) throw new Error('Erro ao gerar PIX');
      
      const data = await response.json();
      
      setPixConfirmationData({
        transactionId: data.transactionId,
        amount: data.amount,
        qrCodeUrl: data.qrCodeUrl,
        pixCode: data.pixCode
      });
      
      setIsProcessing(false);
      
      await playText(`PIX de ${data.amount} reais gerado. Por favor, escaneie o QR Code ou copie o código para realizar o pagamento.`);
      
    } catch (error) {
      console.error('❌ Erro ao gerar PIX:', error);
      setIsProcessing(false);
      await playText('Desculpe, houve um erro ao gerar o PIX. Tente novamente.');
      
      processingQuestion.current = false;
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  async function playFeedbackSound(): Promise<HTMLAudioElement | null> {
    return new Promise(async (resolve, reject) => {
      try {
        if (feedbackAudioRef.current) {
          feedbackAudioRef.current.pause();
          feedbackAudioRef.current = null;
        }

        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: 'Sim?',
            speed: 1.2
          }),
        });

        if (!response.ok) {
          throw new Error('TTS feedback failed');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        feedbackAudioRef.current = audio;
        
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

      {/* Carrossel de ponta a ponta */}
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
