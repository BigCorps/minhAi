'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Send, Loader2, AlertCircle, Check } from 'lucide-react';

interface ChamarGerenteDisplayProps {
  data: {
    companyId: string;
    motivo?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

export default function ChamarGerenteDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: ChamarGerenteDisplayProps) {
  const { companyId, motivo: motivoInicial } = data;
  
  const [motivo, setMotivo] = useState(motivoInicial || '');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [gerenteNome, setGerenteNome] = useState<string>('Gerente');
  const [notificarEmail, setNotificarEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificarSms, setNotificarSms] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isDark = theme === 'dark';


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

  // O navegador recebe somente nome e disponibilidade dos canais.
  useEffect(() => {
    let active = true;
    async function fetchData() {
      setLoading(true);
      setNotificarEmail(false);
      setNotificarSms(false);
      try {
        const response = await fetch(`/api/public/manager-assistance?company_id=${encodeURIComponent(companyId)}`, { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error('configuration_unavailable');
        if (!active) return;
        setGerenteNome(payload.manager_name || 'Gerente');
        setNotificarEmail(payload.channels?.email === true);
        setNotificarSms(payload.channels?.sms === true);
      } catch {
        if (active) showToast('Erro ao carregar dados do gerente', 'error');
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchData();
    return () => { active = false; };
  }, [companyId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
  }

async function handleSend() {
  if (!motivo.trim()) {
    showToast('Por favor, descreva o motivo da chamada', 'error');
    return;
  }

  if (!notificarEmail && !notificarSms) {
    showToast('Configure ao menos um canal de notificação', 'error');
    return;
  }

  setIsSending(true);

  try {
    const response = await fetch('/api/public/manager-assistance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, reason: motivo.trim() }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok || !payload.notified?.length) {
      const messages: Record<string, string> = {
        rate_limited: 'Limite temporário de notificações atingido. Tente novamente mais tarde.',
        no_channel: 'Configure ao menos um canal de notificação',
        insufficient_credits: 'Créditos de uso insuficientes para SMS.',
        reason_too_long: 'O motivo deve ter no máximo 500 caracteres.',
      };
      throw new Error(messages[payload.reason] || 'Erro ao enviar notificação');
    }
    const canais = payload.notified.map((channel: string) => channel === 'sms' ? 'SMS' : 'email').join(' e ');
    showToast(`Gerente notificado via ${canais}!`, 'success');
    if (playText) await playText('Gerente notificado com sucesso!');
    setTimeout(onClose, 1500);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Erro ao enviar notificação', 'error');
    
    if (playText) {
      await playText('Erro ao enviar notificação. Tente novamente.');
    }
  } finally {
    setIsSending(false);
  }
}

  if (!mounted) return null;

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
        
        <div className={`px-6 py-4 border-b ${colors.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-yellow-900/30' : 'bg-yellow-100'}`}>
              <Bell className={`w-6 h-6 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>Chamar Gerente</h2>
              <p className={`text-xs ${colors.textMuted}`}>
                {[
                  notificarEmail && 'Email',
                  notificarSms && 'SMS',
                ].filter(Boolean).join(' + ') || 'Notificação'}
              </p>
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

        <div className="p-6 space-y-4">
          
          <div className={`p-3 rounded-lg ${colors.cardBg} ${colors.border} border`}>
            <p className={`text-xs ${colors.textMuted} mb-1`}>Destinatário:</p>
            <p className={`text-sm font-medium ${colors.textPrimary}`}>{gerenteNome}</p>
            {notificarEmail && (
              <p className={`text-xs ${colors.textMuted} mt-0.5 flex items-center gap-1`}>
                <span>📧</span>
                <span>E-mail configurado</span>
              </p>
            )}
            {notificarSms && (
              <p className={`text-xs ${colors.textMuted} mt-0.5 flex items-center gap-1`}>
                <span>📱</span>
                <span>SMS configurado</span>
              </p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              Motivo da chamada:
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo (ex: Aprovação necessária, problema no caixa, cliente solicitando gerente...)"
              rows={5}
              maxLength={500}
              disabled={isSending}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none disabled:opacity-50`}
            />
            <p className={`text-xs ${colors.textMuted} mt-1`}>
              💡 Seja específico para que o gerente saiba a urgência
            </p>
          </div>

          <div className="flex gap-3">
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
              onClick={handleSend}
              disabled={loading || isSending || !motivo.trim()}
              className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Notificar Gerente
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
