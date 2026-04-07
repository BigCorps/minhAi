'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, User, Mail, Phone, MapPin, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface ModalEditarPerfilProps {
  profile: {
    id: string;
    company_id: string;
    tipo: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    endereco: string | null;
  };
  onClose: () => void;
  onSalvo: (updates: any) => void;
  theme?: 'dark' | 'light';
}

export default function ModalEditarPerfil({
  profile,
  onClose,
  onSalvo,
  theme = 'dark',
}: ModalEditarPerfilProps) {
  const [form, setForm] = useState({
    nome: profile.nome || '',
    email: profile.email || '',
    telefone: profile.telefone || '',
    endereco: profile.endereco || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();
  const isDark = theme === 'dark';

  const DARK = {
    bg: 'bg-slate-900',
    cardBg: 'bg-slate-800',
    border: 'border-white/10',
    textPrimary: 'text-white',
    textMuted: 'text-white/60',
    inputBg: 'bg-slate-700',
    inputBorder: 'border-white/10',
  };

  const LIGHT = {
    bg: 'bg-white',
    cardBg: 'bg-gray-50',
    border: 'border-gray-200',
    textPrimary: 'text-gray-900',
    textMuted: 'text-gray-600',
    inputBg: 'bg-white',
    inputBorder: 'border-gray-300',
  };

  const colors = isDark ? DARK : LIGHT;

  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    };
  }, []);

  async function handleSalvar() {
    if (!form.nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const updatePayload = {
        nome: form.nome.trim(),
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        endereco: form.endereco.trim() || null,
      };

      console.log('📝 Salvando perfil:', updatePayload);

      const { error: updateError } = await supabase
        .from('company_profiles')
        .update(updatePayload)
        .eq('id', profile.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError);
        throw updateError;
      }

      console.log('✅ Perfil atualizado com sucesso!');

      // Atualiza localStorage
      const storageKey = `profile_${profile.company_id}_${profile.tipo}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const updated = {
            ...parsed,
            ...updatePayload,
          };
          localStorage.setItem(storageKey, JSON.stringify(updated));
          console.log('✅ localStorage atualizado');
        } catch (e) {
          console.error('Erro ao atualizar localStorage:', e);
        }
      }

      // IMPORTANTE: Passa exatamente os campos atualizados
      onSalvo(updatePayload);

      // Pequeno delay para garantir que o realtime propagou
      await new Promise(resolve => setTimeout(resolve, 300));

      onClose();
    } catch (err: any) {
      console.error('❌ Erro ao salvar perfil:', err);
      setError(err.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border overflow-hidden`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
              <User className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>Editar Perfil</h2>
              <p className={`text-xs ${colors.textMuted}`}>Atualize suas informações</p>
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
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${colors.textPrimary}`}>
              <User className="w-4 h-4" />
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Seu nome completo"
              disabled={isSaving}
              className={`w-full px-4 py-3 rounded-lg border ${colors.inputBorder} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all`}
            />
          </div>

          {/* Email */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${colors.textPrimary}`}>
              <Mail className="w-4 h-4" />
              E-mail
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="seu@email.com"
              disabled={isSaving}
              className={`w-full px-4 py-3 rounded-lg border ${colors.inputBorder} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all`}
            />
          </div>

          {/* Telefone */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${colors.textPrimary}`}>
              <Phone className="w-4 h-4" />
              Telefone
            </label>
            <input
              type="tel"
              value={form.telefone}
              onChange={(e) => setForm(prev => ({ ...prev, telefone: e.target.value }))}
              placeholder="(31) 99999-9999"
              disabled={isSaving}
              className={`w-full px-4 py-3 rounded-lg border ${colors.inputBorder} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all`}
            />
            <p className={`text-xs mt-1 ${colors.textMuted}`}>
              Usado para notificações e chamada de gerente via SMS
            </p>
          </div>

          {/* Endereço */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${colors.textPrimary}`}>
              <MapPin className="w-4 h-4" />
              Endereço
            </label>
            <textarea
              value={form.endereco}
              onChange={(e) => setForm(prev => ({ ...prev, endereco: e.target.value }))}
              placeholder="Rua, Número, Bairro, Cidade - UF"
              rows={3}
              disabled={isSaving}
              className={`w-full px-4 py-3 rounded-lg border ${colors.inputBorder} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 transition-all`}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
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
              onClick={handleSalvar}
              disabled={isSaving || !form.nome.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar
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
