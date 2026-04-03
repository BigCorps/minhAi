'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Check, Loader2, AlertCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface TrocarTurnoDisplayProps {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

export default function TrocarTurnoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: TrocarTurnoDisplayProps) {
  const { companyId } = data;
  
  const [observacoes, setObservacoes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [turnoAtual, setTurnoAtual] = useState<{
    id: string;
    inicio: string;
    profile_nome: string;
  } | null>(null);
  const [loadingTurno, setLoadingTurno] = useState(true);

  const supabase = createClient();
  const isDark = theme === 'dark';

  // Paletas de cores
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

  // Buscar turno ativo atual
  useEffect(() => {
    async function fetchTurnoAtual() {
      setLoadingTurno(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Busca perfil ativo do usuário
        const { data: session } = await supabase
          .from('profile_sessions')
          .select('profile_id, company_profiles(nome)')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .maybeSingle();

        if (!session?.profile_id) return;

        // Busca turno ativo do perfil
        const { data: turno } = await supabase
          .from('turnos')
          .select('id, inicio, company_profiles(nome)')
          .eq('company_id', companyId)
          .eq('profile_id', session.profile_id)
          .eq('status', 'ativo')
          .maybeSingle();

        if (turno) {
          setTurnoAtual({
            id: turno.id,
            inicio: turno.inicio,
            profile_nome: (turno as any).company_profiles?.nome || 'Colaborador',
          });
        }

      } catch (error) {
        console.error('Erro ao buscar turno atual:', error);
      } finally {
        setLoadingTurno(false);
      }
    }

    fetchTurnoAtual();
  }, [companyId]);

  // Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
  }

  async function handleTrocarTurno() {
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Busca perfil ativo do usuário
      const { data: session } = await supabase
        .from('profile_sessions')
        .select('profile_id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      const profileId = session?.profile_id;
      if (!profileId) throw new Error('Perfil não encontrado');

      const agora = new Date().toISOString();

      // 1. Fecha turno anterior (se existe)
      if (turnoAtual) {
        const { error: updateError } = await supabase
          .from('turnos')
          .update({
            fim: agora,
            status: 'fechado',
            observacoes: observacoes.trim() || null,
          })
          .eq('id', turnoAtual.id);

        if (updateError) throw updateError;
      }

      // 2. Cria novo turno
      const { error: insertError } = await supabase
        .from('turnos')
        .insert({
          company_id: companyId,
          profile_id: profileId,
          inicio: agora,
          status: 'ativo',
          observacoes: observacoes.trim() || null,
        });

      if (insertError) throw insertError;

      showToast('Turno trocado com sucesso!', 'success');
      
      if (playText) {
        await playText('Turno trocado com sucesso! Bom trabalho!');
      }

      // Fecha após 1.5s
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Erro ao trocar turno:', error);
      showToast('Erro ao trocar turno', 'error');
      
      if (playText) {
        await playText('Erro ao trocar turno. Tente novamente.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  function formatDuration(inicio: string): string {
    const start = new Date(inicio);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}min`;
    }
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Toast */}
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

      {/* Modal */}
      <div className={`w-full max-w-md rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border overflow-hidden`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
              <RefreshCw className={`w-6 h-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>Trocar Turno</h2>
              <p className={`text-xs ${colors.textMuted}`}>Registrar passagem de turno</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
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

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* Turno Atual */}
          {loadingTurno ? (
            <div className={`p-4 rounded-lg ${colors.cardBg} flex items-center justify-center`}>
              <Loader2 className={`w-5 h-5 animate-spin ${colors.textMuted}`} />
              <span className={`ml-2 text-sm ${colors.textMuted}`}>Carregando turno...</span>
            </div>
          ) : turnoAtual ? (
            <div className={`p-4 rounded-lg ${isDark ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'} border`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                <p className={`text-sm font-semibold ${isDark ? 'text-orange-200' : 'text-orange-800'}`}>
                  Turno Atual
                </p>
              </div>
              <div className="space-y-1">
                <p className={`text-xs ${isDark ? 'text-orange-300/80' : 'text-orange-700/80'}`}>
                  <strong>Colaborador:</strong> {turnoAtual.profile_nome}
                </p>
                <p className={`text-xs ${isDark ? 'text-orange-300/80' : 'text-orange-700/80'}`}>
                  <strong>Início:</strong> {formatTime(turnoAtual.inicio)}
                </p>
                <p className={`text-xs ${isDark ? 'text-orange-300/80' : 'text-orange-700/80'}`}>
                  <strong>Duração:</strong> {formatDuration(turnoAtual.inicio)}
                </p>
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
              <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                💡 Nenhum turno ativo. Um novo turno será iniciado.
              </p>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              Observações do turno {turnoAtual ? 'anterior' : ''}:
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Descreva ocorrências, pendências, informações importantes..."
              rows={5}
              disabled={isSaving}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none disabled:opacity-50`}
            />
            <p className={`text-xs ${colors.textMuted} mt-1`}>
              {observacoes.length}/500 caracteres
            </p>
          </div>

          {/* Info */}
          <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-gray-100'} border ${colors.border}`}>
            <p className={`text-xs ${colors.textMuted}`}>
              {turnoAtual 
                ? '⚠️ Ao trocar o turno, o turno atual será fechado e um novo turno será iniciado automaticamente no seu nome.'
                : '✅ Um novo turno será iniciado no seu nome.'}
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition disabled:opacity-50 ${
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleTrocarTurno}
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Trocando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  {turnoAtual ? 'Trocar Turno' : 'Iniciar Turno'}
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
