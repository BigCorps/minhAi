'use client';

import { useState, useEffect, useRef } from 'react';
import { AvatarFace } from '@/components/AvatarFace';
import { WakeWordDetector } from './WakeWordDetector';

interface VoiceAssistantWithWakeWordProps {
  companyId: string;
  companyName: string;
  wakeWord: string;
  greetingMessage: string;
  theme?: 'dark' | 'light';
}

export function VoiceAssistantWithWakeWord({
  companyId,
  companyName,
  wakeWord,
  greetingMessage,
  theme = 'dark',
}: VoiceAssistantWithWakeWordProps) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);

  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(true);
  const lastRestartAttempt = useRef<number>(0);
  const audioUnlocked = useRef<boolean>(false);
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);
  const processingQuestion = useRef<boolean>(false);

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

  // 🎯 NOVO: Comandos de INTERRUPÇÃO (para parar áudio)
  const stopCommands = [
    'para',
    'pare',
    'parar',
    'stop',
    'silêncio',
    'cala boca',
    'chega',
    'obrigado',
    'obrigada',
    'tá bom',
    'ta bom',
    'beleza',
    'ok entendi',
  ];

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
      // 🎯 MOBILE: Criar áudio silencioso e tentar tocar
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
            
            // 🎯 MOBILE FIX: Tentar novamente em 1s
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

  // 🎯 NOVO: Função para parar áudio imediatamente
  function stopAudioImmediately() {
    console.log('🛑 STOP: Parando áudio imediatamente');
    
    // Parar áudio atual
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      } catch (e) {
        console.log('⚠️ Erro ao parar áudio:', e);
      }
    }
    
    // Parar feedback se estiver tocando
    if (feedbackAudioRef.current) {
      try {
        feedbackAudioRef.current.pause();
        feedbackAudioRef.current.currentTime = 0;
        feedbackAudioRef.current = null;
      } catch (e) {}
    }
    
    // Resetar estados
    setIsPlayingAudio(false);
    setIsProcessing(false);
    processingQuestion.current = false;
    
    // Reiniciar wake word detection imediatamente
    console.log('🔄 Reiniciando wake word após interrupção...');
    setTimeout(() => {
      if (isActiveRef.current) {
        startWakeWordDetection();
      }
    }, 200);
  }

  async function handleStart() {
    console.log('🚀 Iniciando assistente estilo Alexa...');
    console.log('📱 Dispositivo:', isMobile ? 'MOBILE' : 'DESKTOP');
    
    // 🎯 MOBILE: Garantir unlock de áudio ANTES de iniciar
    unlockAudio();
    
    // 🎯 MOBILE: Criar áudio de teste para garantir contexto
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
    
    setTimeout(() => {
      if (isActiveRef.current) {
        startWakeWordDetection();
      }
    }, 500);
  }

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

    // Limpar recognition anterior
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
      
      // 🎯 MOBILE: continuous=false para resetar contexto entre perguntas
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
        // 🎯 MOBILE: Pegar a transcrição mais recente E completa
        let transcript = '';
        
        // Tentar pegar a última transcrição final disponível
        for (let i = event.results.length - 1; i >= 0; i--) {
          if (event.results[i].isFinal) {
            transcript = event.results[i][0].transcript;
            break;
          }
        }
        
        // Se não tiver final, pegar a mais recente (interim)
        if (!transcript) {
          transcript = event.results[event.results.length - 1][0].transcript;
        }
        
        transcript = transcript.toLowerCase().trim();
        const isFinal = event.results[event.results.length - 1].isFinal;
        
        // 🎯 DEBUG
        console.log(`${isFinal ? '✅ Final' : '📝 Interim'}: "${transcript}"`);
        
        // 🎯 PRIORIDADE 1: Detectar comandos de STOP (mesmo se ocupado!)
        const normalizedTranscript = transcript.toLowerCase();
        const hasStopCommand = stopCommands.some(cmd => normalizedTranscript.includes(cmd));
        
        if (hasStopCommand && isFinal && (isProcessing || isPlayingAudio)) {
          console.log('🛑 COMANDO STOP DETECTADO:', transcript);
          
          // Verificar se tem wake word (para evitar falsos positivos)
          const detectionResult = wakeWordDetectorRef.current?.detect(transcript);
          if (detectionResult?.detected) {
            console.log('✅ Wake word confirmada, PARANDO áudio...');
            stopAudioImmediately();
            return;
          } else {
            console.log('⚠️ Stop sem wake word, ignorando (evitar falso positivo)');
          }
        }
        
        // 🎯 PRIORIDADE 2: Se estiver ocupado, ignorar outras capturas
        if (processingQuestion.current || isProcessing || isPlayingAudio) {
          return;
        }
        
        // 🎯 PRIORIDADE 3: MODELO ALEXA: Detectar wake word + pergunta
        const detectionResult = wakeWordDetectorRef.current?.detect(transcript);
        
        if (detectionResult?.detected && detectionResult.keyword) {
          console.log(`🔍 Wake word detectada: "${detectionResult.keyword}"`);
          console.log(`📝 Transcrição: "${transcript}"`);
          
          // 🎯 Só processar se for FINAL (mais confiável)
          if (isFinal) {
            console.log('✅ Processando pergunta completa');
            
            // Unlock audio
            if (!audioUnlocked.current) {
              unlockAudio();
            }
            
            // Processar pergunta completa
            if (!processingQuestion.current) {
              processingQuestion.current = true;
              
              // Parar recognition IMEDIATAMENTE
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
          // Erros normais, ignorar
          return;
        }
        
        if (event.error === 'not-allowed') {
          setError('Permissão negada');
          setPermissionGranted(false);
        }
      };

      recognition.onend = () => {
        console.log('🔴 Recognition parou');
        
        // 🎯 MOBILE (continuous=false): Sempre reinicia automaticamente
        // 🎯 DESKTOP (continuous=true): Só reinicia se não estiver ocupado
        
        if (isMobile) {
          // Mobile: Sempre desliga isListening quando parar
          setIsListening(false);
          
          // Reiniciar SEMPRE (exceto se processando/tocando)
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
          // Desktop: Comportamento original
          if (!processingQuestion.current && !isProcessing && !isPlayingAudio) {
            setIsListening(false);
          }
          
          if (isActiveRef.current && 
              !processingQuestion.current && 
              !isProcessing && 
              !isPlayingAudio && 
              permissionGranted) {
            
            console.log('🔄 Desktop: Auto-restart em 500ms...');
            setTimeout(() => {
              if (isActiveRef.current && 
                  !processingQuestion.current && 
                  !isProcessing && 
                  !isPlayingAudio) {
                startWakeWordDetection();
              } else {
                console.log('⏸️ Restart cancelado: sistema ocupado');
              }
            }, 500);
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

  function processWakeWordQuestion(transcript: string) {
    console.log('📋 processWakeWordQuestion chamada');
    console.log('  transcript:', transcript);
    console.log('  processingQuestion.current:', processingQuestion.current);
    
    // 🎯 MOBILE FIX: PARAR RECOGNITION IMEDIATAMENTE
    if (recognitionRef.current) {
      try {
        console.log('🛑 Parando recognition antes de processar');
        recognitionRef.current.stop();
      } catch (e) {
        console.log('⚠️ Erro ao parar recognition:', e);
      }
    }
    
    // Limpar transcript
    let cleanTranscript = transcript.replace(/[,\.!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Verificar se é comando de encerramento
    const normalizedForEndCheck = cleanTranscript.toLowerCase();
    const hasEndCommand = endCommands.some(cmd => normalizedForEndCheck.includes(cmd));
    
    if (hasEndCommand) {
      console.log('👋 Comando de encerramento:', cleanTranscript);
      processingQuestion.current = false;
      playGoodbye();
      return;
    }
    
    // Remover wake words
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
    
    // Processar pergunta
    processQuestion(cleanTranscript);
  }

  async function processQuestion(questionText: string) {
    console.log('⚡ Processando:', questionText);
    
    setIsProcessing(true);
    
    try {
      const startTime = Date.now();
      
      const formData = new FormData();
      const textBlob = new Blob([questionText], { type: 'text/plain' });
      formData.append('audio', textBlob, 'question.txt');
      formData.append('companyId', companyId);
      formData.append('directQuestion', questionText);

      console.log('📤 Enviando para API...');
      
      // 🎯 Iniciar feedback em paralelo, mas NÃO aguardar
      let feedbackStarted = false;
      const feedbackTimeout = setTimeout(() => {
        // Só toca feedback se demorar mais de 1 segundo
        if (!feedbackStarted) {
          feedbackStarted = true;
          console.log('⏱️ API demorando, tocando feedback...');
          playProcessingFeedback().then(audio => {
            feedbackAudioRef.current = audio;
          }).catch(e => {
            console.log('⚠️ Feedback áudio falhou:', e.message);
          });
        }
      }, 1000); // Aguarda 1s antes de tocar feedback
      
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

      // Limpar timeout se API foi rápida
      clearTimeout(feedbackTimeout);

      // 🎯 Se feedback começou, aguardar ele terminar
      if (feedbackStarted && feedbackAudioRef.current) {
        const minFeedbackTime = 1200; // Tempo mínimo para ouvir feedback completo
        const elapsedTime = Date.now() - startTime;
        
        if (elapsedTime < minFeedbackTime) {
          const waitTime = minFeedbackTime - elapsedTime;
          console.log(`⏳ Aguardando ${waitTime}ms para feedback completo...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Parar feedback
        console.log('🛑 Parando feedback...');
        try {
          feedbackAudioRef.current.pause();
          feedbackAudioRef.current.currentTime = 0;
          feedbackAudioRef.current = null;
        } catch (e) {}
      }

      setIsProcessing(false);

      // 🎯 TOCAR RESPOSTA COM VELOCIDADE NATURAL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // 🎯 Velocidade levemente acelerada (mais natural para PT-BR)
      audio.playbackRate = 1.05;
      
      currentAudioRef.current = audio;
      
      audio.onplay = () => {
        console.log('🔊 Áudio iniciou');
        setIsPlayingAudio(true);
      };
      
      audio.onended = () => {
        console.log('✅ Resposta concluída');
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingQuestion.current = false;
        
        // 🎯 MODELO ALEXA: Voltar para wake word imediatamente
        console.log('🔄 Reiniciando wake word detection...');
        setTimeout(() => {
          if (isActiveRef.current) {
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

      // 🎯 TIMEOUT DE SEGURANÇA: Se áudio não começar em 3s, reiniciar
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
      }, 3000);

      // 🎯 MOBILE FIX: Garantir que play() seja executado
      try {
        console.log('▶️ Tentando tocar áudio...');
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Áudio tocando com sucesso');
              clearTimeout(safetyTimeout); // Limpar timeout se sucesso
            })
            .catch(err => {
              console.error('❌ Erro play():', err);
              
              // 🎯 RETRY no mobile se falhar
              setTimeout(() => {
                console.log('🔄 Retry play()...');
                audio.play()
                  .then(() => {
                    clearTimeout(safetyTimeout);
                  })
                  .catch(e => {
                    console.error('❌ Retry falhou:', e);
                    clearTimeout(safetyTimeout);
                    
                    // Se ainda falhar, reiniciar wake word
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
      
      // Parar feedback em caso de erro
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
        // 🎯 VARIAÇÃO: Escolher resposta aleatória
        const feedbackMessages = [
          'Entendi!',
          'Processando...',
          'Um momento!',
          'Aguarde...',
          'Um instante!',
        ];
        
        const randomMessage = feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)];
        
        console.log(`💬 Tocando feedback: "${randomMessage}"`);
        
        // 🎯 TTS rápido (ideal se tiver endpoint otimizado)
        const response = await fetch('/api/voice/tts-fast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: randomMessage }),
        });

        if (!response.ok) {
          // Fallback: tentar TTS normal
          throw new Error('Fast TTS não disponível');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.volume = 0.9;
        audio.playbackRate = 1.0; // 🎯 Velocidade normal (era 0.85, estava muito lento)
        
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
        // Se TTS falhar, usar áudio inline base64 (backup)
        console.log('⚠️ TTS feedback falhou, usando backup');
        
        try {
          // Áudio curto "beep" como fallback
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
    if (isListening) return `Diga: "${wakeWords[0]}" + sua pergunta`;
    return 'Aguarde...';
  };

  const getStatusColor = () => {
    if (!permissionGranted) return 'bg-gray-400';
    if (isPlayingAudio) return 'bg-blue-500 animate-pulse'; // 🔵 Azul ao responder
    if (isProcessing) return 'bg-green-600 animate-pulse'; // 🟢 Verde escuro ao processar
    if (isListening) return 'bg-green-400 animate-pulse'; // 🟢 Verde claro aguardando
    return 'bg-gray-400';
  };

  if (isFullscreen) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center transition-colors duration-500 ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900'
          : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
      }`}>
        <button
          onClick={() => setIsFullscreen(false)}
          className={`absolute top-4 right-4 p-3 rounded-full transition z-50 ${
            theme === 'dark'
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-black/10 hover:bg-black/20 text-black'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center gap-4 md:gap-8 w-full px-4">
          {/* Avatar - Responsivo: menor no mobile */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
            <AvatarFace
              isListening={isListening}
              isSpeaking={isPlayingAudio}
              isProcessing={isProcessing}
              theme={theme}
            />
          </div>

          {/* Status - Responsivo: texto menor no mobile */}
          <div className="text-center px-4 max-w-md">
            <p className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {getStatusMessage()}
            </p>
            {error && (
              <p className={`text-xs sm:text-sm transition-colors ${
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`}>{error}</p>
            )}
          </div>
        </div>
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
          <button
            onClick={() => setIsFullscreen(true)}
            className={`absolute top-4 right-4 p-2 rounded-lg transition z-10 ${
              theme === 'dark'
                ? 'hover:bg-white/5 text-white/60'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Tela cheia"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          <div className="relative h-96">
            <AvatarFace
              isListening={isListening}
              isSpeaking={isPlayingAudio}
              isProcessing={isProcessing}
              theme={theme}
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
                Modo Alexa: use a palavra de ativação!
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
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition font-bold shadow-xl text-lg"
              >
                🎤 Iniciar Assistente
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
