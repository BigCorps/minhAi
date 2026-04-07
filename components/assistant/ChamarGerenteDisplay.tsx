'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Send, Loader2, AlertCircle, Check, X } from 'lucide-react';
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

  // ✅ Dados do gerente — lidos das colunas diretas (mesmo padrão do CardMinhaConta / AbaColaboradores)
  const [gerenteNome,     setGerenteNome]     = useState('Gerente');
  const [gerenteEmail,    setGerenteEmail]    = useState('');
  const [gerenteTelefone, setGerenteTelefone] = useState('');

  // Canais de notificação salvos em company_function_settings
  const [notificarEmail, setNotificarEmail] = useState(true);
  const [notificarSms,   setNotificarSms]   = useState(false);

  const [mounted, setMounted] = useState(false);

  const supabase = createClient();
  const isDark = theme === 'dark';

  const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // ── Tema ──────────────────────────────────────────────────────────────────
  const DARK = {
    bg:          'bg-slate-900',
    cardBg:      'bg-slate-800',
    border:      'border-white/10',
    textPrimary: 'text-white',
    textMuted:   'text-white/60',
    inputBg:     'bg-slate-700',
  };
  const LIGHT = {
    bg:          'bg-white',
    cardBg:      'bg-gray-50',
    border:      'border-gray-200',
    textPrimary: 'text-gray-900',
    textMuted:   'text-gray-600',
    inputBg:     'bg-white',
  };
  const colors = isDark ? DARK : LIGHT;

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    };
  }, []);

  // ── Busca configurações + dados do gerente ────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        console.log('🔍 ChamarGerente — buscando dados para company:', companyId);

        // 1. Configurações de canal (company_function_settings)
        const { data: funcSettings } = await supabase
          .from('company_function_settings')
          .select('config')
          .eq('company_id', companyId)
          .eq('function_key', 'chamar_gerente')
          .maybeSingle();

        const config = funcSettings?.config || {};
        setNotificarEmail(config.notificar_email ?? true);
        setNotificarSms(config.notificar_sms ?? false);
        console.log('⚙️ Configurações de canal:', config);

        // 2. Dados do gerente — colunas diretas: nome, email, telefone
        const { data: perfil, error: perfilError } = await supabase
          .from('company_profiles')
          .select('nome, email, telefone')   // ✅ colunas diretas, igual ao AbaColaboradores
          .eq('company_id', companyId)
          .eq('tipo', 'gerente')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (perfilError) {
          console.error('❌ Erro ao buscar perfil do gerente:', perfilError);
        }

        if (perfil) {
          console.log('✅ Gerente encontrado:', perfil);

          setGerenteNome(perfil.nome || 'Gerente');

          // ✅ email — coluna direta; fallback para email_contato da empresa
          if (perfil.email) {
            setGerenteEmail(perfil.email);
          } else {
            const { data: company } = await supabase
              .from('companies')
              .select('email_contato')
              .eq('id', companyId)
              .single();
            if (company?.email_contato) {
              console.log('📧 Usando email_contato da empresa:', company.email_contato);
              setGerenteEmail(company.email_contato);
            } else {
              console.warn('⚠️ Gerente sem email e empresa sem email_contato');
              setGerenteEmail('');
            }
          }

          // ✅ telefone — coluna direta (mesmo padrão de getTelefone() no arquivo de cadastros)
          setGerenteTelefone(perfil.telefone ?? '');

        } else {
          // Gerente não cadastrado → fallback para email_contato da empresa
          console.log('⚠️ Nenhum gerente ativo encontrado, buscando email_contato da empresa...');

          const { data: company } = await supabase
            .from('companies')
            .select('email_contato, name')
            .eq('id', companyId)
            .single();

          if (company?.email_contato) {
            console.log('📧 Usando email_contato da empresa:', company.email_contato);
            setGerenteEmail(company.email_contato);
            setGerenteNome(company.name || 'Gestão');
          } else {
            console.warn('❌ Nenhum email configurado');
            showToast('Email do gerente não configurado', 'error');
          }

          // Sem gerente cadastrado → telefone vazio
          setGerenteTelefone('');
        }
      } catch (error) {
        console.error('❌ Erro inesperado ao buscar dados do gerente:', error);
        showToast('Erro ao carregar dados do gerente', 'error');
      }
    }

    fetchData();

    // ── Realtime: atualiza quando o gerente for alterado ──────────────────
    const channel = supabase
      .channel(`chamar-gerente-display-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_profiles',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          // UPDATE: gerente ativo atualizado
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            if (updated.tipo === 'gerente' && updated.is_active) {
              console.log('🔄 Gerente atualizado via realtime:', updated);
              setGerenteNome(updated.nome     || 'Gerente');
              setGerenteEmail(updated.email    ?? '');      // ✅ coluna direta
              setGerenteTelefone(updated.telefone ?? '');   // ✅ coluna direta
            }
          }

          // DELETE ou desativação: limpa dados do gerente
          if (
            payload.eventType === 'DELETE' ||
            (payload.eventType === 'UPDATE' && !(payload.new as any).is_active && (payload.new as any).tipo === 'gerente')
          ) {
            console.log('🗑️ Gerente removido/inativado via realtime');
            setGerenteNome('Gerente');
            setGerenteEmail('');
            setGerenteTelefone('');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  // ── Toast auto-dismiss ────────────────────────────────────────────────────
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
  }

  // ── Envio ─────────────────────────────────────────────────────────────────
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
      const promises: Promise<any>[] = [];

      if (notificarEmail && gerenteEmail) {
        console.log('📧 Enviando email para:', gerenteEmail);
        promises.push(
          fetch(`${SUPABASE_URL}/functions/v1/enviar-email-google`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              to:      gerenteEmail,
              subject: '🔔 Chamada de Gerente - minhAi',
              body:    `Olá ${gerenteNome},\n\nVocê foi chamado(a) por um colaborador.\n\n**Motivo:**\n${motivo}\n\n---\nEnviado via minhAi`,
            }),
          })
        );
      }

      if (notificarSms && gerenteTelefone) {
        console.log('📱 Enviando SMS para:', gerenteTelefone);
        promises.push(
          fetch(`${SUPABASE_URL}/functions/v1/send-sms-gerente`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              telefone: gerenteTelefone,
              mensagem: `🔔 CHAMADA DE GERENTE\n\nMotivo: ${motivo}\n\n- minhAi`,
            }),
          })
        );
      }

      await Promise.all(promises);

      const canais = [
        notificarEmail && gerenteEmail    ? 'email' : null,
        notificarSms   && gerenteTelefone ? 'SMS'   : null,
      ].filter(Boolean).join(' e ');

      showToast(`Gerente notificado via ${canais}!`, 'success');

      if (playText) {
        await playText('Gerente notificado com sucesso!');
      }

      setTimeout(() => { onClose(); }, 1500);

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

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[400] px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error'
            ? <AlertCircle className="w-5 h-5" />
            : <Check className="w-5 h-5" />
          }
          {toast.message}
        </div>
      )}

      <div className={`w-full max-w-md rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border overflow-hidden`}>

        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-yellow-900/30' : 'bg-yellow-100'}`}>
              <Bell className={`w-6 h-6 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>Chamar Gerente</h2>
              <p className={`text-xs ${colors.textMuted}`}>
                {[
                  notificarEmail ? 'Email' : null,
                  notificarSms   ? 'SMS'   : null,
                ].filter(Boolean).join(' + ') || 'Nenhum canal configurado'}
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
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Card do destinatário */}
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
            {/* Aviso se algum canal está ativo mas sem dado */}
            {notificarEmail && !gerenteEmail && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Email não cadastrado
              </p>
            )}
            {notificarSms && !gerenteTelefone && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Telefone não cadastrado
              </p>
            )}
          </div>

          {/* Textarea do motivo */}
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
              className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none disabled:opacity-50 transition-all`}
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
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
