'use client';

// ============================================================
// components/cliente/dashboards/shared/ModalEditarPerfil.tsx
// ============================================================

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, User, Phone, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { SlugProfile } from '@/hooks/useProfile';

interface ModalEditarPerfilProps {
  profile: SlugProfile;
  slug: string;
  theme: 'dark' | 'light';
  onClose: () => void;
  onSalvo: (updated: Partial<SlugProfile>) => void;
}

function getCampos(tipo: string): Array<'nome' | 'telefone' | 'endereco'> {
  if (tipo === 'totem')   return ['nome'];
  if (tipo === 'cliente') return ['nome', 'telefone', 'endereco'];
  return ['nome', 'telefone'];
}

export default function ModalEditarPerfil({
  profile, slug, theme, onClose, onSalvo,
}: ModalEditarPerfilProps) {
  const isDark  = theme === 'dark';
  const campos  = getCampos(profile.tipo);
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState({
    nome:     profile.nome     ?? '',
    telefone: profile.telefone ?? '',  // ← CORRIGIDO: campo direto
    endereco: profile.endereco ?? '',
  });

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ── Cores ─────────────────────────────────────────────────
  const overlay  = isDark ? 'rgba(0,0,0,0.80)'          : 'rgba(0,0,0,0.5)';
  const bg       = isDark ? '#1e293b'                    : '#ffffff';
  const border   = isDark ? 'rgba(255,255,255,0.08)'     : '#e2e8f0';
  const divider  = isDark ? 'rgba(255,255,255,0.06)'     : '#f1f5f9';
  const text     = isDark ? '#f1f5f9'                    : '#0f172a';
  const muted    = isDark ? 'rgba(255,255,255,0.45)'     : '#64748b';
  const inputBg  = isDark ? '#0f172a'                    : '#f8fafc';
  const inputBdr = isDark ? 'rgba(255,255,255,0.1)'      : '#e2e8f0';
  const labelC   = isDark ? 'rgba(255,255,255,0.5)'      : '#64748b';

  async function handleSalvar() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return; }

    setSaving(true);
    setError('');

    try {
      const supabase = createClient();

      // ← CORRIGIDO: usa colunas diretas
      const updates: Record<string, any> = {};

      if (campos.includes('nome')) {
        updates.nome = form.nome.trim();
      }

      if (campos.includes('endereco')) {
        updates.endereco = form.endereco.trim() || null;
      }

      if (campos.includes('telefone')) {
        updates.telefone = form.telefone.trim() || null;  // ← CORRIGIDO
      }

      const { error: dbError } = await supabase
        .from('company_profiles')
        .update(updates)
        .eq('id', profile.id);

      if (dbError) throw dbError;

      // Atualiza localStorage
      const storageKey = `profile_session_${slug}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const updatedProfile = {
            ...parsed,
            ...updates,
          };
          localStorage.setItem(storageKey, JSON.stringify(updatedProfile));
        } catch {}
      }

      setSuccess(true);

      // ← CORRIGIDO: passa objeto correto
      onSalvo(updates);

      setTimeout(() => onClose(), 1200);

    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: overlay, backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div style={{
        background: bg, border: `1px solid ${border}`,
        borderRadius: '1.25rem', width: '100%', maxWidth: '420px',
        overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem 1rem',
          borderBottom: `1px solid ${divider}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(168,85,247,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={18} style={{ color: isDark ? '#d8b4fe' : '#7c3aed' }} />
            </div>
            <div>
              <p style={{ color: text, fontWeight: 700, fontSize: '0.9375rem', margin: 0 }}>
                Editar informações
              </p>
              <p style={{ color: muted, fontSize: '0.72rem', margin: 0 }}>
                {profile.nome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: muted, padding: '0.25rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Aviso campos bloqueados */}
          <div style={{
            padding: '0.625rem 0.875rem',
            background: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff',
            border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#bfdbfe'}`,
            borderRadius: '0.5rem',
          }}>
            <p style={{ color: isDark ? '#93c5fd' : '#1d4ed8', fontSize: '0.75rem', margin: 0 }}>
              E-mail, identificador e senha só podem ser alterados pelo administrador.
            </p>
          </div>

          {/* Nome */}
          {campos.includes('nome') && (
            <InputField
              label="Nome de exibição"
              icon={<User size={15} />}
              value={form.nome}
              onChange={v => setForm(p => ({ ...p, nome: v }))}
              placeholder="Seu nome completo"
              disabled={saving || success}
              colors={{ text, muted: labelC, inputBg, inputBdr, border }}
            />
          )}

          {/* Telefone */}
          {campos.includes('telefone') && (
            <InputField
              label="Telefone de contato"
              icon={<Phone size={15} />}
              value={form.telefone}
              onChange={v => setForm(p => ({ ...p, telefone: v }))}
              placeholder="(11) 99999-9999"
              type="tel"
              disabled={saving || success}
              colors={{ text, muted: labelC, inputBg, inputBdr, border }}
            />
          )}

          {/* Endereço */}
          {campos.includes('endereco') && (
            <InputField
              label="Endereço"
              icon={<MapPin size={15} />}
              value={form.endereco}
              onChange={v => setForm(p => ({ ...p, endereco: v }))}
              placeholder="Rua, número, bairro, cidade"
              disabled={saving || success}
              colors={{ text, muted: labelC, inputBg, inputBdr, border }}
            />
          )}

          {/* Feedback */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 0.875rem',
              background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
              border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : '#fecaca'}`,
              borderRadius: '0.5rem',
            }}>
              <AlertCircle size={14} style={{ color: isDark ? '#fca5a5' : '#dc2626', flexShrink: 0 }} />
              <p style={{ color: isDark ? '#fca5a5' : '#dc2626', fontSize: '0.8rem', margin: 0 }}>{error}</p>
            </div>
          )}

          {success && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 0.875rem',
              background: isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4',
              border: `1px solid ${isDark ? 'rgba(34,197,94,0.25)' : '#bbf7d0'}`,
              borderRadius: '0.5rem',
            }}>
              <CheckCircle2 size={14} style={{ color: isDark ? '#86efac' : '#15803d', flexShrink: 0 }} />
              <p style={{ color: isDark ? '#86efac' : '#15803d', fontSize: '0.8rem', margin: 0 }}>
                Informações salvas com sucesso!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: `1px solid ${divider}`,
          display: 'flex', gap: '0.625rem', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'transparent', border: `1px solid ${border}`,
              borderRadius: '0.625rem', color: muted,
              fontSize: '0.875rem', fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={saving || success}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.625rem 1.25rem',
              background: success ? (isDark ? 'rgba(34,197,94,0.2)' : '#dcfce7')
                        : saving  ? (isDark ? 'rgba(99,102,241,0.4)' : '#a5b4fc')
                        : '#6366f1',
              border: 'none', borderRadius: '0.625rem',
              color: success ? (isDark ? '#86efac' : '#15803d') : '#fff',
              fontSize: '0.875rem', fontWeight: 600,
              cursor: saving || success ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {saving  ? <><Loader2 size={14} className="animate-spin" />Salvando...</>
           : success ? <><CheckCircle2 size={14} />Salvo!</>
           :           <><Save size={14} />Salvar</>}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

// ── Sub-componente: campo de input ────────────────────────────

function InputField({
  label, icon, value, onChange, placeholder, type = 'text', disabled, colors,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  colors: { text: string; muted: string; inputBg: string; inputBdr: string; border: string };
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: '0.3rem',
        fontSize: '0.8rem', fontWeight: 500,
        color: colors.muted, marginBottom: '0.375rem',
      }}>
        {icon}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '0.625rem 0.875rem',
          background: disabled ? (colors.inputBg + '80') : colors.inputBg,
          border: `1.5px solid ${focused ? '#6366f1' : colors.inputBdr}`,
          borderRadius: '0.5rem', color: colors.text,
          fontSize: '0.875rem', outline: 'none',
          boxSizing: 'border-box', transition: 'border-color 0.15s',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
    </div>
  );
}
