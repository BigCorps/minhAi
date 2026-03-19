'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface TextInputChatProps {
  onSendMessage: (message: string) => Promise<void>;
  isProcessing: boolean;
  theme?: 'dark' | 'light';
  disabled?: boolean;
  externalValue?: string;
  onExternalValueConsumed?: () => void;
  /** Modo compacto: fonte menor, sem hint "Pressione Enter", padding reduzido */
  compact?: boolean;
}

export default function TextInputChat({
  onSendMessage,
  isProcessing,
  theme = 'dark',
  disabled = false,
  externalValue,
  onExternalValueConsumed,
  compact = false,
}: TextInputChatProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus no input quando não estiver processando (apenas desktop)
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile && !isProcessing && !disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing, disabled]);

  // Popula o input quando vem transcrição do microfone push-to-talk
  useEffect(() => {
    if (externalValue) {
      onExternalValueConsumed?.();
      onSendMessage(externalValue).catch(console.error);
    }
  }, [externalValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || isProcessing || disabled) return;
    setIsSending(true);
    setMessage('');
    try {
      await onSendMessage(trimmedMessage);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessage(trimmedMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const isDisabled = isProcessing || isSending || disabled;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`flex items-center gap-1.5 rounded-xl border transition-all ${
        compact ? 'p-1.5' : 'p-3'
      } ${
        theme === 'dark'
          ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm'
          : 'bg-white border-gray-200 shadow-sm'
      } ${isDisabled ? 'opacity-50' : ''}`}>

        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder={
            isProcessing
              ? 'Processando...'
              : isSending
              ? 'Enviando...'
              : compact
              ? 'Digite...'
              : 'Ou digite sua mensagem...'
          }
          className={`flex-1 min-w-0 bg-transparent outline-none ${
            compact
              ? 'text-[11px] placeholder:text-[11px]'
              : 'text-sm placeholder:text-sm'
          } ${
            theme === 'dark'
              ? 'text-white placeholder:text-slate-400'
              : 'text-gray-900 placeholder:text-gray-400'
          } disabled:cursor-not-allowed`}
          maxLength={500}
        />

        {/* Contador de caracteres — só no modo normal */}
        {!compact && message.length > 0 && (
          <span className={`text-xs flex-shrink-0 ${
            theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
          }`}>
            {message.length}/500
          </span>
        )}

        <button
          type="submit"
          disabled={!message.trim() || isDisabled}
          className={`flex-shrink-0 rounded-lg transition-all ${
            compact ? 'p-1' : 'p-2'
          } ${
            theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500'
              : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400'
          } text-white disabled:cursor-not-allowed`}
          aria-label="Enviar mensagem"
        >
          {isSending || isProcessing ? (
            <Loader2 className={compact ? 'w-3 h-3 animate-spin' : 'w-4 h-4 animate-spin'} />
          ) : (
            <Send className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          )}
        </button>
      </div>

      {/* Hint "Pressione Enter" — oculto no modo compacto */}
      {!compact && (
        <p className={`text-xs text-center mt-2 ${
          theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
        }`}>
          Pressione Enter para enviar
        </p>
      )}
    </form>
  );
}
