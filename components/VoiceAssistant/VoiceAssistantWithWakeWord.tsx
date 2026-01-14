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
  const [lastTranscript, setLastTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const conversationIdRef = useRef<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const restartTimeoutRef = useRef<any>(null);
  const isActiveRef = useRef(true);
  const lastRestartAttempt = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeWordTranscriptRef = useRef<string>('');

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
  }

  function forceReset() {
    console.log('🔄 Reset');
    
    setIsRecording(false);
    setIsProcessing(false);
    setIsPlayingAudio(false);
    setConversationActive(false);
    
    cleanup();
    
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
      setError('Permissão do microfone negada.');
      setPermissionGranted(false);
    }
  }

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
      recognition.maxAlternatives = 5;

      recognition.onstart = () => {
        console.log('🎤 Wake word');
        setIsListening(true);
        setError('');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript.toLowerCase().trim();
        
        if (conversationActive) {
          const hasEndCommand = endCommands.some(cmd => transcript.includes(cmd));
          if (hasEndCommand) {
            console.log('🔚 Encerrar');
            endConversation();
            return;
          }
        }

        if (!conversationActive && !isRecording && !isProcessing && !isPlayingAudio) {
          const detectedWakeWord = wakeWords.some(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(transcript) || transcript.includes(word);
          });
          
          if (detectedWakeWord) {
            console.log('✅ Wake:', transcript);
            wakeWordTranscriptRef.current = transcript;
            activateConversation();
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'aborted') {
          return;
        }
        
        if (event.error === 'not-allowed') {
          setError('Permissão negada');
          setPermissionGranted(false);
        }
      };

      recognition.onend = () => {
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
      console.error('Erro:', err);
      setTimeout(() => {
        if (isActiveRef.current && permissionGranted) {
          startWakeWordDetection();
        }
      }, 2000);
    }
  }

  async function activateConversation() {
    console.log('🟢 Ativa');
    setConversationActive(true);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    
    // Verificar se wake word veio com pergunta
    const wakeTranscript = wakeWordTranscriptRef.current;
    const hasQuestion = checkIfHasQuestion(wakeTranscript);
    
    if (hasQuestion) {
      // Extrair pergunta (remover wake word)
      const question = extractQuestion(wakeTranscript);
      console.log('💬 Pergunta detectada:', question);
      
      // Processar direto sem saudação
      const audioBlob = textToSpeechBlob(question);
      setIsProcessing(true);
      await processDirectQuestion(question);
    } else {
      // Só wake word → dar saudação e aguardar
      console.log('👋 Só wake word');
      await playGreeting();
    }
  }

  function checkIfHasQuestion(transcript: string): boolean {
    // Remover wake words
    let cleaned = transcript;
    for (const word of wakeWords) {
      cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
    }
    
    // Se sobrou texto (> 3 caracteres) = pergunta
    return cleaned.length > 3;
  }

  function extractQuestion(transcript: string): string {
    let cleaned = transcript;
    for (const word of wakeWords) {
      cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
    }
    return cleaned;
  }

  async function processDirectQuestion(question: string) {
    try {
      const formData = new FormData();
      
      // Criar blob de áudio fake para API (API espera áudio, mas já temos texto)
      const blob = new Blob([question], { type: 'text/plain' });
      formData.append('audio', blob, 'direct.txt');
      formData.append('companyId', companyId);
      formData.append('directQuestion', question); // Flag especial
      if (conversationIdRef.current) {
        formData.append('conversationId', conversationIdRef.current);
      }

      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.status}`);
      }

      const newConversationId = response.headers.get('X-Conversation-Id');
      const usedFAQ = response.headers.get('X-Used-FAQ') === 'true';

      if (newConversationId && newConversationId !== 'new') {
        conversationIdRef.current = newConversationId;
      }

      setIsProcessing(false);

      const responseAudioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(responseAudioBlob);
      const audio = new Audio(audioUrl);
      
      currentAudioRef.current = audio;
      
      audio.onplay = () => {
        console.log(usedFAQ ? '⚡ FAQ' : '🤖 GPT');
        setIsPlayingAudio(true);
      };
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        
        // Continuar ouvindo
        startManualRecording();
      };

      audio.onerror = (e) => {
        console.error('Erro áudio:', e);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        startManualRecording();
      };

      await audio.play();
    } catch (err: any) {
      console.error('❌', err);
      setError('Erro processar');
      setIsProcessing(false);
      setConversationActive(false);
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  function textToSpeechBlob(text: string): Blob {
    return new Blob([text], { type: 'text/plain' });
  }

  async function endConversation() {
    console.log('🔴 Encerra');
    setConversationActive(false);
    
    cleanup();
    
    try {
      await playText('Até logo!');
    } catch (e) {
      console.log('Erro despedida');
    }
    
    setTimeout(() => {
      if (isActiveRef.current && permissionGranted) {
        console.log('🔄 Restart wake');
        startWakeWordDetection();
      }
    }, 1000);
  }

  async function playGreeting() {
    try {
      await playText(greetingMessage);
      console.log('🎧 Saudação ok');
      startManualRecording();
    } catch (err: any) {
      console.error('Erro saudação:', err.message);
      startManualRecording();
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

  async function startManualRecording() {
    console.log('🎤 Manual (300ms)...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart: number | null = null;
      const SILENCE_THRESHOLD = 15;
      const SILENCE_DURATION = 300; // 300ms (era 200ms)

      const checkSilence = () => {
        if (mediaRecorder.state !== 'recording') return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        if (average < SILENCE_THRESHOLD) {
          if (silenceStart === null) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > SILENCE_DURATION) {
            console.log(`🤫 Silêncio: ${Date.now() - silenceStart}ms`);
            stopManualRecording();
            return;
          }
        } else {
          silenceStart = null;
        }

        requestAnimationFrame(checkSilence);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        setIsRecording(false);
        setIsProcessing(true);
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('🎙️ Gravando');
      
      checkSilence();
    } catch (err) {
      console.error('Erro gravar:', err);
      setError('Erro gravar');
      setConversationActive(false);
      startWakeWordDetection();
    }
  }

  function stopManualRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }

  async function processAudio(audioBlob: Blob) {
    const startTime = Date.now();
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('companyId', companyId);
      if (conversationIdRef.current) {
        formData.append('conversationId', conversationIdRef.current);
      }

      console.log('⚙️ API...');
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Erro: ${response.status}`);
      }

      const newConversationId = response.headers.get('X-Conversation-Id');
      const usedFAQ = response.headers.get('X-Used-FAQ') === 'true';
      const apiTime = response.headers.get('X-Processing-Time');
      const transcript = response.headers.get('X-Transcription');

      if (transcript) {
        const decoded = decodeURIComponent(transcript);
        setLastTranscript(decoded.toLowerCase());
        console.log('📝', decoded);
      }

      console.log(`⏱️ Frontend: ${processingTime}ms`);
      console.log(`⏱️ API: ${apiTime}ms`);
      console.log(usedFAQ ? '⚡ FAQ' : '🤖 GPT');

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
        const totalTime = Date.now() - startTime;
        console.log(`✅ TOTAL: ${totalTime}ms`);
        setIsPlayingAudio(true);
      };
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        
        if (lastTranscript && endCommands.some(cmd => lastTranscript.includes(cmd))) {
          console.log('👋 Despedida');
          endConversation();
        } else {
          startManualRecording();
        }
      };

      audio.onerror = (e) => {
        console.error('Erro áudio:', e);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        startManualRecording();
      };

      await audio.play();
    } catch (err: any) {
      console.error('❌', err);
      setError('Erro processar');
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