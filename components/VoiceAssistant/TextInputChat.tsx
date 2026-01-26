'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface TextInputChatProps {
  onSendMessage: (message: string) => Promise<void>;
  isProcessing: boolean;
  theme?: 'dark' | 'light';
  disabled?: boolean;
}

export default function TextInputChat({
  onSendMessage,
  isProcessing,
  theme = 'dark',
  disabled = false
}: TextInputChatProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus no input quando não estiver processando
  useEffect(() => {
    if (!isProcessing && !disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing, disabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || isProcessing || disabled) return;

    setIsSending(true);
    setMessage(''); // Limpar input imediatamente

    try {
      await onSendMessage(trimmedMessage);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessage(trimmedMessage); // Restaurar mensagem em caso de erro
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter sem Shift envia
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const isDisabled = isProcessing || isSending || disabled;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
        theme === 'dark'
          ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm'
          : 'bg-white border-gray-200 shadow-sm'
      } ${isDisabled ? 'opacity-50' : ''}`}>
        
        {/* Input */}
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
              : 'Digite sua mensagem...'
          }
          className={`flex-1 bg-transparent outline-none text-sm placeholder:text-sm ${
            theme === 'dark'
              ? 'text-white placeholder:text-slate-400'
              : 'text-gray-900 placeholder:text-gray-400'
          } disabled:cursor-not-allowed`}
          maxLength={500}
        />

        {/* Contador de caracteres */}
        {message.length > 0 && (
          <span className={`text-xs ${
            theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
          }`}>
            {message.length}/500
          </span>
        )}

        {/* Botão Enviar */}
        <button
          type="submit"
          disabled={!message.trim() || isDisabled}
          className={`p-2 rounded-lg transition-all ${
            theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500'
              : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400'
          } text-white disabled:cursor-not-allowed`}
          aria-label="Enviar mensagem"
        >
          {isSending || isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Dica */}
      <p className={`text-xs text-center mt-2 ${
        theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
      }`}>
        Pressione Enter para enviar
      </p>
    </form>
  );
}
