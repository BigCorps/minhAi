'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';

export interface TextMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  functionKey?: string;
  timestamp: Date;
}

interface TextAssistantProps {
  companyId: string;
  theme: 'dark' | 'light';
  slug: string;
  onSendMessage: (text: string) => Promise<{ text: string; functionKey?: string } | null>;
  isProcessing?: boolean;
}

export default function TextAssistant({
  companyId,
  theme,
  slug,
  onSendMessage,
  isProcessing = false,
}: TextAssistantProps) {
  const [messages, setMessages] = useState<TextMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isDark = theme === 'dark';

  // Scroll para o fim após cada mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, isSending]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // ── Gravação de áudio ──────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        await transcribeAndSend(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Erro ao iniciar gravação:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAndSend = async (audioBlob: Blob) => {
    try {
      setIsSending(true);
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('companyId', companyId);

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const { text } = await response.json();
        if (text?.trim()) {
          await handleSendMessage(text.trim());
        }
      }
    } catch (err) {
      console.error('Erro ao transcrever:', err);
    } finally {
      setIsSending(false);
    }
  };

const handleSendMessage = async (overrideText?: string) => {
  const messageText = (overrideText ?? inputText).trim();
  if (!messageText || isSending || isProcessing) return;

  const userMessage: TextMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: messageText,
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, userMessage]);
  setInputText('');
  setIsSending(true);

  try {
    const result = await onSendMessage(messageText);

    let displayText = '';
    let functionKey: string | undefined;

    if (result) {
      functionKey = result.functionKey;
      if (result.text && result.text.trim()) {
        displayText = result.text.trim();
      } else {
        displayText = '✅ Função executada.';
      }
    }

    if (displayText) {
      const assistantMessage: TextMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: displayText,
        functionKey,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    setMessages((prev) => [
      ...prev,
      {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        timestamp: new Date(),
      },
    ]);
  } finally {
    setIsSending(false);
  }
};

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── Estilos ────────────────────────────────────────────────────────────────
  const styles = {
    container: {
      background: isDark
        ? 'linear-gradient(to bottom, rgb(2, 6, 23), rgb(15, 23, 42))'
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
      border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
    },
    textarea: {
      background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 0.8)',
      color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)',
    },
  };

  const busy = isSending || isProcessing;

  return (
    <div className="fixed inset-0 flex flex-col" style={styles.container}>
      {/*
        Área de mensagens
        pt-[120px] mobile (header 2 linhas) / md:pt-[72px] desktop (header 1 linha)
        pb cobre o input + carrossel + footer
      */}
      <div className="flex-1 overflow-y-auto px-12 pt-[140px] pb-[220px] md:pt-[96px] flex flex-col">

        {/* Boas-vindas quando vazio */}
        {messages.length === 0 && !busy && (
          <div className="flex flex-1 items-center justify-center">
            <p
              className="text-xl font-bold text-center"
              style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)' }}
            >
              Como Posso te Ajudar Hoje?
            </p>
          </div>
        )}

        {/* Mensagens em ordem cronológica */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>

              {/* Badge da função executada */}
              {message.functionKey && (
                <div className="mt-2 text-xs opacity-80 flex items-center gap-1">
                  <span>✓</span>
                  <span>{message.functionKey.replace(/_/g, ' ')}</span>
                </div>
              )}

              <div className="mt-1 text-xs opacity-50">
                {message.timestamp.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Indicador de digitação */}
        {busy && (
          <div className="mb-4 flex justify-start">
            <div
              className="rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm"
              style={styles.messageAssistant}
            >
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Âncora de scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/*
        Input box — fica acima do carrossel (bottom-[136px])
      */}
      <div
        className="fixed left-12 right-12 rounded-2xl shadow-xl backdrop-blur-xl z-40 px-3 py-3"
        style={{ ...styles.inputContainer, bottom: '136px' }}
      >
        <div className="relative flex items-center gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Ouvindo...' : 'Digite sua mensagem...'}
            disabled={busy || isRecording}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
            style={styles.textarea}
            rows={1}
          />

          {inputText.trim() ? (
            <button
              onClick={() => handleSendMessage()}
              disabled={busy}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-green-500 text-white hover:scale-110 transition-transform disabled:opacity-50"
              title="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={busy}
              className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-110 disabled:opacity-50 ${
                isRecording ? 'text-red-500' : ''
              }`}
              style={isRecording ? {} : { color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
              title={isRecording ? 'Parar' : 'Gravar'}
            >
              {isRecording ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
