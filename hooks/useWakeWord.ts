'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWakeWordOptions {
  wakeWord: string; // Ex: "olá assistente"
  language?: string;
  onWakeWordDetected?: () => void;
  enabled?: boolean;
}

export function useWakeWord({
  wakeWord,
  language = 'pt-BR',
  onWakeWordDetected,
  enabled = true,
}: UseWakeWordOptions) {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Normalizar texto para comparação
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .trim();
  };

  // Verificar se wake word foi detectada
  const checkWakeWord = useCallback((transcript: string) => {
    const normalizedTranscript = normalizeText(transcript);
    const normalizedWakeWord = normalizeText(wakeWord);
    
    // Verifica se a wake word está na transcrição
    if (normalizedTranscript.includes(normalizedWakeWord)) {
      console.log('🎤 Wake word detectada:', transcript);
      if (onWakeWordDetected) {
        onWakeWordDetected();
      }
      return true;
    }
    return false;
  }, [wakeWord, onWakeWordDetected]);

  // Iniciar reconhecimento
  const start = useCallback(() => {
    // Verificar suporte
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Seu navegador não suporta reconhecimento de voz');
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      
      // Configurar
      recognition.continuous = true; // Reconhecimento contínuo
      recognition.interimResults = true; // Resultados parciais
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      // Event handlers
      recognition.onstart = () => {
        console.log('🎤 Wake word detector iniciado');
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        
        setLastTranscript(transcript);
        
        // Verificar wake word
        if (event.results[last].isFinal) {
          checkWakeWord(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Erro no reconhecimento:', event.error);
        
        if (event.error === 'no-speech') {
          // Normal, continua ouvindo
          return;
        }
        
        if (event.error === 'network') {
          setError('Erro de rede. Verifique sua conexão.');
        } else if (event.error === 'not-allowed') {
          setError('Permissão de microfone negada');
          setIsListening(false);
        } else {
          setError(`Erro: ${event.error}`);
        }
      };

      recognition.onend = () => {
        console.log('🎤 Reconhecimento parou, reiniciando...');
        setIsListening(false);
        
        // Reiniciar automaticamente após 1 segundo
        if (enabled) {
          restartTimeoutRef.current = setTimeout(() => {
            start();
          }, 1000);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      
    } catch (err: any) {
      console.error('Erro ao iniciar:', err);
      setError(err.message);
    }
  }, [language, enabled, checkWakeWord]);

  // Parar reconhecimento
  const stop = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setIsListening(false);
  }, []);

  // Reiniciar reconhecimento
  const restart = useCallback(() => {
    stop();
    setTimeout(() => {
      start();
    }, 500);
  }, [start, stop]);

  // Effect para iniciar/parar baseado em enabled
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [enabled, start, stop]);

  return {
    isListening,
    isSupported,
    lastTranscript,
    error,
    start,
    stop,
    restart,
  };
}
