'use client';

import { useState, useEffect, useRef } from 'react';

interface VoiceAssistantWithWakeWordProps {
  companyId: string;
  companyName: string;
  wakeWord: string; // Pode ser múltiplas palavras separadas por vírgula
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
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationIdRef = useRef<string | null>(null);

  // Processar múltiplas palavras de ativação
  const wakeWords = wakeWord
    .split(',')
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 0);

  useEffect(() => {
    requestMicrophonePermission();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  async function requestMicrophonePermission() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      startWakeWordDetection();
    } catch (err) {
      setError('Permissão do microfone negada. Por favor, permita o acesso ao microfone.');
      setPermissionGranted(false);
    }
  }

  function startWakeWordDetection() {
    if (!('webkitSpeechRecognition' in window)) {
      setError('Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript.toLowerCase().trim();

      // Checar se alguma das palavras de ativação foi detectada
      const detectedWakeWord = wakeWords.some(word => transcript.includes(word));

      if (detectedWakeWord && !isRecording && !isProcessing && !isPlayingGreeting) {
        setWakeWordDetected(true);
        recognition.stop();
        playGreeting();
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Erro no reconhecimento:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Erro: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Reiniciar apenas se não estiver gravando ou processando
      if (!isRecording && !isProcessing && !isPlayingGreeting && permissionGranted) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            console.error('Erro ao reiniciar reconhecimento:', err);
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  async function playGreeting() {
    setIsPlayingGreeting(true);
    
    try {
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: greetingMessage }),
      });

      if (!response.ok) throw new Error('Erro ao gerar áudio');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlayingGreeting(false);
        startRecording();
      };

      audio.onerror = () => {
        setIsPlayingGreeting(false);
        setError('Erro ao reproduzir saudação');
        startRecording();
      };

      await audio.play();
    } catch (err: any) {
      console.error('Erro ao reproduzir saudação:', err);
      setIsPlayingGreeting(false);
      startRecording();
    }
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
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setWakeWordDetected(false);

      // Gravar por 10 segundos
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 10000);
    } catch (err: any) {
      setError('Erro ao iniciar gravação: ' + err.message);
      setIsRecording(false);
      restartWakeWordDetection();
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

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsProcessing(false);
        restartWakeWordDetection();
      };

      audio.onerror = () => {
        setIsProcessing(false);
        setError('Erro ao reproduzir resposta');
        restartWakeWordDetection();
      };

      await audio.play();
    } catch (err: any) {
      setError('Erro ao processar áudio: ' + err.message);
      setIsProcessing(false);
      restartWakeWordDetection();
    }
  }

  function restartWakeWordDetection() {
    setWakeWordDetected(false);
    setTranscript('');
    setResponse('');
    
    if (permissionGranted && recognitionRef.current) {
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error('Erro ao reiniciar:', err);
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

  const getStatusMessage = () => {
    if (!permissionGranted) return 'Aguardando permissão do microfone...';
    if (isPlayingGreeting) return '🔊 Reproduzindo saudação...';
    if (isRecording) return '🎤 Gravando sua pergunta... (10s)';
    if (isProcessing) return '⚙️ Processando e gerando resposta...';
    if (wakeWordDetected) return '✅ Palavra detectada!';
    if (isListening) return `🎧 Ouvindo... Diga: "${wakeWords[0]}"`;
    return '⏸️ Pausado';
  };

  const getStatusColor = () => {
    if (!permissionGranted) return 'bg-gray-500';
    if (isPlayingGreeting || isProcessing) return 'bg-blue-500';
    if (isRecording) return 'bg-red-500 animate-pulse';
    if (wakeWordDetected) return 'bg-green-500';
    if (isListening) return 'bg-green-500 animate-pulse';
    return 'bg-gray-500';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center space-y-6">
          {/* Indicador visual */}
          <div className="relative">
            <div className={`w-32 h-32 rounded-full ${getStatusColor()} flex items-center justify-center transition-all`}>
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>

          {/* Status */}
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {getStatusMessage()}
            </p>
            {wakeWords.length > 1 && isListening && (
              <p className="text-sm text-gray-600 mt-2">
                Ou: {wakeWords.slice(1).map(w => `"${w}"`).join(', ')}
              </p>
            )}
          </div>

          {/* Transcrição */}
          {transcript && (
            <div className="w-full p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-1">Você disse:</p>
              <p className="text-gray-800">{transcript}</p>
            </div>
          )}

          {/* Resposta */}
          {response && (
            <div className="w-full p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-semibold text-green-900 mb-1">Assistente respondeu:</p>
              <p className="text-gray-800">{response}</p>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="w-full p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-semibold text-red-900 mb-1">Erro:</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Botão parar gravação */}
          {isRecording && (
            <button
              onClick={stopRecording}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
            >
              ⏹️ Parar Gravação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
