'use client';

import { useState, useEffect, useRef } from 'react';
import { AvatarFace } from '@/components/AvatarFace';

interface VoiceAssistantWithWakeWordProps {
  companyId: string;
  companyName: string;
  wakeWord: string;
  greetingMessage: string;
}

export function VoiceAssistantWithWakeWord({
  companyId,
  companyName,
  wakeWord,
  greetingMessage,
}: VoiceAssistantWithWakeWordProps) {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationIdRef = useRef<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const restartTimeoutRef = useRef<any>(null);
  const isActiveRef = useRef(true);
  const lastRestartAttempt = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingTimeoutRef = useRef<any>(null);
  const stuckTimeoutRef = useRef<any>(null);

  // Wake words: customizadas + padrão
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
    'desligar'
  ];

  useEffect(() => {
    isActiveRef.current = true;
    requestMicrophonePermission();
    
    return () => {
      isActiveRef.current = false;
      cleanup();
    };
  }, []);

  // Auto-reset se ficar preso em "Aguarde" por mais de 10s
  useEffect(() => {
    if (isProcessing || isRecording) {
      stuckTimeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Sistema travado, forçando reset...');
        forceReset();
      }, 10000); // 10 segundos
    } else {
      if (stuckTimeoutRef.current) {
        clearTimeout(stuckTimeoutRef.current);
      }
    }
    
    return () => {
      if (stuckTimeoutRef.current) {
        clearTimeout(stuckTimeoutRef.current);
      }
    };
  }, [isProcessing, isRecording]);

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
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
    if (stuckTimeoutRef.current) {
      clearTimeout(stuckTimeoutRef.current);
    }
  }

  function forceReset() {
    console.log('🔄 Forçando reset do sistema...');
    
    // Limpar tudo
    setIsRecording(false);
    setIsProcessing(false);
    setIsPlayingAudio(false);
    setConversationActive(false);
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Reiniciar detecção
    setTimeout(() => {
      if (isActiveRef.current && permissionGranted) {
        startWakeWordDetection();
      }
    }, 1000);
  }

  async function requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError('');
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 500);
    } catch (err) {
      setError('Permissão do microfone negada. Por favor, permita o acesso.');
      setPermissionGranted(false);
    }
  }

  function startWakeWordDetection() {
    if (!('webkitSpeechRecognition' in window)) {
      setError('Reconhecimento de voz não suportado. Use Chrome ou Edge.');
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
      recognition.maxAlternatives = 5; // Mais alternativas para melhor detecção

      recognition.onstart = () => {
        console.log('🎤 Detecção ativa');
        setIsListening(true);
        setError('');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript.toLowerCase().trim();
        
        console.log('👂 Ouvi:', transcript);
        
        if (conversationActive) {
          const hasEndCommand = endCommands.some(cmd => transcript.includes(cmd));
          if (hasEndCommand) {
            console.log('🔚 Comando de encerramento');
            endConversation();
            return;
          }
        }

        if (!conversationActive && !isRecording && !isProcessing && !isPlayingAudio) {
          // Verificar wake words de forma mais flexível
          const detectedWakeWord = wakeWords.some(word => {
            // Checar se contém a palavra inteira
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(transcript) || transcript.includes(word);
          });
          
          if (detectedWakeWord) {
            console.log('✅ Wake word detectada!');
            activateConversation();
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.log('⚠️ Erro reconhecimento:', event.error);
        
        if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'aborted') {
          return;
        }
        
        if (event.error === 'not-allowed') {
          setError('Permissão de microfone negada');
          setPermissionGranted(false);
        }
      };

      recognition.onend = () => {
        console.log('🔴 Detecção parou');
        setIsListening(false);
        
        if (isActiveRef.current && !isRecording && !isProcessing && !isPlayingAudio && permissionGranted) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          
          restartTimeoutRef.current = setTimeout(() => {
            if (isActiveRef.current && permissionGranted) {
              startWakeWordDetection();
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (err) {
      console.error('Erro ao iniciar:', err);
      setTimeout(() => {
        if (isActiveRef.current && permissionGranted) {
          startWakeWordDetection();
        }
      }, 2000);
    }
  }

  async function activateConversation() {
    console.log('🟢 Conversa ativada');
    setConversationActive(true);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    
    await playGreeting();
  }

  async function endConversation() {
    console.log('🔴 Encerrando');
    setConversationActive(false);
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    await playText('Até logo!');
    
    setTimeout(() => {
      if (isActiveRef.current && permissionGranted) {
        startWakeWordDetection();
      }
    }, 500);
  }

  async function playGreeting() {
    try {
      await playText(greetingMessage);
      startRecording();
    } catch (err: any) {
      console.error('Erro saudação:', err);
      startRecording();
    }
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

        if (!response.ok) throw new Error('Erro TTS');

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
          reject(new Error('Erro ao reproduzir'));
        };

        await audio.play();
      } catch (err) {
        setIsPlayingAudio(false);
        reject(err);
      }
    });
  }

  async function startRecording() {
    console.log('🎙️ Iniciando gravação');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        }
      });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('⏹️ Gravação parou');
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
        }
        
        setIsRecording(false);
        setIsProcessing(true);
        
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      startSilenceDetection(stream);

      recordingTimeoutRef.current = setTimeout(() => {
        console.log('⏱️ Timeout gravação');
        if (mediaRecorder.state === 'recording') {
          stopRecording();
        }
      }, 8000);
    } catch (err: any) {
      console.error('Erro gravar:', err);
      setError('Erro ao gravar');
      setIsRecording(false);
      setConversationActive(false);
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  function startSilenceDetection(stream: MediaStream) {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    microphone.connect(analyser);
    analyser.fftSize = 2048;

    let silenceStart = Date.now();
    let hasSpoken = false;
    
    const SILENCE_THRESHOLD = 12;
    const SILENCE_DURATION = 700; // 0.7s

    function checkAudio() {
      if (!isRecording) {
        audioContext.close();
        return;
      }
      
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      if (average > SILENCE_THRESHOLD) {
        hasSpoken = true;
        silenceStart = Date.now();
      } else if (hasSpoken) {
        if (Date.now() - silenceStart > SILENCE_DURATION) {
          console.log('🤫 Silêncio detectado');
          stopRecording();
          audioContext.close();
          return;
        }
      }

      requestAnimationFrame(checkAudio);
    }

    checkAudio();
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }

  async function processAudio(audioBlob: Blob) {
    const startTime = Date.now();
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('companyId', companyId);
      if (conversationIdRef.current) {
        formData.append('conversationId', conversationIdRef.current);
      }

      console.log('⚙️ Processando...');
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });

      const processingTime = Date.now() - startTime;
      console.log(`⏱️ Processamento: ${processingTime}ms`);

      if (!response.ok) {
        throw new Error(`Erro: ${response.status}`);
      }

      const newConversationId = response.headers.get('X-Conversation-Id');
      const usedFAQ = response.headers.get('X-Used-FAQ') === 'true';

      console.log(usedFAQ ? '⚡ FAQ usada!' : '🤖 OpenAI usada');

      if (newConversationId && newConversationId !== 'new') {
        conversationIdRef.current = newConversationId;
      }

      setIsProcessing(false);

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const responseAudioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(responseAudioBlob);
      const audio = new Audio(audioUrl);
      
      currentAudioRef.current = audio;
      
      audio.onplay = () => {
        console.log('🔊 Reproduzindo');
        setIsPlayingAudio(true);
      };
      
      audio.onended = () => {
        console.log('✅ Finalizado');
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        startRecording();
      };

      audio.onerror = (e) => {
        console.error('Erro áudio:', e);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        startRecording();
      };

      await audio.play();
    } catch (err: any) {
      console.error('❌ Erro processar:', err);
      setError('Erro ao processar');
      setIsProcessing(false);
      setConversationActive(false);
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  const getStatusMessage = () => {
    if (!permissionGranted) return 'Aguardando permissão...';
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
      <div className="fixed inset-0 bg-gradient-to-br from-slate-800 to-slate-900 z-50 flex items-center justify-center">
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center gap-8">
          <div className="relative w-96 h-96">
            <AvatarFace
              isListening={isListening && !conversationActive}
              isSpeaking={isPlayingAudio}
              isProcessing={isProcessing}
            />
          </div>

          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-2">
              {getStatusMessage()}
            </p>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            {(isProcessing || isRecording) && (
              <button
                onClick={forceReset}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                Reiniciar Sistema
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200 relative overflow-hidden">
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition z-10"
            title="Tela cheia"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          <div className="relative h-96">
            <AvatarFace
              isListening={isListening && !conversationActive}
              isSpeaking={isPlayingAudio}
              isProcessing={isProcessing}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative flex items-center justify-center">
              <div className={`w-32 h-32 rounded-full ${getStatusColor()} flex items-center justify-center transition-all shadow-lg`}>
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>

            <div className="text-center w-full">
              <p className="text-xl font-bold text-gray-900 mb-2">
                {getStatusMessage()}
              </p>
              {conversationActive && (
                <p className="text-sm text-gray-500 mt-2">
                  Diga "tchau" para encerrar
                </p>
              )}
              {(wakeWords.length > 4) && isListening && !conversationActive && (
                <p className="text-xs text-gray-400 mt-2">
                  Wake words: {wakeWords.slice(0, 4).join(', ')}
                </p>
              )}
            </div>

            {error && (
              <div className="w-full p-4 bg-red-50 rounded-xl border-2 border-red-200">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              {conversationActive && !isProcessing && !isPlayingAudio && (
                <button
                  onClick={endConversation}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold shadow-lg"
                >
                  Encerrar Conversa
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
