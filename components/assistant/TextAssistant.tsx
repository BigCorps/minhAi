'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import TextInputChat from '@/components/VoiceAssistant/TextInputChat'; // ✅ NOVO

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

  // ✅ NOVO: Estados para teclado virtual
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isDark = theme === 'dark';

  // ✅ Detectar modo kiosk do sessionStorage
  useEffect(() => {
    const checkKiosk = () => {
      const kioskData = sessionStorage.getItem('eai:kioskMode');
      if (kioskData) {
        try {
          const { active } = JSON.parse(kioskData);
          setIsKioskMode(active === true);
        } catch {
          setIsKioskMode(false);
        }
      } else {
        setIsKioskMode(false);
      }
    };

    checkKiosk();

    // Listener para mudanças no modo kiosk
    const handleKioskChange = (e: CustomEvent) => {
      setIsKioskMode(e.detail?.active === true);
    };

    window.addEventListener('eai:kioskModeChange', handleKioskChange as EventListener);
    return () => {
      window.removeEventListener('eai:kioskModeChange', handleKioskChange as EventListener);
    };
  }, []);

  // ✅ NOVO: Listeners para eventos de teclado virtual
  useEffect(() => {
    const handleKeyboardOpen = () => {
      setIsKeyboardOpen(true);
      setShowVirtualKeyboard(true);
    };
    const handleKeyboardClose = () => {
      setIsKeyboardOpen(false);
      setShowVirtualKeyboard(false);
    };
    
    window.addEventListener('eai:virtualKeyboardOpen', handleKeyboardOpen);
    window.addEventListener('eai:virtualKeyboardClose', handleKeyboardClose);
    
    return () => {
      window.removeEventListener('eai:virtualKeyboardOpen', handleKeyboardOpen);
      window.removeEventListener('eai:virtualKeyboardClose', handleKeyboardClose);
    };
  }, []);

  // Scroll para o fim após cada mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, isSending]);

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

// ✅ DEPOIS — mesma lógica do arquivo 1 (base64 em JSON)
const transcribeAndSend = async (audioBlob: Blob) => {
  try {
    setIsSending(true);

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    const base64Audio = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    });

    const response = await fetch('/api/voice/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: base64Audio }),
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
    <div 
      className={`fixed inset-0 flex flex-col transition-all duration-300 ${
        isKeyboardOpen ? 'pb-[350px]' : 'pb-0'
      }`}
      style={styles.container}
    >
      {/*
        Área de mensagens
        pt-[120px] mobile (header 2 linhas) / md:pt-[72px] desktop (header 1 linha)
        pb aumenta quando teclado abre para dar espaço
      */}
      <div className={`flex-1 overflow-y-auto px-10 md:px-16 pt-[140px] md:pt-[96px] flex flex-col transition-all duration-300 ${
        isKeyboardOpen ? 'pb-[520px]' : 'pb-[220px]'
      }`}>

        {/* Boas-vindas quando vazio */}
        {messages.length === 0 && !busy && (
          <div className="flex flex-1 items-center justify-center">
            <p
              className={`text-xl font-bold text-center transition-all duration-300 ${
                isKeyboardOpen ? 'scale-90 -translate-y-12' : 'scale-100'
              }`}
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
        Input box — usa TextInputChat para suporte ao teclado virtual
        Z-index aumenta quando teclado abre para ficar acima dele
      */}
      <div
        className={`fixed left-10 right-10 md:left-16 md:right-16 transition-all duration-300 ${
          isKeyboardOpen 
            ? 'bottom-[320px] z-[10000]'  // ✅ Acima do teclado
            : 'bottom-[136px] z-40'
        }`}
      >
        <TextInputChat
          onSendMessage={async (text) => {
            await handleSendMessage(text);
          }}
          isProcessing={busy}
          theme={theme}
          showVirtualKeyboard={showVirtualKeyboard}
          onVirtualKeyboardToggle={isKioskMode ? undefined : () => setShowVirtualKeyboard(v => !v)}
          autoOpenKeyboard={isKioskMode}
        />
      </div>
    </div>
  );
}
