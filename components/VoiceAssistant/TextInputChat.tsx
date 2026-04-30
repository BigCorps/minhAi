'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Keyboard } from 'lucide-react';
import VirtualKeyboard from '@/components/assistant/VirtualKeyboard';

interface TextInputChatProps {
  onSendMessage: (message: string) => Promise<void>;
  isProcessing: boolean;
  theme?: 'dark' | 'light';
  disabled?: boolean;
  externalValue?: string;
  onExternalValueConsumed?: () => void;
  /** Modo compacto: fonte menor, sem hint "Pressione Enter", padding reduzido */
  compact?: boolean;
  /** Exibe teclado virtual (modo kiosk) - CONTROLADO PELO PAI */
  showVirtualKeyboard?: boolean;
  onVirtualKeyboardToggle?: () => void;
  /** Se true, abre teclado ao focar e NÃO mostra botão de toggle */
  autoOpenKeyboard?: boolean;
}

export default function TextInputChat({
  onSendMessage,
  isProcessing,
  theme = 'dark',
  disabled = false,
  externalValue,
  onExternalValueConsumed,
  compact = false,
  showVirtualKeyboard = false, // ← PROP controlado pelo pai
  onVirtualKeyboardToggle,
  autoOpenKeyboard = false,  // ✅ NOVO
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

  // ✅ NOVO: Abrir teclado automaticamente ao focar (modo kiosk)
  useEffect(() => {
    if (!autoOpenKeyboard || !inputRef.current) return;

    const handleFocus = () => {
      if (!showVirtualKeyboard && onVirtualKeyboardToggle) {
        onVirtualKeyboardToggle();
      }
    };

    const input = inputRef.current;
    input.addEventListener('focus', handleFocus);

    return () => {
      input.removeEventListener('focus', handleFocus);
    };
  }, [autoOpenKeyboard, showVirtualKeyboard, onVirtualKeyboardToggle]);

  // ✅ NOVO: Disparar eventos quando teclado abre/fecha
  useEffect(() => {
    if (showVirtualKeyboard) {
      window.dispatchEvent(new CustomEvent('eai:virtualKeyboardOpen'));
    } else {
      window.dispatchEvent(new CustomEvent('eai:virtualKeyboardClose'));
    }
  }, [showVirtualKeyboard]);

  // ✅ NOVO: Fechar teclado quando evento for disparado
  useEffect(() => {
    const handleClose = () => {
      if (showVirtualKeyboard && onVirtualKeyboardToggle) {
        onVirtualKeyboardToggle();
      }
    };

    window.addEventListener('eai:virtualKeyboardClose', handleClose);
    return () => {
      window.removeEventListener('eai:virtualKeyboardClose', handleClose);
    };
  }, [showVirtualKeyboard, onVirtualKeyboardToggle]);

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

  // ── Handlers do teclado virtual ──────────────────────────
  const handleVirtualKey = (char: string) => {
    if (message.length >= 500) return;
    setMessage(prev => prev + char);
  };

  const handleVirtualBackspace = () => {
    setMessage(prev => prev.slice(0, -1));
  };

  const handleVirtualEnter = () => {
    if (!message.trim() || isDisabled) return;
    handleSubmit({ preventDefault: () => {} } as any);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" data-no-swipe>
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

        {/* Botão toggle teclado virtual - SÓ aparece se NÃO for autoOpen */}
        {onVirtualKeyboardToggle && !autoOpenKeyboard && (
          <button
            type="button"
            onClick={onVirtualKeyboardToggle}
            className={`flex-shrink-0 rounded-lg transition-all p-2 ${
              showVirtualKeyboard
                ? 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={showVirtualKeyboard ? 'Fechar teclado virtual' : 'Abrir teclado virtual'}
          >
            <Keyboard className="w-4 h-4" />
          </button>
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

      {/* Hint "Pressione Enter" — oculto no modo compacto e quando teclado virtual está ativo */}
      {!compact && !showVirtualKeyboard && (
        <p className={`text-xs text-center mt-2 ${
          theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
        }`}>
          Pressione Enter para enviar
        </p>
      )}

      {/* Teclado virtual — fixo no bottom, acima de tudo */}
      {showVirtualKeyboard && (
        <div className="fixed bottom-0 left-0 right-0 z-[9999]">
          <VirtualKeyboard
            onKey={handleVirtualKey}
            onBackspace={handleVirtualBackspace}
            onEnter={handleVirtualEnter}
            onClose={onVirtualKeyboardToggle}
            theme={theme}
          />
        </div>
      )}
    </form>
  );
}
