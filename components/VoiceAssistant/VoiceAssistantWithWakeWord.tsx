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
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null); // 🎯 NOVO
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
    
    try {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.volume = 0.01;
      
      silentAudio.play().then(() => {
        silentAudio.pause();
        audioUnlocked.current = true;
        console.log('✅ Audio unlocked!');
      }).catch(e => {
        console.log('⚠️ Audio unlock failed');
      });
    } catch (e) {
      console.log('⚠️ Audio unlock error');
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
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.maxAlternatives = isMobile ? 3 : 5;

      recognition.onstart = () => {
        console.log('🎤 Wake word detection ATIVA');
        setIsListening(true);
        setError('');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript.toLowerCase().trim();
        const isFinal = event.results[current].isFinal;
        
        // Só processar se NÃO estiver processando
        if (processingQuestion.current || isProcessing || isPlayingAudio) {
          return;
        }
        
        // 🎯 MODELO ALEXA: Detectar wake word + pergunta
        const detectionResult = wakeWordDetectorRef.current?.detect(transcript);
        
        if (detectionResult?.detected && detectionResult.keyword) {
          if (isFinal) {
            console.log('✅ Wake word + pergunta:', transcript);
            
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
        setIsListening(false);
        
        // Só reiniciar se não estiver processando
        if (isActiveRef.current && !processingQuestion.current && !isProcessing && !isPlayingAudio && permissionGranted) {
          console.log('🔄 Auto-restart em 500ms...');
          setTimeout(() => {
            if (isActiveRef.current && !processingQuestion.current) {
              startWakeWordDetection();
            }
          }, 500);
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

      await audio.play();
      
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
          className={`absolute top-4 right-4 p-3 rounded-full transition ${
            theme === 'dark'
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-black/10 hover:bg-black/20 text-black'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center gap-8">
          <div className="relative w-96 h-96">
            <AvatarFace
              isListening={isListening}
              isSpeaking={isPlayingAudio}
              isProcessing={isProcessing}
              theme={theme}
            />
          </div>

          <div className="text-center">
            <p className={`text-3xl font-bold mb-2 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {getStatusMessage()}
            </p>
            {error && (
              <p className={`text-sm transition-colors ${
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
                Modo Alexa: utilize a palavra de ativação!
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