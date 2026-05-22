// components/dashboard/vendas/AssistenteFiscalChat.tsx
// Chat conversacional para coleta de dados fiscais com IA

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { Loader2, Send, Mic, Volume2, VolumeX, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ItemNota {
  nome: string;
  quantidade: number;
  valor_unitario: number;
  unidade: string;
  ncm?: string;
  cfop?: number;
  origem_produto?: number;
  produto_id?: string;
  ncm_sugerido?: boolean;
}

interface DadosNota {
  destinatario: {
    nome: string;
    cpf_cnpj?: string;
    endereco?: string;
  };
  itens: ItemNota[];
}

interface SugestaoNCM {
  produto: string;
  ncm: string;
  descricao: string;
  confianca: 'alta' | 'media' | 'baixa';
}

interface AssistenteFiscalChatProps {
  companyId: string;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
  onDadosAtualizados: (dados: DadosNota | null, status: 'collecting' | 'ready' | 'error') => void;
}

export default function AssistenteFiscalChat({
  companyId,
  theme = 'dark',
  playText,
  onDadosAtualizados,
}: AssistenteFiscalChatProps) {
  const isDark = theme === 'dark';
  const supabase = createClient();
  const voiceRecorder = useVoiceRecorder();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioMutado, setAudioMutado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sugestoesNCM, setSugestoesNCM] = useState<SugestaoNCM[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioMutadoRef = useRef(false);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const hasSpokenInitialRef = useRef(false);

  // Cores tema
  const C = {
    bg: isDark ? '#1e293b' : '#ffffff',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    bgChat: isDark ? '#0f172a' : '#f1f5f9',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    accent: '#3b82f6',
    userBubble: isDark ? '#3b82f6' : '#2563eb',
    assistantBubble: isDark ? '#334155' : '#e2e8f0',
  };

  // Toggle mute
  const toggleMute = useCallback(() => {
    setAudioMutado(prev => {
      audioMutadoRef.current = !prev;
      return !prev;
    });
  }, []);

  // Play text com fila anti-duplicação
  const playTextSafe = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;

    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;

    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try {
          await playText(next);
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error('Erro ao falar:', err);
        }
      }
    }
    isPlayingRef.current = false;
  }, [playText]);

  // Scroll para última mensagem
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mensagem inicial
  useEffect(() => {
    if (hasSpokenInitialRef.current) return;
    hasSpokenInitialRef.current = true;

    const initialMsg: Message = {
      id: `init-${Date.now()}`,
      role: 'assistant',
      content: 'Olá! Vou te ajudar a emitir uma nota fiscal. Você pode preencher aqui ao lado ou passar as informações para mim que eu preencho pra você.',
      timestamp: new Date(),
    };

    setMessages([initialMsg]);
    playTextSafe(initialMsg.content);
  }, [playTextSafe]);

  // Enviar mensagem para IA
  const enviarMensagem = useCallback(async (texto: string) => {
    if (!texto.trim() || isProcessing) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: texto,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);
    setError(null);

    try {
      // Buscar user_id
      const { data: { user } } = await supabase.auth.getUser();

      // Chamar edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/assistente-fiscal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            user_id: user?.id,
            messages: [...messages, userMsg].map(m => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      playTextSafe(data.message);

      // Atualizar sugestões de NCM se houver
      if (data.sugestoes_ncm && data.sugestoes_ncm.length > 0) {
        setSugestoesNCM(data.sugestoes_ncm);
      }

      // Notificar parent sobre dados atualizados
      onDadosAtualizados(data.dados, data.status);

    } catch (err: any) {
      console.error('Erro ao processar mensagem:', err);
      setError(err.message || 'Erro ao processar mensagem');
      
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, tive um problema. Pode repetir?',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMsg]);
      playTextSafe(errorMsg.content);
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, messages, isProcessing, supabase, playTextSafe, onDadosAtualizados]);

  // Gravação de voz
  const handleStartVoice = useCallback(async () => {
    try {
      await voiceRecorder.startRecording();
    } catch (err) {
      console.error('Erro ao iniciar gravação:', err);
      setError('Erro ao acessar microfone');
    }
  }, [voiceRecorder]);

// DEPOIS
const handleStopVoice = useCallback(async () => {
  try {
    setIsTranscribing(true);
    const audioBlob = await voiceRecorder.stopRecording();

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

    if (!response.ok) throw new Error('Erro ao transcrever áudio');

    const { text } = await response.json();

    if (text?.trim()) {
      await enviarMensagem(text.trim());
    }
  } catch (err) {
    console.error('Erro ao processar voz:', err);
    setError('Erro ao transcrever áudio');
  } finally {
    setIsTranscribing(false);
  }
}, [voiceRecorder, enviarMensagem]);

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviarMensagem(inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem(inputText);
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: C.bgChat }}
    >
      {/* Header com botão mute */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: C.border, backgroundColor: C.bg }}
      >
        <div>
          <h3 className="text-sm font-bold" style={{ color: C.text }}>
            Assistente Fiscal
          </h3>
          <p className="text-xs" style={{ color: C.textMuted }}>
            Descreva os itens por voz ou texto
          </p>
        </div>
        <button
          onClick={toggleMute}
          className="p-2 rounded-lg transition-colors"
          style={{
            backgroundColor: audioMutado ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: audioMutado ? '#ef4444' : C.accent,
          }}
          title={audioMutado ? 'Áudio desligado' : 'Áudio ligado'}
        >
          {audioMutado ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2 text-sm"
              style={{
                backgroundColor: msg.role === 'user' ? C.userBubble : C.assistantBubble,
                color: msg.role === 'user' ? '#ffffff' : C.text,
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-2 flex items-center gap-2"
              style={{ backgroundColor: C.assistantBubble }}
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.accent }} />
              <span className="text-sm" style={{ color: C.textMuted }}>
                Processando...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões de NCM */}
      {sugestoesNCM.length > 0 && (
        <div className="px-4 pb-2">
          <div
            className="rounded-xl p-3 border"
            style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: C.text }}>
              💡 Sugestões de NCM:
            </p>
            <div className="space-y-1">
              {sugestoesNCM.map((sug, idx) => (
                <div key={idx} className="text-xs" style={{ color: C.textMuted }}>
                  <span className="font-mono font-semibold" style={{ color: C.accent }}>
                    {sug.ncm}
                  </span>
                  {' - '}
                  <span>{sug.produto}</span>
                  {' '}
                  <span className="opacity-70">({sug.descricao})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="px-4 pb-2">
          <div
            className="rounded-xl p-3 flex items-start gap-2"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-xs">{error}</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: C.border, backgroundColor: C.bg }}
      >
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={isProcessing || isTranscribing}
            className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: C.bgSecondary,
              borderColor: C.border,
              color: C.text,
            }}
          />

          {/* Botão gravação */}
          <button
            type="button"
            onClick={voiceRecorder.isRecording ? handleStopVoice : handleStartVoice}
            disabled={isProcessing || isTranscribing}
            className="p-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: voiceRecorder.isRecording ? '#ef4444' : C.accent,
              color: '#ffffff',
            }}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Botão enviar */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing || isTranscribing}
            className="p-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: C.accent,
              color: '#ffffff',
            }}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>

        {voiceRecorder.isRecording && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
              Gravando... {voiceRecorder.duration}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
