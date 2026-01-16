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
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
  }

  function startInactivityTimeout() {
    // Limpar timeout anterior
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    // 30 segundos de inatividade
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
    
    cleanup();
    
    // NÃO tocar despedida, só voltar para wake word
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
    processingWakeWord.current = false; // Reset flag
    cancelInactivityTimeout(); // Cancelar timeout
    
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
      // Criar e tocar áudio silencioso para unlock (não-bloqueante)
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
      
      // NÃO inicia automaticamente - aguarda botão
    } catch (err) {
      setError('Permissão do microfone negada.');
      setPermissionGranted(false);
    }
  }

  async function handleStart() {
    console.log('🚀 Iniciando assistente de voz...');
    console.log('🔓 Desbloqueando áudio para autoplay...');
    
    // Unlock audio com user interaction
    unlockAudio();
    
    // Esconder botão
    setShowStartButton(false);
    
    console.log('🎤 Ativando detecção de wake word...');
    console.log(`👂 Aguardando você dizer: "${wakeWords[0]}" ou "oi"`);
    
    // Iniciar wake word detection
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
        const isFinal = event.results[current].isFinal;
        
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
            console.log('✅ Wake:', transcript, isFinal ? '(final)' : '(interim)');
            
            // Sempre salvar o último transcript
            lastWakeWordTranscript.current = transcript;
            
            // Unlock audio SOMENTE no primeiro wake word FINAL
            if (isFinal && !audioUnlocked.current) {
              console.log('🔓 Unlocking audio...');
              unlockAudio();
            }
            
            // Se for resultado final, processar
            if (isFinal) {
              console.log('📋 Transcript final capturado:', transcript);
              
              // Proteção contra processamento duplicado
              if (!processingWakeWord.current) {
                processingWakeWord.current = true;
                processWakeWordTranscript(transcript);
              } else {
                console.log('⚠️ Já processando wake word, ignorando');
              }
            }
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

  function processWakeWordTranscript(transcript: string) {
    // 1. Remover pontuação PRIMEIRO
    let cleanTranscript = transcript.replace(/[,\.!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // 2. Depois remover wake words
    for (const word of wakeWords) {
      cleanTranscript = cleanTranscript.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
    }
    
    // 3. Remover palavras comuns
    cleanTranscript = cleanTranscript.replace(/\bassistente\b|\bassis\b|\bhey\b/gi, '').trim();
    
    // 4. Limpar espaços extras novamente
    cleanTranscript = cleanTranscript.replace(/\s+/g, ' ').trim();
    
    const words = cleanTranscript.split(' ').filter((w: string) => w.length > 2);
    const hasQuestion = words.length >= 2;
    
    console.log('🔍 Análise wake word:');
    console.log('  Original:', transcript);
    console.log('  Limpo:', cleanTranscript);
    console.log('  Palavras:', words);
    console.log('  Count:', words.length);
    console.log('  Tem pergunta?', hasQuestion);
    
    if (hasQuestion) {
      console.log('💬 Pergunta detectada:', cleanTranscript);
    } else {
      console.log('👋 Só wake word');
    }
    
    // SIMPLIFICADO: sempre ativar imediatamente, passando texto da pergunta
    activateConversation(hasQuestion, cleanTranscript);
  }

  async function activateConversation(hasQuestion: boolean = false, questionText: string = '') {
    // Proteção: se já está ativo ou processando, não ativar novamente
    if (conversationActive || isRecording || isProcessing || isPlayingAudio) {
      console.log('⚠️ Já ativo, ignorando');
      return;
    }
    
    console.log('🟢 Ativa', hasQuestion ? '(com pergunta)' : '(sem pergunta)');
    setConversationActive(true);
    
    // Resetar flag IMEDIATAMENTE (já foi processado o wake word)
    processingWakeWord.current = false;
    
    // Iniciar timeout de inatividade
    startInactivityTimeout();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    
    if (hasQuestion && questionText) {
      // Tem pergunta: processar DIRETO o texto que já capturamos (NÃO gravar!)
      console.log('⚡ Processando pergunta direta:', questionText);
      await processDirectQuestion(questionText);
    } else {
      // Só wake word: dar saudação e depois gravar
      console.log('👋 Só wake word, dando saudação');
      await playGreeting();
    }
  }

  async function processDirectQuestion(questionText: string) {
    setIsProcessing(true);
    
    // Salvar transcrição para verificação de comandos de fim
    setLastTranscript(questionText.toLowerCase());
    
    try {
      const formData = new FormData();
      
      // Criar blob de texto (não precisa de áudio real)
      const textBlob = new Blob([questionText], { type: 'text/plain' });
      formData.append('audio', textBlob, 'direct-question.txt');
      formData.append('companyId', companyId);
      formData.append('directQuestion', questionText);
      
      if (conversationIdRef.current) {
        formData.append('conversationId', conversationIdRef.current);
      }

      console.log('⚙️ Enviando pergunta direta para API...');
      
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

      console.log(usedFAQ ? '⚡ FAQ' : '🤖 GPT');

      const responseAudioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(responseAudioBlob);
      const audio = new Audio(audioUrl);
      
      currentAudioRef.current = audio;
      
      audio.onplay = () => {
        setIsPlayingAudio(true);
      };
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingWakeWord.current = false;
        
        // Verificar comando de fim
        const hasEndCommand = endCommands.some(cmd => questionText.toLowerCase().includes(cmd));
        
        if (hasEndCommand) {
          console.log('👋 Comando de fim detectado na pergunta direta');
          endConversation();
        } else {
          // Continuar ouvindo
          startManualRecording();
        }
      };

      audio.onerror = (e) => {
        console.error('Erro áudio:', e);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingWakeWord.current = false;
        
        // Continuar mesmo com erro
        startManualRecording();
      };

      await audio.play();
      
    } catch (err: any) {
      console.error('❌ Erro processar pergunta direta:', err);
      setIsProcessing(false);
      setConversationActive(false);
      processingWakeWord.current = false;
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  async function endConversation() {
    console.log('🔴 Encerra');
    setConversationActive(false);
    processingWakeWord.current = false; // Reset flag
    cancelInactivityTimeout(); // Cancelar timeout
    
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
      
      // Aguardar 500ms antes de começar a gravar (dar tempo pro áudio terminar)
      setTimeout(() => {
        startManualRecording();
      }, 500);
    } catch (err: any) {
      console.error('Erro saudação:', err.message);
      
      // Mesmo com erro, começar a gravar
      setTimeout(() => {
        startManualRecording();
      }, 500);
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

        try {
          await audio.play();
        } catch (playError: any) {
          console.error('❌ Erro playText:', playError.message);
          setIsPlayingAudio(false);
          currentAudioRef.current = null;
          reject(playError);
        }
      } catch (err) {
        setIsPlayingAudio(false);
        reject(err);
      }
    });
  }

  async function startManualRecording() {
    console.log('🎤 Gravando (silêncio: 600ms)...');
    
    // Reiniciar timeout de inatividade
    startInactivityTimeout();
    
    // Garantir audio unlock (não-bloqueante)
    if (!audioUnlocked.current) {
      unlockAudio();
    }
    
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
      let speechDetected = false;
      const SILENCE_THRESHOLD = 15;
      const SILENCE_DURATION = 600; // 800ms - TEMPO MAIOR!
      const MIN_SPEECH_DURATION = 300; // Mínimo 300ms de fala antes de detectar silêncio

      const recordStartTime = Date.now();

      const checkSilence = () => {
        if (mediaRecorder.state !== 'recording') return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // Detectar se está falando
        if (average > SILENCE_THRESHOLD) {
          speechDetected = true;
          silenceStart = null;
        } else {
          // Silêncio
          // Só detectar silêncio se já falou por pelo menos 300ms
          const elapsed = Date.now() - recordStartTime;
          if (speechDetected && elapsed > MIN_SPEECH_DURATION) {
            if (silenceStart === null) {
              silenceStart = Date.now();
              console.log('🤫 Silêncio começou');
            } else if (Date.now() - silenceStart > SILENCE_DURATION) {
              console.log(`🤫 Silêncio confirmado: ${Date.now() - silenceStart}ms`);
              stopManualRecording();
              return;
            }
          }
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
        
        console.log('📊 Áudio capturado:', {
          size: audioBlob.size,
          duration: Date.now() - recordStartTime
        });
        
        setIsRecording(false);
        setIsProcessing(true);
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('🎙️ Gravando... (fale agora)');
      
      checkSilence();
    } catch (err) {
      console.error('Erro gravar:', err);
      setError('Erro gravar');
      setConversationActive(false);
      processingWakeWord.current = false; // Reset flag em erro
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
      console.log('⏱️ [0ms] Iniciando processamento');
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('companyId', companyId);
      if (conversationIdRef.current) {
        formData.append('conversationId', conversationIdRef.current);
      }

      console.log(`⏱️ [${Date.now() - startTime}ms] FormData pronto, enviando...`);
      console.log('⚙️ API...');
      
      const fetchStart = Date.now();
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });
      const fetchTime = Date.now() - fetchStart;

      console.log(`⏱️ [${Date.now() - startTime}ms] Response recebido (fetch: ${fetchTime}ms)`);

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
        // Normalizar: minúsculo, sem pontuação
        const normalized = decoded.toLowerCase().replace(/[,\.!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
        setLastTranscript(normalized);
        console.log('📝', decoded);
        console.log('🔤 Normalizado:', normalized);
      }

      console.log(`⏱️ Frontend total: ${processingTime}ms`);
      console.log(`⏱️ API interno: ${apiTime}ms`);
      console.log(`⏱️ Network: ${processingTime - parseInt(apiTime || '0')}ms`);
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
        processingWakeWord.current = false; // Pronto para próximo wake word
        
        // Verificar comando de fim com a transcrição real
        const hasEndCommand = endCommands.some(cmd => lastTranscript.includes(cmd));
        
        if (hasEndCommand) {
          console.log('👋 Comando de fim detectado:', lastTranscript);
          endConversation();
        } else {
          // Continuar ouvindo
          startManualRecording();
        }
      };

      audio.onerror = (e) => {
        console.error('Erro áudio:', e);
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        processingWakeWord.current = false; // Reset em erro também
        
        setTimeout(() => {
          startManualRecording();
        }, 300);
      };

      try {
        await audio.play();
      } catch (playError: any) {
        console.error('❌ Erro ao tocar áudio:', playError.message);
        
        // Resetar flag em erro
        processingWakeWord.current = false;
        
        // Não bloquear - continuar gravação
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
      processingWakeWord.current = false; // Reset flag em erro
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
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
              <p className="text-xs text-gray-400 mt-1">
                Silêncio: 800ms
              </p>
            </div>

            {error && (
              <div className="w-full p-4 bg-red-50 rounded-xl border-2 border-red-200">
                <p className="text-red-700 text-sm">{error}</p>
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