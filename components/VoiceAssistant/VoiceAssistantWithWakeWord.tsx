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
  // Detectar se é mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [showStartButton, setShowStartButton] = useState(true);

  const recognitionRef = useRef<any>(null);
  const conversationIdRef = useRef<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const restartTimeoutRef = useRef<any>(null);
  const isActiveRef = useRef(true);
  const lastRestartAttempt = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastWakeWordTranscript = useRef<string>('');
  const audioUnlocked = useRef<boolean>(false);
  const processingWakeWord = useRef<boolean>(false);
  const inactivityTimeoutRef = useRef<any>(null);
  const isProcessingAudio = useRef<boolean>(false);
  
  // 🎯 NOVO: Referência para o detector de wake word
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);

  const wakeWords = [
    ...wakeWord.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0),
    'oi',
    'olá',
    'ola',
    'ei',
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

  // 🎯 NOVO: Inicializar o WakeWordDetector
  useEffect(() => {
    console.log('🎯 Inicializando WakeWordDetector com keywords:', wakeWords);
    wakeWordDetectorRef.current = new WakeWordDetector({
      keywords: wakeWords,
      threshold: 0.7, // 70% de similaridade
      contextWindow: 5,
      usePhoneticMatching: true
    });
  }, [wakeWords.join(',')]); // Re-criar quando keywords mudarem

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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
  }

  function startInactivityTimeout() {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    console.log('⏱️ Timeout de inatividade: 30s');
    inactivityTimeoutRef.current = setTimeout(() => {
      console.log('⏰ 30s sem atividade, encerrando silenciosamente...');
      endConversationSilent();
    }, 30000);
  }

  function cancelInactivityTimeout() {
    if (inactivityTimeoutRef.current) {
      console.log('✅ Atividade detectada, cancelando timeout');
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }

  async function endConversationSilent() {
    console.log('🔴 Encerra silenciosamente (timeout)');
    setConversationActive(false);
    processingWakeWord.current = false;
    isProcessingAudio.current = false;
    
    cleanup();
    
    setTimeout(() => {
      if (isActiveRef.current && permissionGranted) {
        console.log('🔄 Voltando para wake word detection');
        startWakeWordDetection();
      }
    }, 500);
  }

  function forceReset() {
    console.log('🔄 Reset');
    
    setIsRecording(false);
    setIsProcessing(false);
    setIsPlayingAudio(false);
    setConversationActive(false);
    processingWakeWord.current = false;
    isProcessingAudio.current = false;
    cancelInactivityTimeout();
    
    cleanup();
    
    setTimeout(() => {
      if (isActiveRef.current && permissionGranted) {
        startWakeWordDetection();
      }
    }, 1000);
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
        console.log('⚠️ Audio unlock failed:', e.message);
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
    console.log('🚀 Iniciando assistente de voz...');
    console.log('📱 Dispositivo:', isMobile ? 'MOBILE' : 'DESKTOP');
    console.log('🔓 Desbloqueando áudio para autoplay...');
    
    unlockAudio();
    setShowStartButton(false);
    
    console.log('🎤 Ativando detecção de wake word...');
    console.log(`👂 Aguardando você dizer: "${wakeWords[0]}" ou "oi"`);
    
    setTimeout(() => {
      if (isActiveRef.current) {
        startWakeWordDetection();
      }
    }, 500);
  }

  // 🎯 FUNÇÃO MELHORADA: startWakeWordDetection com WakeWordDetector
  function startWakeWordDetection() {
    if (!('webkitSpeechRecognition' in window)) {
      setError('Use Chrome ou Edge.');
      return;
    }

    const now = Date.now();
    if (now - lastRestartAttempt.current < 500) return;
    lastRestartAttempt.current = now;

    if (recognitionRef.current && isListening) return;

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.maxAlternatives = 3; // 🎯 IMPORTANTE: pegar múltiplas alternativas

      recognition.onstart = () => {
        console.log('🎤 Wake word detection ativo');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        if (processingWakeWord.current) return;

        const results = Array.from(event.results);
        const lastResult = results[results.length - 1] as any;
        
        if (!lastResult) return;

        // 🎯 NOVO: Processar todas as alternativas de transcrição
        const transcripts = Array.from(lastResult).map((alt: any) => alt.transcript);
        
        transcripts.forEach((transcript: string) => {
          if (!transcript || transcript.trim().length === 0) return;
          
          const normalizedTranscript = transcript.toLowerCase().trim();
          setLastTranscript(normalizedTranscript);
          
          // 🎯 NOVO: Usar o WakeWordDetector com fuzzy matching
          const detectionResult = wakeWordDetectorRef.current?.detect(transcript);
          
          if (detectionResult?.detected && detectionResult.keyword) {
            console.log('✅ Wake word detectada!', {
              keyword: detectionResult.keyword,
              confidence: Math.round(detectionResult.confidence * 100) + '%',
              matchedText: detectionResult.matchedText,
              originalTranscript: transcript
            });
            
            if (processingWakeWord.current) {
              console.log('⚠️ Já processando wake word, ignorando...');
              return;
            }
            
            processingWakeWord.current = true;
            lastWakeWordTranscript.current = transcript;
            
            try {
              recognition.stop();
            } catch (e) {
              console.log('Recognition já parado');
            }
            
            setIsListening(false);
            setConversationActive(true);
            
            console.log('🎤 Iniciando gravação após wake word...');
            setTimeout(() => {
              startManualRecording();
            }, 100);
          }
        });
      };

      recognition.onerror = (event: any) => {
        console.error('Erro no reconhecimento:', event.error);
        
        if (event.error === 'not-allowed') {
          setError('Permissão negada. Recarregue a página.');
          setPermissionGranted(false);
          return;
        }
        
        if (event.error === 'aborted') return;
        
        setIsListening(false);
        
        if (isActiveRef.current && !conversationActive) {
          restartTimeoutRef.current = setTimeout(() => {
            startWakeWordDetection();
          }, 1000);
        }
      };

      recognition.onend = () => {
        console.log('🔴 Recognition parou');
        setIsListening(false);
        
        if (isActiveRef.current && !conversationActive && !processingWakeWord.current) {
          console.log('🔄 Reiniciando wake word detection...');
          restartTimeoutRef.current = setTimeout(() => {
            startWakeWordDetection();
          }, 500);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      
    } catch (err: any) {
      console.error('Erro ao iniciar reconhecimento:', err);
      setError(`Erro: ${err.message}`);
      
      if (isActiveRef.current && !conversationActive) {
        restartTimeoutRef.current = setTimeout(() => {
          startWakeWordDetection();
        }, 2000);
      }
    }
  }

  async function startManualRecording() {
    if (isProcessingAudio.current) {
      console.log('⚠️ Já está processando áudio, aguarde...');
      return;
    }

    isProcessingAudio.current = true;
    cancelInactivityTimeout();
    
    console.log('🎙️ Iniciando gravação manual...');
    setIsRecording(true);
    setError('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      let silenceTimer: any = null;
      let hasSpoken = false;

      if (audioContextRef.current?.state === 'closed') {
        audioContextRef.current = null;
      }
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (mediaRecorder.state !== 'recording') return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;

        if (average > 15) {
          hasSpoken = true;
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
        } else if (hasSpoken && !silenceTimer) {
          silenceTimer = setTimeout(() => {
            console.log('🔇 Silêncio detectado (800ms), parando gravação...');
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, 800);
        }

        requestAnimationFrame(checkAudioLevel);
      };

      mediaRecorder.onstop = async () => {
        console.log('⏹️ Gravação parou');
        setIsRecording(false);
        
        stream.getTracks().forEach(track => track.stop());
        
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }

        if (audioChunksRef.current.length === 0) {
          console.log('⚠️ Nenhum áudio capturado');
          setError('Nenhum áudio capturado');
          isProcessingAudio.current = false;
          startInactivityTimeout();
          return;
        }

        console.log(`📦 ${audioChunksRef.current.length} chunks capturados`);
        await processAudio();
      };

      mediaRecorder.start(100);
      console.log('✅ Gravação iniciada');
      checkAudioLevel();

    } catch (err: any) {
      console.error('Erro ao iniciar gravação:', err);
      setError('Erro ao acessar microfone');
      setIsRecording(false);
      isProcessingAudio.current = false;
      startInactivityTimeout();
    }
  }

  async function processAudio() {
    if (!audioChunksRef.current.length) {
      console.log('⚠️ Sem áudio para processar');
      isProcessingAudio.current = false;
      return;
    }

    console.log('⚙️ Processando áudio...');
    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      console.log(`📊 Tamanho do áudio: ${(audioBlob.size / 1024).toFixed(2)}KB`);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('companyId', companyId);
      
      if (conversationIdRef.current) {
        formData.append('conversationId', conversationIdRef.current);
      }

      console.log('📤 Enviando para API...');
      
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      // Pegar dados dos headers
      const conversationIdHeader = response.headers.get('X-Conversation-Id');
      const transcriptHeader = response.headers.get('X-Transcription');
      const usedFAQHeader = response.headers.get('X-Used-FAQ');
      
      if (conversationIdHeader && !conversationIdRef.current) {
        conversationIdRef.current = conversationIdHeader;
        console.log('🆔 Conversation ID:', conversationIdHeader);
      }

      const transcript = transcriptHeader ? decodeURIComponent(transcriptHeader) : '';
      const usedFAQ = usedFAQHeader === 'true';

      console.log('✅ Resposta recebida');
      console.log('📝 Transcript:', transcript);
      console.log('📊 Used FAQ:', usedFAQ);

      setIsProcessing(false);

      // Converter resposta binária em blob de áudio
      const responseBlob = await response.blob();
      
      if (responseBlob.size === 0) {
        console.log('⚠️ Sem áudio na resposta');
        setError('Sem resposta de áudio');
        isProcessingAudio.current = false;
        startInactivityTimeout();
        return;
      }

      const audioUrl = URL.createObjectURL(responseBlob);

      console.log('🔊 Tocando resposta...');
      setIsPlayingAudio(true);

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        console.log('✅ Áudio terminou');
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingWakeWord.current = false;
        
        console.log('🔍 Verificando comando de fim no transcript:', transcript);
        
        const normalizedTranscript = transcript
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        
        console.log('📝 Transcript normalizado:', normalizedTranscript);
        console.log('🔍 Comandos de fim:', endCommands);
        
        const hasEndCommand = endCommands.some(cmd => {
          const match = normalizedTranscript.includes(cmd);
          if (match) console.log(`✅ Match encontrado: "${cmd}"`);
          return match;
        });
        
        if (hasEndCommand) {
          console.log('👋 Comando de fim detectado:', normalizedTranscript);
          endConversation();
        } else {
          console.log('➡️ Sem comando de fim, continuando...');
          startManualRecording();
        }
      };

      audio.onerror = (e) => {
        console.error('Erro áudio:', e);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingWakeWord.current = false;
        isProcessingAudio.current = false;
        
        setTimeout(() => {
          startManualRecording();
        }, 300);
      };

      try {
        await audio.play();
      } catch (playError: any) {
        console.error('❌ Erro ao tocar áudio:', playError.message);
        
        processingWakeWord.current = false;
        isProcessingAudio.current = false;
        
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        
        setTimeout(() => {
          startManualRecording();
        }, 300);
      }
    } catch (err: any) {
      console.error('❌', err);
      setError('Erro processar');
      setIsProcessing(false);
      setConversationActive(false);
      processingWakeWord.current = false;
      isProcessingAudio.current = false;
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  async function endConversation() {
    console.log('👋 Encerrando conversa...');
    
    cancelInactivityTimeout();
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    setIsPlayingAudio(false);
    setIsProcessing(false);
    setIsRecording(false);
    
    try {
      const response = await fetch('/api/voice/goodbye', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          conversationId: conversationIdRef.current
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.audioUrl) {
          console.log('🔊 Tocando despedida...');
          
          const goodbyeAudio = new Audio(data.audioUrl);
          currentAudioRef.current = goodbyeAudio;
          
          goodbyeAudio.onended = () => {
            console.log('✅ Despedida concluída');
            currentAudioRef.current = null;
            finishEndConversation();
          };
          
          goodbyeAudio.onerror = () => {
            console.error('Erro ao tocar despedida');
            currentAudioRef.current = null;
            finishEndConversation();
          };
          
          try {
            await goodbyeAudio.play();
          } catch (e) {
            console.error('Erro play despedida:', e);
            finishEndConversation();
          }
        } else {
          finishEndConversation();
        }
      } else {
        finishEndConversation();
      }
    } catch (err) {
      console.error('Erro ao buscar despedida:', err);
      finishEndConversation();
    }
  }

  function finishEndConversation() {
    console.log('🏁 Finalizando conversa completamente');
    
    setConversationActive(false);
    conversationIdRef.current = null;
    processingWakeWord.current = false;
    isProcessingAudio.current = false;
    
    cleanup();
    
    setTimeout(() => {
      if (isActiveRef.current && permissionGranted) {
        console.log('🔄 Reiniciando wake word detection...');
        startWakeWordDetection();
      }
    }, 1000);
  }

  const getStatusMessage = () => {
    if (!permissionGranted) return 'Aguardando permissão...';
    if (showStartButton) return 'Clique em "Iniciar Assistente"';
    if (isPlayingAudio) return 'Falando...';
    if (isProcessing) return 'Processando...';
    if (isRecording) return 'Ouvindo você...';
    if (conversationActive) return 'Pode falar!';
    if (isListening) return `Diga: "${wakeWords[0]}" ou "oi"`;
    return 'Aguarde...';
  };

  const getStatusColor = () => {
    if (!permissionGranted) return 'bg-gray-400';
    if (isPlayingAudio) return 'bg-blue-500';
    if (isProcessing) return 'bg-yellow-500 animate-pulse';
    if (isRecording) return 'bg-red-500 animate-pulse';
    if (conversationActive) return 'bg-orange-500';
    if (isListening) return 'bg-green-500 animate-pulse';
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
              isListening={isListening && !conversationActive}
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
              isListening={isListening && !conversationActive}
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
              {conversationActive && (
                <p className={`text-sm mt-2 transition-colors ${
                  theme === 'dark' ? 'text-white/50' : 'text-gray-500'
                }`}>
                  Diga "tchau" para encerrar
                </p>
              )}
              <p className={`text-xs mt-1 transition-colors ${
                theme === 'dark' ? 'text-white/30' : 'text-gray-400'
              }`}>
                Silêncio: 800ms
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

            <div className="flex gap-3">
              {conversationActive && !isProcessing && !isPlayingAudio && (
                <button
                  onClick={endConversation}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold shadow-lg"
                >
                  Encerrar
                </button>
              )}
              
              {(isProcessing || isRecording) && (
                <button
                  onClick={forceReset}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition font-bold shadow-lg"
                >
                  Reiniciar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
