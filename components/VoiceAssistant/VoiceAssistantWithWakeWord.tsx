'use client';

import { useState, useEffect, useRef } from 'react';
import { AvatarFace } from './AvatarFace';

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
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationIdRef = useRef<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const restartTimeoutRef = useRef<any>(null);
  const isActiveRef = useRef(true);

  const wakeWords = wakeWord
    .split(',')
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 0);

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

  function cleanup() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
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
      console.error('Erro ao solicitar microfone:', err);
      setError('Permissão do microfone negada. Por favor, permita o acesso.');
      setPermissionGranted(false);
    }
  }

  function startWakeWordDetection() {
    if (!('webkitSpeechRecognition' in window)) {
      setError('Reconhecimento de voz não suportado. Use Chrome ou Edge.');
      return;
    }

    if (recognitionRef.current && isListening) {
      return;
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError('');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript.toLowerCase().trim();
        
        if (conversationActive) {
          const hasEndCommand = endCommands.some(cmd => transcript.includes(cmd));
          if (hasEndCommand) {
            endConversation();
            return;
          }
        }

        if (!conversationActive && !isRecording && !isProcessing && !isPlayingAudio) {
          const detectedWakeWord = wakeWords.some(word => transcript.includes(word));
          if (detectedWakeWord) {
            activateConversation();
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          return;
        }
        
        if (event.error === 'not-allowed') {
          setError('Permissão de microfone negada');
          setPermissionGranted(false);
          return;
        }
        
        setError(`Erro: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
        
        if (isActiveRef.current && !isRecording && !isProcessing && !isPlayingAudio && permissionGranted) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          
          restartTimeoutRef.current = setTimeout(() => {
            if (isActiveRef.current && permissionGranted) {
              try {
                recognition.start();
              } catch (err) {
                setTimeout(() => {
                  if (isActiveRef.current) {
                    startWakeWordDetection();
                  }
                }, 2000);
              }
            }
          }, 1000);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setError('Erro ao inicializar reconhecimento de voz');
      
      setTimeout(() => {
        if (isActiveRef.current && permissionGranted) {
          startWakeWordDetection();
        }
      }, 3000);
    }
  }

  async function activateConversation() {
    setConversationActive(true);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    
    await playGreeting();
  }

  async function endConversation() {
    setConversationActive(false);
    setTranscript('');
    setResponse('');
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    
    await playText('Até logo! Se precisar, é só me chamar novamente.');
    
    setTimeout(() => {
      if (isActiveRef.current && permissionGranted) {
        startWakeWordDetection();
      }
    }, 2000);
  }

  async function playGreeting() {
    setIsPlayingAudio(true);
    
    try {
      await playText(greetingMessage);
      setIsPlayingAudio(false);
      startRecording();
    } catch (err: any) {
      setIsPlayingAudio(false);
      setError('Erro ao reproduzir saudação');
      startRecording();
    }
  }

  async function playText(text: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) throw new Error('Erro ao gerar áudio');

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        currentAudioRef.current = audio;

        audio.onended = () => {
          currentAudioRef.current = null;
          resolve();
        };

        audio.onerror = () => {
          currentAudioRef.current = null;
          reject(new Error('Erro ao reproduzir áudio'));
        };

        await audio.play();
      } catch (err) {
        reject(err);
      }
    });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          stopRecording();
        }
      }, 15000);
    } catch (err: any) {
      setError('Erro ao iniciar gravação: ' + err.message);
      setIsRecording(false);
      setConversationActive(false);
      
      setTimeout(() => {
        if (isActiveRef.current) {
          startWakeWordDetection();
        }
      }, 1000);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function processAudio(audioBlob: Blob) {
    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('companyId', companyId);
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

      const transcription = decodeURIComponent(response.headers.get('X-Transcription') || '');
      const responseText = decodeURIComponent(response.headers.get('X-Response-Text') || '');
      const newConversationId = response.headers.get('X-Conversation-Id');

      if (newConversationId) {
        conversationIdRef.current = newConversationId;
      }

      setTranscript(transcription);
      setResponse(responseText);
      setIsProcessing(false);

      const hasEndCommand = endCommands.some(cmd => transcription.toLowerCase().includes(cmd));
      if (hasEndCommand) {
        endConversation();
        return;
      }

      setIsPlayingAudio(true);
      const responseAudioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(responseAudioBlob);
      const audio = new Audio(audioUrl);
      
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        currentAudioRef.current = null;
        setIsPlayingAudio(false);
        startRecording();
      };

      audio.onerror = () => {
        currentAudioRef.current = null;
        setIsPlayingAudio(false);
        setError('Erro ao reproduzir resposta');
        startRecording();
      };

      await audio.play();
    } catch (err: any) {
      setError('Erro ao processar áudio: ' + err.message);
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
    if (!permissionGranted) return 'Aguardando permissão do microfone...';
    if (isPlayingAudio) return 'Reproduzindo resposta...';
    if (isProcessing) return 'Processando sua pergunta...';
    if (isRecording) return 'Escutando você...';
    if (conversationActive) return 'Pode falar...';
    if (isListening) return `Pronto! Diga: "${wakeWords[0]}"`;
    return 'Iniciando sistema...';
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

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        {/* COLUNA ESQUERDA - AVATAR */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-2xl p-8 border border-gray-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
          <div className="relative h-96">
            <AvatarFace
              isListening={isListening && !conversationActive}
              isSpeaking={isPlayingAudio}
              isProcessing={isProcessing}
              audioElement={currentAudioRef.current}
            />
          </div>
        </div>

        {/* COLUNA DIREITA - CONTROLES */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
          <div className="flex flex-col items-center space-y-6">
            {/* Indicador de Status */}
            <div className="relative flex items-center justify-center">
              <div className={`w-32 h-32 rounded-full ${getStatusColor()} flex items-center justify-center transition-all shadow-lg`}>
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>

            {/* Status */}
            <div className="text-center w-full">
              <p className="text-xl font-bold text-gray-900 mb-2">
                {getStatusMessage()}
              </p>
              {wakeWords.length > 1 && isListening && !conversationActive && (
                <p className="text-sm text-gray-600">
                  Ou: {wakeWords.slice(1).map(w => `"${w}"`).join(', ')}
                </p>
              )}
              {conversationActive && (
                <p className="text-sm text-gray-500 mt-2">
                  Diga "tchau" para encerrar
                </p>
              )}
            </div>

            {/* Transcrição */}
            {transcript && (
              <div className="w-full p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-1">Você disse:</p>
                <p className="text-gray-800">{transcript}</p>
              </div>
            )}

            {/* Resposta */}
            {response && (
              <div className="w-full p-4 bg-green-50 rounded-xl border-2 border-green-200">
                <p className="text-sm font-semibold text-green-900 mb-1">Assistente:</p>
                <p className="text-gray-800">{response}</p>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="w-full p-4 bg-red-50 rounded-xl border-2 border-red-200">
                <p className="text-sm font-semibold text-red-900 mb-1">Erro:</p>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Botão Encerrar */}
            {conversationActive && !isProcessing && !isPlayingAudio && (
              <button
                onClick={endConversation}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold shadow-lg"
              >
                Encerrar Conversa
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
