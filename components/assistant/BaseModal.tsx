'use client';

import { useState, useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Props do BaseModal
 */
interface BaseModalProps {
  // Controle
  isOpen: boolean;
  onClose: () => void;
  
  // Conteúdo
  title: string;
  children: ReactNode;
  
  // Aparência
  theme?: 'dark' | 'light';
  size?: 'small' | 'medium' | 'large' | 'full';
  
  // Comportamento
  autoCloseSeconds?: number; // 0 = não fecha automaticamente
  showTimer?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  
  // Footer
  footer?: ReactNode;
  
  // Classes customizadas
  className?: string;
}

/**
 * Modal Base para o Assistente de Voz
 * 
 * Fornece funcionalidades padrão:
 * - Timer de auto-fechamento
 * - Backdrop blur
 * - Animações de entrada/saída
 * - Suporte a temas dark/light
 * - Tamanhos responsivos
 */
export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  theme = 'dark',
  size = 'medium',
  autoCloseSeconds = 0,
  showTimer = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  footer,
  className = '',
}: BaseModalProps) {
  const [timeLeft, setTimeLeft] = useState(autoCloseSeconds);
  
  // Timer de auto-fechamento
  useEffect(() => {
    if (!isOpen || autoCloseSeconds <= 0) return;
    
    setTimeLeft(autoCloseSeconds);
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, autoCloseSeconds, onClose]);
  
  // Fechar com ESC
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeOnEsc, onClose]);
  
  if (!isOpen) return null;
  
  // Mapear tamanhos
  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-2xl',
    full: 'max-w-full mx-4',
  };
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        className={`
          relative w-full ${sizeClasses[size]} rounded-2xl shadow-2xl overflow-hidden 
          animate-in zoom-in duration-300
          ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`
            flex items-center justify-between px-4 py-3 border-b
            ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}
          `}
        >
          <h2
            className={`
              text-lg font-bold
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
            `}
          >
            {title}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Timer */}
            {showTimer && autoCloseSeconds > 0 && (
              <div
                className={`
                  px-2 py-0.5 rounded-full text-xs font-medium
                  ${
                    theme === 'dark'
                      ? 'bg-blue-900/30 text-blue-300'
                      : 'bg-blue-100 text-blue-700'
                  }
                `}
              >
                {timeLeft}s
              </div>
            )}
            
            {/* Botão fechar */}
            <button
              onClick={onClose}
              className={`
                p-1.5 rounded-full transition
                ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}
              `}
              aria-label="Fechar"
            >
              <X
                className={`w-4 h-4 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-4">
          {children}
        </div>
        
        {/* Footer (opcional) */}
        {footer && (
          <div
            className={`
              px-4 py-3 border-t
              ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}
            `}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook auxiliar para gerenciar estado de modais
 */
export function useModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  
  const open = (data?: any) => {
    setModalData(data);
    setIsOpen(true);
  };
  
  const close = () => {
    setIsOpen(false);
    setTimeout(() => setModalData(null), 300); // Aguardar animação
  };
  
  return {
    isOpen,
    modalData,
    open,
    close,
  };
}