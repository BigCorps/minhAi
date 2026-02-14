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
import { generateWakeWordVariations } from '@/lib/wake-word-generator';
import { VoiceCommandProcessor } from '@/lib/voice-command-processor';
import { FUNCTIONS_REGISTRY } from '@/lib/functions-registry';

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  const [transcript, setTranscript] = useState('');

  // ✅ MUDANÇA 2: ADICIONAR STATES
  const [companyWakeWord, setCompanyWakeWord] = useState<string>('');
  const [companyGreeting, setCompanyGreeting] = useState<string>('');

  // ✅ PASSO 1: Novo state para guardar configs das funções
  const [functionSettings, setFunctionSettings] = useState<Record<string, {
    saveToHistory: boolean;
    creditsPerUse: number;
  }>>({});

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

  // ✅ NOVA ARQUITETURA: Processador de comandos
  const [commandProcessor, setCommandProcessor] = useState<VoiceCommandProcessor | null>(null);
  const [activeModal, setActiveModal] = useState<{
    type: string;
    data: any;
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
    
    // ✅ Atalho ESC para parar
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('⌨️ ESC pressionado - parando tudo');
        stopEverything();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      isActiveRef.current = false;
      cleanup();
      window.removeEventListener('voiceAssistantFunctionClick', handleExternalFunctionClick);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // ========================================
  // ✅ MUDANÇA 3: CARREGAR CONFIG DO BANCO
  // ========================================
  useEffect(() => {
    async function loadCompanyConfig() {
      if (!companyId) return;
      
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('companies')
          .select('wake_word, greeting_message')
          .eq('id', companyId)
          .single();
        
        if (error) {
          console.error('❌ Erro ao carregar config:', error);
          return;
        }
        
        if (data) {
          const wakeWordFromDb = data.wake_word || wakeWord || 'gerente';
          const greetingFromDb = data.greeting_message || greetingMessage || 'Oi! Como posso ajudar?';
          
          setCompanyWakeWord(wakeWordFromDb);
          setCompanyGreeting(greetingFromDb);
          
          console.log('✅ Config carregada:');
          console.log('   Wake word:', wakeWordFromDb);
          console.log('   Saudação:', greetingFromDb);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar config:', error);
      }
    }
    
    loadCompanyConfig();
  }, [companyId, wakeWord, greetingMessage]);

  // ========================================
  // ✅ PASSO 1: useEffect para carregar function settings
  // ========================================
  useEffect(() => {
    async function loadFunctionSettings() {
      if (!companyId) return;

      try {
        const supabase = createClient();

        // Busca configurações globais (assistant_functions)
        // JOIN com configurações específicas da empresa (company_function_settings)
        const { data, error } = await supabase
          .from('assistant_functions')
          .select(`
            function_key,
            save_to_history,
            credits_per_use,
            company_function_settings!inner(
              is_enabled,
              custom_credits_per_use
            )
          `)
          .eq('company_function_settings.company_id', companyId)
          .eq('is_active', true);

        if (error || !data) {
          // Fallback: buscar só assistant_functions sem join
          const { data: fallback } = await supabase
            .from('assistant_functions')
            .select('function_key, save_to_history, credits_per_use')
            .eq('is_active', true);

          if (fallback) {
            const settings: Record<string, any> = {};
            fallback.forEach(f => {
              settings[f.function_key] = {
                saveToHistory: f.save_to_history,
                creditsPerUse: f.credits_per_use,
              };
            });
            setFunctionSettings(settings);
          }
          return;
        }

        // Monta mapa com custom_credits_per_use da empresa tendo prioridade
        const settings: Record<string, any> = {};
        data.forEach(f => {
          const companySetting = f.company_function_settings?.[0];
          settings[f.function_key] = {
            saveToHistory: f.save_to_history,
            creditsPerUse: companySetting?.custom_credits_per_use ?? f.credits_per_use,
          };
        });

        setFunctionSettings(settings);
        console.log('✅ Function settings carregados:', settings);

      } catch (error) {
        console.error('❌ Erro ao carregar function settings:', error);
      }
    }

    loadFunctionSettings();
  }, [companyId]);

  // ========================================
  // ✅ NOVA ARQUITETURA: Inicializar Processador
  // ========================================
  useEffect(() => {
    async function initProcessor() {
      if (!companyId) return;
      
      const processor = new VoiceCommandProcessor(companyId);
      await processor.initialize();
      setCommandProcessor(processor);
      
      console.log('✅ VoiceCommandProcessor inicializado');
    }
    
    initProcessor();
  }, [companyId]);

  // ========================================
  // ✅ MUDANÇA 4: ATUALIZAR WAKEWORDDETECTOR
  // ========================================
  useEffect(() => {
    if (!companyWakeWord) return;
    
    console.log('🎯 Inicializando WakeWordDetector...');
    console.log('   Wake word principal:', companyWakeWord);
    
    // Gerar variações automáticas
    const generated = generateWakeWordVariations(companyWakeWord, true, []);
    
    console.log(`   ${generated.variations.length} variações:`, generated.variations);
    
    wakeWordDetectorRef.current = new WakeWordDetector({
      keywords: [
        companyWakeWord, // Wake word principal do banco
        ...generated.variations.slice(0, 10), // Primeiras 10 variações
        'gerente', // Fallbacks
        'atendente',
        'assistente',
        'oi',
        'olá'
      ],
      threshold: 0.7,
      contextWindow: 5,
      usePhoneticMatching: true,
      excludeWords: endCommands
    });
    
    console.log('✅ WakeWordDetector inicializado');
  }, [companyWakeWord, endCommands.join(',')]);

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
    if (!isActiveRef.current || !shouldProcessAudio.current) return;
    
    try {
      if (googleSpeechRef.current) {
        googleSpeechRef.current.stopRecording();
        googleSpeechRef.current.disconnect();
      }
      
      googleSpeechRef.current = new GoogleSpeechWebSocket({
        onTranscript: (text, isFinal) => {
          handleGoogleTranscript(text, isFinal);
        },
        onError: (err) => {
          console.error('❌ Erro Google Speech:', err);
          setIsListening(false);
        },
        // ✅ ADICIONE/ATUALIZE ESTE CALLBACK:
        onStatusChange: (status) => {
          // O status 'recording' agora significa que voz real foi detectada localmente
          setIsListening(status === 'recording');
        }
      });
      
      await googleSpeechRef.current.connect();
      await googleSpeechRef.current.startRecording();
      
      console.log('🎤 Google Speech WebSocket iniciado (VAD Local Ativo)');
      
    } catch (err) {
      console.error('❌ Erro ao iniciar Google Speech:', err);
      setIsListening(false);
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

  // ========================================
  // FUNÇÃO DE DETECÇÃO DE STOP
  // ========================================
  function detectStopCommand(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    
    const stopPhrases = [
      // Comandos diretos
      'pare',
      'para',
      'parar',
      'stop',
      'cala boca',
      'cala a boca',
      'silêncio',
      'silencio',
      'quieto',
      'chega',
      'cancela',
      'cancelar',
      
      // Variações
      'para de falar',
      'pare de falar',
      'cale a boca',
      'fica quieto',
      'para aí',
      'para ai',
      'tchau',
      'obrigado tchau',
      'tá bom tchau',
      'ta bom tchau',
      
      // Negações
      'não quero',
      'nao quero',
      'esquece',
      'deixa pra lá',
      'deixa pra la'
    ];
    
    // Verificar se o texto exato está na lista
    if (stopPhrases.includes(lowerText)) {
      return true;
    }
    
    // Verificar se alguma frase de parada está contida no texto
    return stopPhrases.some(phrase => {
      const words = phrase.split(' ');
      if (words.length === 1) {
        // Palavra única: deve ser palavra completa
        const regex = new RegExp(`\\b${phrase}\\b`, 'i');
        return regex.test(lowerText);
      } else {
        // Frase: deve conter a frase completa
        return lowerText.includes(phrase);
      }
    });
  }

  // ========================================
  // ✅ MUDANÇA 5: EXTRACTCOMMAND()
  // ========================================
  function extractCommand(
    transcript: string, 
    wakeWordResult: { detected: boolean; keyword?: string; confidence: number; matchedText?: string }
  ): string {
    let text = transcript.toLowerCase().trim();
    
    // 1. Remover wake word matched (detectada pelo fuzzy matching)
    if (wakeWordResult.matchedText) {
      const matched = wakeWordResult.matchedText.toLowerCase();
      text = text.replace(matched, '');
    }
    
    // 2. Remover wake word original (garantia)
    if (wakeWordResult.keyword) {
      const keyword = wakeWordResult.keyword.toLowerCase();
      text = text.replace(keyword, '');
    }
    
    // 3. Remover vírgulas, pontos e espaços no início
    text = text.replace(/^[,.\s]+/, '');
    
    // 4. Normalizar espaços múltiplos
    text = text.replace(/\s+/g, ' ');
    
    return text.trim();
  }

  // ========================================
  // ✅ MUDANÇA 6: VAD (Voice Activity Detection)
  // ========================================
  function detectHumanVoice(audioData: Float32Array): {
    isHuman: boolean;
    volume: number;
  } {
    // Calcular RMS (volume médio)
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    
    // Thresholds
    const BASE_THRESHOLD = 0.08; // 8% volume base
    
    // Durante fala do assistente, exigir volume 2x maior
    // Isso evita processar eco/própria voz (ECONOMIA!)
    const threshold = isPlayingAudio || isSpeaking
      ? BASE_THRESHOLD * 2.0  // 16% - precisa falar ALTO
      : BASE_THRESHOLD;       // 8% - volume normal
    
    const isHuman = rms > threshold;
    
    if (isHuman && (isPlayingAudio || isSpeaking)) {
      console.log(`🎤 VOZ ALTA detectada (${(rms * 100).toFixed(1)}%) - possível interrupção`);
    }
    
    return { isHuman, volume: rms };
  }

  // ========================================
  // ✅ PASSO 2: CORREÇÃO - saveInteractionToHistory()
  // ========================================
  async function saveInteractionToHistory(
    userMessage: string,
    assistantMessage: string,
  ) {
    try {
      const supabase = createClient();

      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          company_id: companyId,
          status: 'completed',
          total_messages: 2,
        })
        .select('id')
        .single();

      if (convError) {
        console.error('❌ Erro ao criar conversa:', convError);
        return;
      }

      // --- CORREÇÃO: Mudar de 'conversation_messages' para 'messages' ---
      await supabase.from('messages').insert([
        { conversation_id: conv.id, role: 'user', content: userMessage },
        { conversation_id: conv.id, role: 'assistant', content: assistantMessage },
      ]);

      console.log('✅ Salvo no histórico:', conv.id);
    } catch (error) {
      console.error('❌ Erro ao salvar histórico:', error);
    }
  }

  // ========================================
  // ✅ MUDANÇA 8: STOPEVERYTHING() ATUALIZADO
  // ========================================
  function stopEverything() {
    console.log('🛑 Parando tudo');
    
    // 1. Parar áudio atual
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.src = '';
        currentAudioRef.current = null;
      } catch (e) {
        console.error('Erro ao parar áudio:', e);
      }
    }
    
    // 2. Parar speech synthesis (fallback)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // 3. Parar feedback audio
    if (feedbackAudioRef.current) {
      try {
        feedbackAudioRef.current.pause();
        feedbackAudioRef.current = null;
      } catch (e) {}
    }
    
    // 4. Resetar estados
    setIsProcessing(false);
    setIsSpeaking(false);
    setIsPlayingAudio(false);
    
    // 5. Fechar modais
    setQrCodeData(null);
    setPixConfirmationData(null);
    
    // 6. Limpar flags
    processingQuestion.current = false;
    shouldProcessAudio.current = true;
    
    console.log('✅ Parado');
    
    // 7. Reiniciar Google Speech após 500ms
    setTimeout(async () => {
      if (isActiveRef.current) {
        await startGoogleSpeech();
      }
    }, 500);
  }

  // ========================================
  // ✅ MUDANÇA 7: HANDLEGOOGLETRANSCRIPT() SIMPLIFICADO
  // ========================================
  function handleGoogleTranscript(text: string, isFinal: boolean) {
    if (!text || !isActiveRef.current || !shouldProcessAudio.current) return;
    
    const lowerText = text.toLowerCase().trim();
    
    console.log(`${isFinal ? '✅ Final' : '📝 Interim'}: "${lowerText}"`);
    
    // ============================================
    // 1. COMANDO DE PARAR (sempre prioridade máxima)
    // ============================================
    if (detectStopCommand(lowerText)) {
      stopEverything();
      return;
    }
    
    // ============================================
    // 2. DETECTAR WAKE WORD
    // ============================================
    const wakeWordResult = wakeWordDetectorRef.current?.detect(lowerText);
    
    if (!wakeWordResult?.detected) {
      console.log('⏭️ Sem wake word - ignorando');
      return;
    }
    
    console.log(`✅ Wake word: "${wakeWordResult.keyword}"`);
    console.log(`   Confiança: ${Math.round(wakeWordResult.confidence * 100)}%`);
    console.log(`   Matched: "${wakeWordResult.matchedText}"`);
    
    // ============================================
    // 3. SE ESTAVA FALANDO, PARA PRIMEIRO
    // ============================================
    if (isPlayingAudio || isSpeaking) {
      console.log('⏸️ Interrupção detectada - parando fala atual');
      stopEverything();
      // NÃO retorna - continua processando o novo comando abaixo
    }
    
    // ============================================
    // 4. SE JÁ ESTÁ PROCESSANDO, IGNORA
    // ============================================
    if (processingQuestion.current || isProcessing) {
      console.log('⏸️ Já processando, ignorando');
      return;
    }
    
    // ============================================
    // 5. SE NÃO FOR FINAL, AGUARDA
    // ============================================
    if (!isFinal) {
      console.log('⏳ Aguardando transcrição final...');
      return;
    }
    
    // ============================================
    // 6. EXTRAIR COMANDO
    // ============================================
    const command = extractCommand(lowerText, wakeWordResult);
    
    console.log('💬 Comando extraído:', command || '(vazio - apenas wake word)');
    
    // ============================================
    // 7. PROCESSAR
    // ============================================
    if (!audioUnlocked.current) {
      unlockAudio();
    }
    
    if (!processingQuestion.current) {
      processingQuestion.current = true;
      
      // Sem comando = apenas cumprimentar
      if (!command) {
        const greeting = companyGreeting || greetingMessage || 'Oi! Como posso ajudar?';
        playText(greeting)
          .then(() => {
            processingQuestion.current = false;
          })
          .catch(() => {
            processingQuestion.current = false;
          });
        return;
      }
      
      // Com comando = processar normalmente
      processWakeWordQuestion(command);
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

  // ✅ PASSO 3: Corrigir registerFunctionUsage() para usar functionSettings
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

  // ✅ PASSO 3: Atualizar handleFunctionClick() para usar créditos dinâmicos
  // ✅ NOVA ARQUITETURA: Atualizar handleFunctionClick()
  async function handleFunctionClick(functionKey: string) {
    if (!commandProcessor) {
      console.warn('⚠️ CommandProcessor não inicializado');
      return;
    }
    
    console.log('🎯 Função clicada no carrossel:', functionKey);
    
    // Parar áudio atual
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    setIsProcessing(true);

    try {
      // ✅ Buscar definição da função
      const func = FUNCTIONS_REGISTRY[functionKey];
      
      if (!func) {
        console.error('❌ Função não encontrada no registry:', functionKey);
        await playText('Esta função não está disponível no momento.');
        return;
      }
      
      // ✅ Executar função usando o processador
      const result = await commandProcessor.executeFunction(func, undefined);
      
      if (!result.success) {
        await playText(result.error || 'Erro ao executar função');
        return;
      }
      
      // ✅ Executar ação (mesmo código do detectVoiceCommand)
      switch (result.action) {
        case 'voice':
          if (result.speechText) {
            await playText(result.speechText);
          }
          break;
        
        case 'voice+modal':
          if (result.speechText) {
            await playText(result.speechText);
          }
          
          // Mapear para o modal correto
          if (result.functionKey === 'qrcode_whatsapp' || result.functionKey === 'qrcode_instagram') {
            setQrCodeData({
              type: result.functionKey === 'qrcode_whatsapp' ? 'whatsapp' : 'instagram',
              qrCodeUrl: result.modalData.qr_code_url,
              qrContent: result.modalData.qr_content,
              displayText: result.modalData.display_text,
              companyName: result.modalData.company_name,
            });
          }
          
          if (result.functionKey === 'pix_generate') {
            setPixConfirmationData({
              transactionId: result.modalData.transaction_id,
              amount: result.modalData.amount_brl,
              qrCodeUrl: result.modalData.qr_code_url,
              pixCode: result.modalData.pix_code,
            });
          }
          break;
      }
      
      // ✅ Registrar uso
      await commandProcessor.registerUsage(functionKey);
      
    } catch (error) {
      console.error('❌ Erro ao executar função:', error);
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
  // ✅ NOVA ARQUITETURA: VOICE COMMAND DETECTION
  // ========================================
  async function detectVoiceCommand(transcript: string): Promise<boolean> {
    if (!commandProcessor) {
      console.warn('⚠️ CommandProcessor não inicializado ainda');
      return false;
    }
    
    console.log('🎯 Detectando comando:', transcript);
    
    // ✅ Processar comando dinamicamente
    const result = await commandProcessor.processCommand(transcript);
    
    if (!result.success) {
      console.log('❌ Nenhuma função detectada ou erro:', result.error);
      return false;
    }
    
    console.log('✅ Função detectada:', result.functionKey);
    
    // ✅ Executar ação baseado no tipo
    switch (result.action) {
      case 'voice':
        if (result.speechText) {
          await playText(result.speechText);
        }
        break;
      
      case 'voice+modal':
        if (result.speechText) {
          await playText(result.speechText);
        }
        
        // Mapear para o modal correto
        if (result.functionKey === 'qrcode_whatsapp' || result.functionKey === 'qrcode_instagram') {
          setQrCodeData({
            type: result.functionKey === 'qrcode_whatsapp' ? 'whatsapp' : 'instagram',
            qrCodeUrl: result.modalData.qr_code_url,
            qrContent: result.modalData.qr_content,
            displayText: result.modalData.display_text,
            companyName: result.modalData.company_name,
          });
        }
        
        if (result.functionKey === 'pix_generate') {
          setPixConfirmationData({
            transactionId: result.modalData.transaction_id,
            amount: result.modalData.amount_brl,
            qrCodeUrl: result.modalData.qr_code_url,
            pixCode: result.modalData.pix_code,
          });
        }
        break;
      
      case 'modal':
        // Modal sem voz
        if (result.functionKey === 'qrcode_whatsapp' || result.functionKey === 'qrcode_instagram') {
          setQrCodeData({
            type: result.functionKey === 'qrcode_whatsapp' ? 'whatsapp' : 'instagram',
            qrCodeUrl: result.modalData.qr_code_url,
            qrContent: result.modalData.qr_content,
            displayText: result.modalData.display_text,
            companyName: result.modalData.company_name,
          });
        }
        break;
      
      default:
        console.warn('⚠️ Action desconhecida:', result.action);
    }
    
    // ✅ Registrar uso
    if (result.functionKey) {
      await commandProcessor.registerUsage(result.functionKey);
    }
    
    // ✅ Salvar histórico (se necessário)
    if (result.saveToHistory && result.functionKey && result.speechText) {
      const userMessage = transcript;
      const assistantMessage = result.speechText;
      await saveInteractionToHistory(userMessage, assistantMessage);
    }
    
    return true;
  }

  // ========================================
  // COMMAND HANDLERS
  // ========================================
  // ✅ PASSO 4: CORREÇÃO COMPLETA - handleConfirmPix()
  async function handleConfirmPix() {
    console.log('🔘 handleConfirmPix chamada');
    
    const currentData = pixStateRef.current?.pixConfirmationData;
    
    if (!currentData) {
      console.log('⚠️ pixConfirmationData não existe no ref');
      await playText('Não há nenhum PIX aberto para confirmar');
      
      // ✅ Reiniciar Google Speech após mensagem
      setTimeout(async () => {
        if (isActiveRef.current) {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
        }
      }, 500);
      
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
        
        // ✅ Reiniciar Google Speech após erro
        setTimeout(async () => {
          if (isActiveRef.current) {
            shouldProcessAudio.current = true;
            await startGoogleSpeech();
          }
        }, 500);
        
        return;
      }
      
      const data = response.data;
      
      if (!data || !data.success) {
        console.log('⏳ Resposta sem sucesso:', data);
        await playText('PIX ainda não foi pago. Aguarde e tente novamente.');
        
        // ✅ Reiniciar Google Speech após mensagem
        setTimeout(async () => {
          if (isActiveRef.current) {
            shouldProcessAudio.current = true;
            await startGoogleSpeech();
          }
        }, 500);
        
        return;
      }
      
      console.log('✅ PIX confirmado:', data);
      setPixConfirmationData(null);
      
      const confirmationMessage = 'Pagamento confirmado com sucesso!';
      await playText(confirmationMessage);
      
      // --- INÍCIO DA CORREÇÃO ---
      
      // ✅ PASSO 4: Verificar dinamicamente se deve salvar
      const shouldSave = functionSettings['pix_confirm']?.saveToHistory ?? false;

      if (shouldSave) {
        await saveInteractionToHistory(
          'Confirmar pagamento PIX',
          `Pagamento PIX de R$ ${currentData.amount} confirmado com sucesso!`,
        );
      }
      
      // ✅ NOVA ARQUITETURA: Usar processador para registrar uso
      if (commandProcessor) {
        await commandProcessor.registerUsage('pix_confirm');
      }
      
      // --- FIM DA CORREÇÃO ---
      
    } catch (error: any) {
      console.error('❌ Erro geral:', error);
      await playText('Erro ao confirmar pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
      
      // ✅ Reiniciar Google Speech após confirmar PIX
      setTimeout(async () => {
        if (isActiveRef.current) {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
          console.log('🎤 Google Speech reiniciado após confirmar PIX');
        }
      }, 500);
    }
  }

  async function handleCancelPix() {
    console.log('🔘 handleCancelPix chamada');
    
    const currentData = pixStateRef.current?.pixConfirmationData;
    
    if (!currentData) {
      console.log('⚠️ pixConfirmationData não existe no ref');
      await playText('Não há nenhum PIX aberto para cancelar');
      
      // ✅ Reiniciar Google Speech após mensagem
      setTimeout(async () => {
        if (isActiveRef.current) {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
        }
      }, 500);
      
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
      
      // ✅ NOVA ARQUITETURA: Registrar uso do cancelamento
      if (commandProcessor) {
        await commandProcessor.registerUsage('pix_cancel');
      }
      
    } catch (error: any) {
      console.error('❌ Erro cancelar PIX:', error);
      await playText('Erro ao cancelar PIX.');
    } finally {
      setIsProcessing(false);
      
      // ✅ Reiniciar Google Speech após cancelar PIX
      setTimeout(async () => {
        if (isActiveRef.current) {
          shouldProcessAudio.current = true;
          await startGoogleSpeech();
          console.log('🎤 Google Speech reiniciado após cancelar PIX');
        }
      }, 500);
    }
  }

  async function handleCloseQRCode() {
    console.log('🔘 handleCloseQRCode chamada');
    
    setQrCodeData(null);
    setIsProcessing(false); // ✅ Garantir que não fica em processamento
    
    await playText('QR Code fechado.').catch(() => {});
    
    // ✅ Reiniciar Google Speech após fechar modal
    setTimeout(async () => {
      if (isActiveRef.current) {
        shouldProcessAudio.current = true;
        await startGoogleSpeech();
        console.log('🎤 Google Speech reiniciado após fechar QR Code');
      }
    }, 500);
  }

  function handleCopyQRCode() {
    console.log('📋 QR Code copiado!');
  }

  // ========================================
  // TEXT INPUT HANDLER
  // ========================================
  const handleTextMessage = async (message: string) => {
    console.log('📝 Mensagem de texto recebida:', message);

    // ✅ Verificar comando STOP no texto também
    if (detectStopCommand(message)) {
      stopEverything();
      return;
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
    
    // isListening = VAD detectou ruído, mas ainda aguarda wake word
    // Aguardando = silêncio, também aguarda wake word
    // Ambos mostram a mesma mensagem de instrução
    const primaryWakeWord = companyWakeWord?.split(',')[0].trim();
    return primaryWakeWord ? `Diga: "${primaryWakeWord}" + sua solicitação` : 'Aguarde...';
  };

  const getStatusColor = () => {
    if (!permissionGranted) return 'bg-gray-400';
    if (isPlayingAudio) return 'bg-blue-500 animate-pulse'; // Falando = azul
    if (isProcessing) return 'bg-yellow-400 animate-pulse'; // Processando = amarelo
    if (isListening) return 'bg-blue-400 animate-pulse'; // Detectou ruído (aguardando wake word) = azul
    return 'bg-green-400 animate-pulse'; // Silêncio (aguardando wake word) = verde
  };

  // ========================================
  // RENDER
  // ========================================
  if (isMaximized) {
    return (
      <div className="flex flex-col items-center gap-4 md:gap-8 w-full">
        {/* ✅ Botão PARAR (opcional) */}
        {isSpeaking && (
          <button
            onClick={stopEverything}
            className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all"
          >
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
          {/* ✅ Botão PARAR (opcional) */}
          {isSpeaking && (
            <button
              onClick={stopEverything}
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all z-10"
            >
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
