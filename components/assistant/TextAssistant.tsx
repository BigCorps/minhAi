// components/assistant/TextAssistant.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Mic, MicOff, Send } from 'lucide-react';
import { getFunctionByKey } from '@/lib/functions-registry';

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

  // ── FIX 1: scroll para o fim após cada mensagem ────────────────
  // Não usamos flex-col-reverse — as mensagens ficam em ordem normal
  // e scrollamos programaticamente para o fim
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isDark = theme === 'dark';

  // Scroll para o fim sempre que novas mensagens chegam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('companyId', companyId);

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const { text } = await response.json();
        if (text?.trim()) {
          // Preenche o campo e envia automaticamente
          setInputText(text.trim());
          setTimeout(() => {
            handleSendMessage(text.trim());
          }, 300);
        }
      }
    } catch (error) {
      console.error('Erro ao transcrever:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── FIX 2: executar funções diretamente pelo registry ──────────
  // O voiceAssistantFunctionClick não funciona no modo texto porque
  // o VoiceAssistantWithWakeWord não está montado.
  // Aqui chamamos o handler do registry diretamente.
  const executeFunction = async (functionKey: string) => {
    const fn = getFunctionByKey(functionKey);
    if (!fn?.handler) {
      // Fallback: dispara o evento global mesmo assim
      // (útil para funções que abrem modais via ActionModals)
      window.dispatchEvent(
        new CustomEvent('voiceAssistantFunctionClick', {
          detail: { functionKey },
        })
      );
      return `Função ${functionKey.replace(/_/g, ' ')} ativada.`;
    }

    try {
      await fn.handler({
        companyId,
        playText: playText ?? (async () => {}),
        // Para funções que abrem modais, disparamos o evento global
        // pois o ActionModals está sempre montado no assistente-client
        setActiveModal: (modal: any) => {
          window.dispatchEvent(
            new CustomEvent('voiceAssistantFunctionClick', {
              detail: { functionKey: modal?.type ?? functionKey },
            })
          );
        },
        functionSettings: {},
        commandProcessor: null,
      });
      return `${fn.functionName} executado com sucesso.`;
    } catch (err) {
      console.error('Erro ao executar função:', err);
      return `Erro ao executar ${fn.functionName}.`;
    }
  };

  // Enviar mensagem
  const handleSendMessage = async (overrideText?: string) => {
    const messageText = (overrideText ?? inputText).trim();
    if (!messageText || isProcessing) return;

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
      const formData = new FormData();
      formData.append('audio', new Blob([messageText], { type: 'text/plain' }));
      formData.append('companyId', companyId);
      formData.append('directQuestion', messageText);

      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });

      // ── FIX 2: verificar X-Function-Key e executar via registry ──
      const hintFunctionKey = response.headers.get('X-Function-Key');
      if (hintFunctionKey) {
        const result = await executeFunction(hintFunctionKey);
        onFunctionExecuted?.(hintFunctionKey, result);

        const functionMessage: TextMessage = {
          id: `function-${Date.now()}`,
          role: 'assistant',
          content: result,
          functionKey: hintFunctionKey,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, functionMessage]);
        return;
      }

      if (!response.ok) throw new Error(`Erro: ${response.status}`);

      // Extrair texto da resposta
      const responseText = response.headers.get('X-Response-Text');
      const displayText = responseText
        ? decodeURIComponent(responseText)
        : 'Resposta recebida.';

      const assistantMessage: TextMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: displayText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Tocar o áudio da resposta
      if (playText) {
        try {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.playbackRate = 1.05;
          audio.play().catch(() => {});
        } catch {
          // Ignorar erro de áudio — resposta de texto já foi mostrada
        }
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

  // TTS para mensagem individual
  const handlePlayMessage = async (message: TextMessage) => {
    if (!playText) return;
    if (playingMessageId === message.id) {
      setPlayingMessageId(null);
    } else {
      setPlayingMessageId(message.id);
      await playText(message.content);
      setPlayingMessageId(null);
    }
  };

  // Enter envia, Shift+Enter quebra linha
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
    },
    textarea: {
      background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 0.8)',
      color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)',
    },
  };

  return (
    <div
      className="fixed inset-0 flex flex-col pt-[72px]"
      style={styles.container}
    >
      {/* ── FIX 1: área de mensagens em ordem normal (sem flex-col-reverse) */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col mb-[180px]"
      >
        {/* Mensagem de boas-vindas quando vazio */}
        {messages.length === 0 && !isProcessing && (
          <div className="flex h-full items-center justify-center flex-1">
            <p
              className="text-xl font-bold"
              style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)' }}
            >
              Como Posso te Ajudar Hoje?
            </p>
          </div>
        )}

        {/* Lista de mensagens em ordem cronológica normal */}
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
              {/* Conteúdo */}
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>

              {/* Badge de função */}
              {message.functionKey && (
                <div className="mt-2 text-xs opacity-80 flex items-center gap-1">
                  <span>✓</span>
                  <span>{message.functionKey.replace(/_/g, ' ')}</span>
                </div>
              )}

              {/* Botão TTS — só para respostas do assistente */}
              {message.role === 'assistant' && !message.functionKey && playText && (
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

        {/* Indicador de digitação */}
        {isProcessing && (
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

        {/* Âncora de scroll — sempre no fim */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <div
        className="fixed left-4 right-4 rounded-2xl shadow-xl backdrop-blur-xl z-40 px-3 py-3"
        style={{
          ...styles.inputContainer,
          bottom: '136px',
          border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
        }}
      >
        <div className="relative flex items-center gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Ouvindo...' : 'Clique no microfone ou digite sua mensagem...'}
            disabled={isProcessing || isRecording}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
            style={styles.textarea}
            rows={1}
          />

          {/* Botão: enviar se tem texto, microfone se não tem */}
          {inputText.trim() ? (
            <button
              onClick={() => handleSendMessage()}
              disabled={isProcessing}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-green-500 text-white hover:scale-110 transition-transform disabled:opacity-50"
              title="Enviar mensagem"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-110 disabled:opacity-50 ${
                isRecording ? 'text-red-500' : ''
              }`}
              style={
                isRecording
                  ? {}
                  : { color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }
              }
              title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4 animate-pulse" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
