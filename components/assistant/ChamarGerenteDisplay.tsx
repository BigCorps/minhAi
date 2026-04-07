'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Send, Loader2, AlertCircle, Check, UserPlus, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

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
  const [gerenteEmail, setGerenteEmail] = useState<string>('');
  const [gerenteTelefone, setGerenteTelefone] = useState<string>(''); // ✅ ADICIONADO
  const [gerenteNome, setGerenteNome] = useState<string>('Gerente');
  const [gerenteConfigurado, setGerenteConfigurado] = useState(false); // ✅ ADICIONADO
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();
  const router = useRouter();
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

  // ✅ Buscar dados do gerente + REALTIME
  useEffect(() => {
    async function fetchGerenteData() {
      try {
        const { data: perfis } = await supabase
          .from('company_profiles')
          .select('nome, email, telefone')
          .eq('company_id', companyId)
          .eq('tipo', 'gerente')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (perfis) {
          setGerenteNome(perfis.nome || 'Gerente');
          setGerenteEmail(perfis.email || '');
          setGerenteTelefone(perfis.telefone || '');
          setGerenteConfigurado(!!(perfis.email || perfis.telefone));
        } else {
          // Fallback para business_email da empresa
          const { data: company } = await supabase
            .from('companies')
            .select('business_email, name')
            .eq('id', companyId)
            .single();
            
          if (company?.business_email) {
            setGerenteEmail(company.business_email);
            setGerenteNome('Gestão');
            setGerenteConfigurado(true);
          } else {
            setGerenteConfigurado(false);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados do gerente:', error);
        setGerenteConfigurado(false);
      }
    }
    
    fetchGerenteData();

    // ✅ REALTIME: atualiza quando gerente mudar
    const channel = supabase
      .channel(`gerente-${companyId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'company_profiles',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.tipo === 'gerente' && updated.is_active) {
          setGerenteNome(updated.nome || 'Gerente');
          setGerenteEmail(updated.email || '');
          setGerenteTelefone(updated.telefone || '');
          setGerenteConfigurado(!!(updated.email || updated.telefone));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

    if (!gerenteEmail && !gerenteTelefone) {
      showToast('Configure o email ou telefone do gerente primeiro', 'error');
      return;
    }

    setIsSending(true);

    try {
      // Envia email se tiver
      if (gerenteEmail) {
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: gerenteEmail,
            subject: '🔔 Chamada de Gerente - minhAi',
            body: `Olá ${gerenteNome},\n\nVocê foi chamado(a) por um colaborador.\n\n**Motivo:**\n${motivo}\n\n---\nEnviado via minhAi`,
          }),
        });

        if (!response.ok) {
          throw new Error('Falha ao enviar email');
        }
      }

      // TODO: Enviar SMS se tiver telefone configurado
      // if (gerenteTelefone) { ... }

      showToast('Gerente notificado com sucesso!', 'success');
      
      if (playText) {
        await playText('Gerente notificado com sucesso!');
      }

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      showToast('Erro ao enviar notificação', 'error');
      
      if (playText) {
        await playText('Erro ao enviar notificação. Tente novamente.');
      }
    } finally {
      setIsSending(false);
    }
  }

  function handleGoToCadastros() {
    onClose();
    router.push(`/dashboard/${companyId}/cadastros`);
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
              <p className={`text-xs ${colors.textMuted}`}>Notificação via email{gerenteTelefone ? ' e SMS' : ''}</p>
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
          
          {/* ✅ Aviso se gerente não configurado */}
          {!gerenteConfigurado ? (
            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-amber-900/20 border-amber-500/20' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  isDark ? 'text-amber-400' : 'text-amber-600'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold mb-1 ${
                    isDark ? 'text-amber-200' : 'text-amber-900'
                  }`}>
                    Gerente não configurado
                  </p>
                  <p className={`text-xs mb-3 ${
                    isDark ? 'text-amber-300' : 'text-amber-700'
                  }`}>
                    Para usar esta função, cadastre um perfil do tipo "Gerente" com email e/ou telefone.
                  </p>
                  <button
                    onClick={handleGoToCadastros}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isDark 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    Ir para Cadastros
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Dados do gerente */}
              <div className={`p-3 rounded-lg ${colors.cardBg} ${colors.border} border`}>
                <p className={`text-xs ${colors.textMuted} mb-1`}>Destinatário:</p>
                <p className={`text-sm font-medium ${colors.textPrimary}`}>{gerenteNome}</p>
                {gerenteEmail && (
                  <p className={`text-xs ${colors.textMuted} mt-0.5`}>📧 {gerenteEmail}</p>
                )}
                {gerenteTelefone && (
                  <p className={`text-xs ${colors.textMuted} mt-0.5`}>📱 {gerenteTelefone}</p>
                )}
              </div>

              {/* Motivo */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                  Motivo da chamada:
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva o motivo (ex: Aprovação necessária, problema no caixa, cliente solicitando gerente...)"
                  rows={5}
                  disabled={isSending}
                  className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none disabled:opacity-50`}
                />
                <p className={`text-xs ${colors.textMuted} mt-1`}>
                  💡 Seja específico para que o gerente saiba a urgência
                </p>
              </div>

              {/* Botões */}
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
                  disabled={isSending || !motivo.trim()}
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
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
