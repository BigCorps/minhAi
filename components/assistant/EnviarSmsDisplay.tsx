'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Send, Loader2, AlertCircle, Check, Phone } from 'lucide-react';

interface EnviarSmsDisplayProps {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

export default function EnviarSmsDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: EnviarSmsDisplayProps) {
  const { companyId } = data;
  
  const [telefone, setTelefone] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [mounted, setMounted] = useState(false);

  const isDark = theme === 'dark';

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const DARK = {
    bg: 'bg-slate-900',
    cardBg: 'bg-slate-800',
    border: 'border-white/10',
    textPrimary: 'text-white',
    textMuted: 'text-white/60',
    inputBg: 'bg-slate-700',
  };

  const LIGHT = {
    bg: 'bg-white',
    cardBg: 'bg-gray-50',
    border: 'border-gray-200',
    textPrimary: 'text-gray-900',
    textMuted: 'text-gray-600',
    inputBg: 'bg-white',
  };

  const colors = isDark ? DARK : LIGHT;

  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
  }

  function formatarTelefone(valor: string) {
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limitado = numeros.substring(0, 11);
    
    // Formata (XX) XXXXX-XXXX
    if (limitado.length <= 2) {
      return limitado;
    } else if (limitado.length <= 7) {
      return `(${limitado.substring(0, 2)}) ${limitado.substring(2)}`;
    } else {
      return `(${limitado.substring(0, 2)}) ${limitado.substring(2, 7)}-${limitado.substring(7)}`;
    }
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatado = formatarTelefone(e.target.value);
    setTelefone(formatado);
  }

  async function handleEnviar() {
    // Validações
    const numeros = telefone.replace(/\D/g, '');
    
    if (!numeros) {
      showToast('Por favor, informe o número do telefone', 'error');
      return;
    }

    if (numeros.length < 10) {
      showToast('Telefone incompleto. Use (XX) XXXXX-XXXX', 'error');
      return;
    }

    if (!mensagem.trim()) {
      showToast('Por favor, escreva a mensagem', 'error');
      return;
    }

    if (mensagem.length > 160) {
      showToast('Mensagem muito longa. SMS tem limite de 160 caracteres', 'error');
      return;
    }

    setIsSending(true);

    try {
      console.log('📱 Enviando SMS para:', numeros);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms-gerente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          number: numeros,
          gerente_nome: '', // Não usado nesta função
          motivo: mensagem.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('❌ Erro ao enviar SMS:', result);
        throw new Error(result.error || 'Erro ao enviar SMS');
      }

      console.log('✅ SMS enviado com sucesso');

      showToast('SMS enviado com sucesso!', 'success');
      
      if (playText) {
        await playText('Mensagem SMS enviada com sucesso!');
      }

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('❌ Erro ao enviar SMS:', error);
      showToast(error.message || 'Erro ao enviar SMS', 'error');
      
      if (playText) {
        await playText('Erro ao enviar SMS. Tente novamente.');
      }
    } finally {
      setIsSending(false);
    }
  }

  if (!mounted) return null;

  const caracteresRestantes = 160 - mensagem.length;

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[400] px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'error' 
            ? 'bg-red-600 text-white' 
            : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      <div className={`w-full max-w-md rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border overflow-hidden`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(210, 105, 30, 0.2)' }}>
              <MessageSquare className="w-6 h-6" style={{ color: '#D2691E' }} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>Enviar SMS</h2>
              <p className={`text-xs ${colors.textMuted}`}>Mensagem via API Brasil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-white/50 hover:text-white hover:bg-white/10' 
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            } disabled:opacity-50`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* Telefone */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${colors.textPrimary}`}>
              <Phone className="w-4 h-4" />
              Número do telefone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={handleTelefoneChange}
              placeholder="(31) 99999-9999"
              disabled={isSending}
              maxLength={15}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-[#D2691E] focus:border-transparent disabled:opacity-50 transition-all`}
            />
            <p className={`text-xs mt-1 ${colors.textMuted}`}>
              Com DDD. Ex: (31) 99999-9999
            </p>
          </div>

          {/* Mensagem */}
          <div>
            <label className={`flex items-center justify-between text-sm font-medium mb-2 ${colors.textPrimary}`}>
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Mensagem <span className="text-red-500">*</span>
              </span>
              <span className={`text-xs font-mono ${
                caracteresRestantes < 20 ? 'text-red-500' : colors.textMuted
              }`}>
                {caracteresRestantes}/160
              </span>
            </label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={5}
              maxLength={160}
              disabled={isSending}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-[#D2691E] focus:border-transparent resize-none disabled:opacity-50 transition-all`}
            />
            <p className={`text-xs mt-1 ${colors.textMuted}`}>
              💡 SMS tem limite de 160 caracteres
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isSending}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition disabled:opacity-50 ${
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleEnviar}
              disabled={isSending || !telefone || !mensagem.trim()}
              className="flex-1 px-4 py-3 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              style={{ backgroundColor: '#D2691E' }}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar SMS
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
