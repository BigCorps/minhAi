// components/VoiceAssistant/hooks/useSpeechRecognition.ts

import { useState, useRef, useEffect } from 'react';
import { WakeWordDetector } from '../WakeWordDetector';

interface UseSpeechRecognitionProps {
  wakeWords: string[];
  endCommands: string[];
  stopCommands: string[];
  isMobile: boolean;
  onQuestionDetected: (transcript: string) => void;
  onStopCommand: () => void;
  isProcessing: boolean;
  isPlayingAudio: boolean;
  permissionGranted: boolean;
  isActive: boolean;
  audioUnlocked: boolean;
}

export function useSpeechRecognition({
  wakeWords,
  endCommands,
  stopCommands,
  isMobile,
  onQuestionDetected,
  onStopCommand,
  isProcessing,
  isPlayingAudio,
  permissionGranted,
  isActive,
  audioUnlocked,
}: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);
  const processingQuestion = useRef<boolean>(false);
  const consecutiveRestarts = useRef<number>(0);
  const lastRestartTime = useRef<number>(0);
  const lastRestartAttempt = useRef<number>(0);

  // Inicializar WakeWordDetector
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

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        console.log('🛑 Parando recognition');
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (e) {
        console.log('⚠️ Erro ao parar recognition:', e);
      }
    }
    setIsListening(false);
  };

  const startWakeWordDetection = () => {
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
        
        console.log('🔍 Verificando comandos de stop:', {
          transcript: normalizedTranscript,
          hasExplicitStop,
          isProcessing,
          isPlayingAudio,
          isFinal
        });
        
        if (hasExplicitStop && isFinal && (isProcessing || isPlayingAudio)) {
          console.log('🛑 COMANDO STOP EXPLÍCITO DETECTADO:', transcript);
          onStopCommand();
          return;
        }
        
        if (processingQuestion.current || isProcessing || isPlayingAudio) {
          console.log('⏸️ Ocupado, ignorando captura:', normalizedTranscript);
          return;
        }
        
        const detectionResult = wakeWordDetectorRef.current?.detect(transcript);
        
        if (detectionResult?.detected && detectionResult.keyword) {
          console.log(`🔍 Wake word detectada: "${detectionResult.keyword}"`);
          console.log(`📝 Transcrição: "${transcript}"`);
          
          if (isFinal) {
            console.log('✅ Processando pergunta completa');
            
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
        }
      };

      recognition.onend = () => {
        console.log('🔴 Recognition parou', {
          isActive,
          processingQuestion: processingQuestion.current,
          isProcessing,
          isPlayingAudio,
          permissionGranted
        });
        
        if (isMobile) {
          setIsListening(false);
          
          if (isActive && 
              !processingQuestion.current && 
              !isProcessing && 
              !isPlayingAudio && 
              permissionGranted) {
            
            console.log('📱 Mobile: Auto-restart em 300ms...');
            setTimeout(() => {
              if (isActive && 
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
          
          if (isActive && 
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
                if (isActive && 
                    !processingQuestion.current && 
                    !isProcessing && 
                    !isPlayingAudio) {
                  lastRestartTime.current = Date.now();
                  startWakeWordDetection();
                }
              }, 1500);
              return;
            }
            
            console.log('🔄 Desktop: Auto-restart em 300ms...', {
              consecutiveRestarts: consecutiveRestarts.current
            });
            
            setTimeout(() => {
              if (isActive && 
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
        if (isActive && permissionGranted && !processingQuestion.current) {
          startWakeWordDetection();
        }
      }, 2000);
    }
  };

  function processWakeWordQuestion(transcript: string) {
    console.log('📋 processWakeWordQuestion chamada');
    console.log('  transcript:', transcript);
    
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
        if (isActive) {
          startWakeWordDetection();
        }
      }, 300);
      return;
    }
    
    onQuestionDetected(cleanTranscript);
  }

  return {
    isListening,
    error,
    startWakeWordDetection,
    stopRecognition,
    processingQuestion,
  };
}
