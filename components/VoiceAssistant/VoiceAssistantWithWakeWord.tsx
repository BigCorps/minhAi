// components/VoiceAssistant/VoiceAssistantWithWakeWord.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { AvatarFace } from '@/components/AvatarFace';
import QRCodeDisplay from '@/components/assistant/QRCodeDisplay';
import PIXConfirmationModal from '@/components/assistant/PIXConfirmationModal';
import TextInputChat from './TextInputChat';
import { createClient } from '@/lib/supabase-browser';

// 🆕 IMPORTS DOS MÓDULOS
import { VoiceAssistantProps, QRCodeData, PIXConfirmationData } from './types';
import { DEFAULT_WAKE_WORDS, END_COMMANDS } from './utils/constants';
import { unlockAudio, establishMobileAudioContext } from './utils/audioUnlock';
import { detectAndExecuteFunction } from './functions';
import { useAudioManager } from './hooks/useAudioManager';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useConversation } from './hooks/useConversation';

export function VoiceAssistantWithWakeWord({
  companyId,
  companyName,
  wakeWord,
  greetingMessage,
  theme = 'dark',
  isMaximized = false,
}: VoiceAssistantProps) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // 🆕 USAR HOOKS
  const {
    isPlayingAudio,
    currentAudioRef,
    feedbackAudioRef,
    stopAudioImmediately,
    playText,
    playProcessingFeedback,
  } = useAudioManager();
  
  const {
    conversationIdRef,
    createOrGetConversation,
    saveMessage,
  } = useConversation(companyId);
  
  // Estados locais
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [pixConfirmationData, setPixConfirmationData] = useState<PIXConfirmationData | null>(null);
  const [enabledFunctions, setEnabledFunctions] = useState<string[]>([]);
  
  const pixStateRef = useRef({ qrCodeData, pixConfirmationData });
  const audioUnlockedRef = useRef(false);
  const isActiveRef = useRef(true);
  
  // Atualizar ref
  useEffect(() => {
    pixStateRef.current = { qrCodeData, pixConfirmationData };
  }, [qrCodeData, pixConfirmationData]);
  
  // Carregar funções ativas
  useEffect(() => {
    loadEnabledFunctions();
  }, [companyId]);
  
  async function loadEnabledFunctions() {
    const supabase = createClient();
    const { data: settings } = await supabase
      .from('company_function_settings')
      .select('function_key')
      .eq('company_id', companyId)
      .eq('is_enabled', true);
    
    const keys = settings?.map(s => s.function_key) || [];
    setEnabledFunctions(keys.length > 0 ? keys : [
      'qrcode_whatsapp',
      'qrcode_instagram',
      'pix_generate',
      'pix_confirm',
      'pix_cancel'
    ]);
  }
  
  // Speech Recognition
  const wakeWords = [
    ...wakeWord.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0),
    ...DEFAULT_WAKE_WORDS,
  ];
  
  const {
    isListening,
    startWakeWordDetection,
    stopRecognition,
  } = useSpeechRecognition({
    wakeWords,
    endCommands: END_COMMANDS,
    onQuestionDetected: processQuestion,
    isProcessing,
    isPlayingAudio,
  });
  
  // Processar pergunta
  async function processQuestion(questionText: string) {
    console.log('⚡ Processando:', questionText);
    
    const supabase = createClient();
    
    // Criar context
    const context = {
      companyId,
      conversationId: conversationIdRef.current,
      supabase,
      setIsProcessing,
      setQrCodeData,
      setPixConfirmationData,
      pixStateRef,
      playText,
    };
    
    // Detectar e executar função
    const isCommand = await detectAndExecuteFunction(
      questionText,
      context,
      enabledFunctions
    );
    
    if (isCommand) {
      console.log('✅ Comando processado');
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 500);
      return;
    }
    
    // Processar como pergunta normal (FAQ/GPT)
    // ... resto da lógica
  }
  
  // Handlers
  async function handleStart() {
    unlockAudio(audioUnlockedRef);
    if (isMobile) {
      await establishMobileAudioContext();
    }
    setShowStartButton(false);
    setTimeout(() => startWakeWordDetection(), 300);
  }
  
  async function handleTextMessage(message: string) {
    // Lógica do texto
  }
  
  // Cleanup
  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
      stopRecognition();
    };
  }, []);
  
  // ... resto do JSX (igual ao original)
}
