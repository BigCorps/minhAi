// components/assistant/TextAssistant.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface TextAssistantProps {
  companyId: string;
  theme: 'dark' | 'light';
  slug: string;
  onFunctionExecuted?: (functionKey: string, result: string) => void;
  playText?: (text: string) => Promise<void>;
}

interface TextMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  functionKey?: string;
  functionResult?: string;
  timestamp: Date;
}

export default function TextAssistant({
  companyId,
  theme,
  slug,
  onFunctionExecuted,
  playText,
}: TextAssistantProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [messages, setMessages] = useState<TextMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isDark = theme === 'dark';

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
    }
  }, [inputText]);

  // Iniciar gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
    }
  };

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Transcrever áudio via Google Speech
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.transcript) {
        setInputText(data.transcript);
        // Enviar automaticamente após 500ms
        setTimeout(() => {
          handleSendMessage(data.transcript);
        }, 500);
      }
    } catch (error) {
      console.error('Erro na transcrição:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Processar mensagem enviada
  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // Adicionar mensagem do usuário
    const userMessage: TextMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      // Chamar API do assistente
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          companyId,
          directQuestion: true,
        }),
      });

      const data = await response.json();

      // Verificar se é uma função ou resposta de texto
      if (data.functionKey) {
        // Executar função
        const functionMessage: TextMessage = {
          id: `function-${Date.now()}`,
          role: 'assistant',
          content: data.response || 'Função executada',
          functionKey: data.functionKey,
          functionResult: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, functionMessage]);

        // Disparar evento para executar a função
        window.dispatchEvent(
          new CustomEvent('voiceAssistantFunctionClick', {
            detail: { functionKey: data.functionKey },
          })
        );

        onFunctionExecuted?.(data.functionKey, data.response || '');
      } else {
        // Resposta de texto normal
        const assistantMessage: TextMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response || 'Desculpe, não entendi.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      const errorMessage: TextMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // TTS para mensagem
  const handlePlayMessage = async (message: TextMessage) => {
    if (!playText) return;

    if (playingMessageId === message.id) {
      // Parar reprodução (implementar cancelamento no playText se necessário)
      setPlayingMessageId(null);
    } else {
      setPlayingMessageId(message.id);
      await playText(message.content);
      setPlayingMessageId(null);
    }
  };

  // Handler de tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const styles = {
    container: {
      background: isDark
        ? 'linear-gradient(to bottom, rgb(15, 23, 42), rgb(30, 41, 59))'
        : 'linear-gradient(to bottom, rgb(248, 250, 252), rgb(241, 245, 249))',
    },
    messageUser: {
      background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(16, 185, 129))',
      color: '#ffffff',
    },
    messageAssistant: {
      background: isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)',
    },
    messageFunction: {
      background: 'linear-gradient(135deg, rgb(139, 92, 246), rgb(236, 72, 153))',
      color: '#ffffff',
    },
    inputContainer: {
      background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
    },
    textarea: {
      background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 0.8)',
      color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)',
    },
  };

  return (
    <div
      className="flex flex-col min-h-screen pt-20 pb-32"
      style={styles.container}
    >
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col-reverse">
        <div ref={messagesEndRef} />
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm"
              style={
                message.role === 'user'
                  ? styles.messageUser
                  : message.functionKey
                  ? styles.messageFunction
                  : styles.messageAssistant
              }
            >
              {/* Conteúdo da mensagem */}
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>

              {/* Badge de função executada */}
              {message.functionKey && (
                <div className="mt-2 text-xs opacity-80">
                  ✓ {message.functionKey.replace(/_/g, ' ')}
                </div>
              )}

              {/* Botão de TTS apenas para mensagens do assistente */}
              {message.role === 'assistant' && playText && (
                <button
                  onClick={() => handlePlayMessage(message)}
                  className="mt-2 text-lg hover:scale-110 transition-transform"
                  title={playingMessageId === message.id ? 'Parar' : 'Ouvir'}
                >
                  {playingMessageId === message.id ? '🔇' : '🔊'}
                </button>
              )}

              {/* Timestamp */}
              <div className="mt-1 text-xs opacity-50">
                {message.timestamp.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Indicador de processamento */}
        {isProcessing && (
          <div className="mb-4 flex justify-start">
            <div
              className="rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm"
              style={styles.messageAssistant}
            >
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input box fixo na parte inferior */}
      <div
        className="fixed bottom-8 left-0 right-0 px-4 py-3 border-t backdrop-blur-xl"
        style={styles.inputContainer}
      >
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={isProcessing || isRecording}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={styles.textarea}
            rows={1}
          />

          {/* Botão dinâmico */}
          {inputText.trim() ? (
            // Botão enviar
            <button
              onClick={() => handleSendMessage()}
              disabled={isProcessing}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-green-500 text-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
            >
              →
            </button>
          ) : (
            // Botão microfone
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gradient-to-r from-blue-500 to-green-500 text-white'
              }`}
            >
              {isRecording ? '🔴' : '🎤'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
