'use client';

import { useState, useRef, useCallback } from 'react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useWakeWord } from '@/hooks/useWakeWord';

interface VoiceAssistantWithWakeWordProps {
  companyId: string;
  companyName: string;
  wakeWord?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function VoiceAssistantWithWakeWord({
  companyId,
  companyName,
  wakeWord = 'olá assistente',
}: VoiceAssistantWithWakeWordProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [wakeWordDetectedCount, setWakeWordDetectedCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    isRecording,
    duration,
    error: recorderError,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  // Handler quando wake word é detectada
  const handleWakeWordDetected = useCallback(() => {
    console.log('🎯 Wake word detectada! Iniciando gravação...');
    setWakeWordDetectedCount((prev) => prev + 1);
    
    // Feedback visual/sonoro (opcional)
    playBeep();
    
    // Iniciar gravação automaticamente
    if (!isRecording) {
      startRecording();
      
      // Auto-stop após 30 segundos (segurança)
      setTimeout(() => {
        if (isRecording) {
          handleStopRecording();
        }
      }, 30000);
    }
  }, [isRecording, startRecording]);

  // Wake word detector
  const {
    isListening,
    isSupported,
    lastTranscript,
    error: wakeWordError,
    restart: restartWakeWord,
  } = useWakeWord({
    wakeWord,
    language: 'pt-BR',
    onWakeWordDetected: handleWakeWordDetected,
    enabled: !isRecording && !isProcessing, // Só ouve quando não está gravando
  });

  // Beep de feedback
  const playBeep = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  // Parar gravação e processar
  const handleStopRecording = async () => {
    try {
      setIsProcessing(true);
      const audioBlob = await stopRecording();

      // Criar FormData para enviar
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('companyId', companyId);
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }

      // Enviar para API
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao processar áudio');
      }

      // Pegar headers com transcrição e resposta
      const transcription = decodeURIComponent(
        response.headers.get('X-Transcription') || ''
      );
      const responseText = decodeURIComponent(
        response.headers.get('X-Response-Text') || ''
      );
      const newConversationId = response.headers.get('X-Conversation-Id');

      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
      }

      // Adicionar mensagens ao histórico
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: transcription,
        timestamp: new Date(),
      };

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Reproduzir áudio da resposta
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (error: any) {
      console.error('Error processing voice:', error);
      alert('Erro ao processar voz: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Formatar duração
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
              <p className="text-gray-600">Assistente de Voz com Wake Word</p>
            </div>
          </div>

          {/* Status Wake Word */}
          <div className="text-right">
            <div className="flex items-center space-x-2">
              {isListening && !isRecording && !isProcessing && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">
                    Aguardando "{wakeWord}"
                  </span>
                </>
              )}
              {!isSupported && (
                <span className="text-sm text-red-600">
                  ⚠️ Navegador não suporta
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Detecções: {wakeWordDetectedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-900 mb-2 flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Como usar com Wake Word:</span>
        </h3>
        <ol className="text-sm text-green-800 space-y-1 ml-7">
          <li>1. O sistema está sempre ouvindo (sem gravar ainda)</li>
          <li>2. Diga <strong>"{wakeWord}"</strong> para ativar</li>
          <li>3. Após o beep, fale sua pergunta</li>
          <li>4. Clique "Parar" ou aguarde processamento automático</li>
          <li>5. O assistente responderá por voz</li>
        </ol>
      </div>

      {/* Visualização de Reconhecimento */}
      {isListening && !isRecording && !isProcessing && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-xs text-gray-500 mb-2">Última transcrição:</p>
          <p className="text-sm text-gray-700 italic">
            {lastTranscript || 'Aguardando fala...'}
          </p>
        </div>
      )}

      {/* Status e Controles */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Status Atual */}
          <div className="text-center min-h-[60px] flex items-center">
            {isRecording && (
              <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center space-x-2 text-red-600">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="font-semibold">Gravando: {formatDuration(duration)}</span>
                </div>
                <p className="text-sm text-gray-600">Fale sua pergunta...</p>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold">Processando...</span>
              </div>
            )}
            
            {!isRecording && !isProcessing && (
              <div className="text-center">
                <p className="text-gray-700 font-medium mb-1">
                  🎤 Diga "{wakeWord}" para começar
                </p>
                <p className="text-sm text-gray-500">
                  Ou clique no botão abaixo
                </p>
              </div>
            )}
          </div>

          {/* Botão de Controle Manual */}
          {isRecording && (
            <button
              onClick={handleStopRecording}
              disabled={isProcessing}
              className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition disabled:opacity-50"
            >
              ⏹️ Parar e Processar
            </button>
          )}

          {!isRecording && !isProcessing && (
            <button
              onClick={startRecording}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition"
            >
              🎙️ Gravar Manualmente
            </button>
          )}

          {/* Erros */}
          {(recorderError || wakeWordError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 max-w-md">
              {recorderError || wakeWordError}
            </div>
          )}

          {/* Botão de Reiniciar Wake Word */}
          {!isListening && !isRecording && !isProcessing && (
            <button
              onClick={restartWakeWord}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              🔄 Reiniciar Detecção de Wake Word
            </button>
          )}
        </div>
      </div>

      {/* Histórico de Conversas */}
      {messages.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Histórico</h2>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {message.role === 'assistant' && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                      </svg>
                    )}
                    <span className="text-xs opacity-75">
                      {message.timestamp.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio player (hidden) */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
