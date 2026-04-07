'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Send, Loader2, AlertCircle, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

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
  const [gerenteTelefone, setGerenteTelefone] = useState<string>('');
  const [gerenteNome, setGerenteNome] = useState<string>('Gerente');
  const [notificarEmail, setNotificarEmail] = useState(true);
  const [notificarSms, setNotificarSms] = useState(false);
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();
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

  // ✅ Buscar configurações + dados do gerente
  useEffect(() => {
    async function fetchData() {
      try {
        console.log('🔍 Buscando dados para company:', companyId);
        
        // 1. Busca configurações salvas em company_function_settings
        const { data: funcSettings } = await supabase
          .from('company_function_settings')
          .select('config')
          .eq('company_id', companyId)
          .eq('function_key', 'chamar_gerente')
          .maybeSingle();

        const config = funcSettings?.config || {};
        setNotificarEmail(config.notificar_email ?? true);
        setNotificarSms(config.notificar_sms ?? false);
        
        console.log('⚙️ Configurações:', config);

        // 2. Busca dados do gerente em company_profiles
        const { data: perfil, error: perfilError } = await supabase
          .from('company_profiles')
          .select('nome, email, telefone')
          .eq('company_id', companyId)
          .eq('tipo', 'gerente')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (perfilError) {
          console.error('❌ Erro ao buscar perfil:', perfilError);
        }

        if (perfil) {
          console.log('✅ Gerente encontrado:', perfil);
          setGerenteNome(perfil.nome || 'Gerente');
          setGerenteEmail(perfil.email || '');
          setGerenteTelefone(perfil.telefone || '');
          
          // Se gerente não tem email, busca email_contato da empresa
          if (!perfil.email) {
            const { data: company } = await supabase
              .from('companies')
              .select('email_contato')
              .eq('id', companyId)
              .single();
              
            if (company?.email_contato) {
              console.log('✅ Usando email_contato da empresa:', company.email_contato);
              setGerenteEmail(company.email_contato);
            }
          }
        } else {
          console.log('⚠️ Gerente não encontrado, buscando email_contato...');
          
          // Fallback: usa email_contato da empresa
          const { data: company } = await supabase
            .from('companies')
            .select('email_contato, name')
            .eq('id', companyId)
            .single();
            
          if (company?.email_contato) {
            console.log('✅ Usando email_contato da empresa:', company.email_contato);
            setGerenteEmail(company.email_contato);
            setGerenteNome(company.name || 'Gestão');
          } else {
            console.log('❌ Nenhum email configurado');
            showToast('Email do gerente não configurado', 'error');
          }
        }
      } catch (error) {
        console.error('❌ Erro ao buscar dados:', error);
        showToast('Erro ao carregar dados do gerente', 'error');
      }
    }
    
    fetchData();

    // REALTIME: atualiza quando gerente mudar
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
          console.log('🔄 Gerente atualizado via realtime:', updated);
          setGerenteNome(updated.nome || 'Gerente');
          setGerenteEmail(updated.email || '');
          setGerenteTelefone(updated.telefone || '');
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

    if (notificarEmail && !gerenteEmail) {
      showToast('Email do gerente não configurado', 'error');
      return;
    }

    if (notificarSms && !gerenteTelefone) {
      showToast('Telefone do gerente não configurado', 'error');
      return;
    }

    if (!notificarEmail && !notificarSms) {
      showToast('Configure ao menos um canal de notificação', 'error');
      return;
    }

    setIsSending(true);

    try {
      const promises = [];

      // ✅ Envia EMAIL se configurado
      if (notificarEmail && gerenteEmail) {
        console.log('📧 Enviando email para:', gerenteEmail);
        
        const emailPromise = fetch(`${SUPABASE_URL}/functions/v1/enviar-email-google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: gerenteEmail,
            subject: '🔔 Chamada de Gerente - minhAi',
            body: `Olá ${gerenteNome},\n\nVocê foi chamado(a) por um colaborador.\n\n**Motivo:**\n${motivo}\n\n---\nEnviado via minhAi`,
          }),
        });
        
        promises.push(emailPromise);
      }

      // ✅ Envia SMS se configurado
      if (notificarSms && gerenteTelefone) {
        console.log('📱 Enviando SMS para:', gerenteTelefone);
        
        const smsPromise = fetch(`${SUPABASE_URL}/functions/v1/send-sms-gerente`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            telefone: gerenteTelefone,
            mensagem: `🔔 CHAMADA DE GERENTE\n\nMotivo: ${motivo}\n\n- minhAi`,
          }),
        });
        
        promises.push(smsPromise);
      }

      await Promise.all(promises);

      const canais = [
        notificarEmail && gerenteEmail ? 'email' : null,
        notificarSms && gerenteTelefone ? 'SMS' : null,
      ].filter(Boolean).join(' e ');

      showToast(`Gerente notificado via ${canais}!`, 'success');
      
      if (playText) {
        await playText('Gerente notificado com sucesso!');
      }

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error);
      showToast('Erro ao enviar notificação', 'error');
      
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
                ].filter(Boolean).join(' + ')}
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
            {notificarEmail && gerenteEmail && (
              <p className={`text-xs ${colors.textMuted} mt-0.5 flex items-center gap-1`}>
                <span>📧</span>
                <span>{gerenteEmail}</span>
              </p>
            )}
            {notificarSms && gerenteTelefone && (
              <p className={`text-xs ${colors.textMuted} mt-0.5 flex items-center gap-1`}>
                <span>📱</span>
                <span>{gerenteTelefone}</span>
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
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
