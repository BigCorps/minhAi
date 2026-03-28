'use client';

// ============================================================
// components/assistant/LoginClienteDisplay.tsx
//
// Modal de login/cadastro de clientes no slug.
// Abre como função via voz ou carrossel.
//
// Comportamento:
// - Se o cliente já está logado → mostra perfil + botão sair
// - Se não logado → mostra formulário dinâmico baseado em
//   registration_configs da empresa
// - Email ou telefone servem como identificador de retorno
// - Após login/cadastro → fecha o modal e emite eai:profileLogin
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProfile } from '@/hooks/useProfile';

interface LoginClienteDisplayProps {
  data: {
    companyId: string;
    slug: string;
    theme?: 'dark' | 'light';
  };
  onClose: () => void;
  theme: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

// Campos suportados pela registration_configs
const FIELD_LABELS: Record<string, string> = {
  nome: 'Nome completo',
  email: 'E-mail',
  telefone: 'Telefone',
  senha: 'Senha',
  cpf: 'CPF',
  endereco: 'Endereço',
  empresa: 'Empresa',
  cargo: 'Cargo',
  observacoes: 'Observações',
};

const FIELD_TYPES: Record<string, string> = {
  email: 'email',
  senha: 'password',
  telefone: 'tel',
  cpf: 'text',
};

const DARK = {
  overlay: 'rgba(0,0,0,0.85)',
  bg: '#1e293b',
  border: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.5)',
  input: '#0f172a',
  inputBorder: 'rgba(255,255,255,0.1)',
  inputBorderFocus: '#3b82f6',
  btnPrimary: '#3b82f6',
  btnPrimaryHover: '#2563eb',
  btnSecondary: 'rgba(255,255,255,0.05)',
  btnSecondaryHover: 'rgba(255,255,255,0.1)',
  divider: 'rgba(255,255,255,0.06)',
  success: 'rgba(34,197,94,0.15)',
  successBorder: 'rgba(34,197,94,0.3)',
  successText: '#86efac',
  error: 'rgba(239,68,68,0.15)',
  errorBorder: 'rgba(239,68,68,0.3)',
  errorText: '#fca5a5',
};

const LIGHT = {
  overlay: 'rgba(0,0,0,0.5)',
  bg: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  input: '#f8fafc',
  inputBorder: '#e2e8f0',
  inputBorderFocus: '#3b82f6',
  btnPrimary: '#3b82f6',
  btnPrimaryHover: '#2563eb',
  btnSecondary: '#f1f5f9',
  btnSecondaryHover: '#e2e8f0',
  divider: '#f1f5f9',
  success: '#f0fdf4',
  successBorder: '#bbf7d0',
  successText: '#15803d',
  error: '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#dc2626',
};

export default function LoginClienteDisplay({
  data,
  onClose,
  theme,
  playText,
}: LoginClienteDisplayProps) {
  const C = theme === 'dark' ? DARK : LIGHT;
  const { profile, loading, login, logout, register } = useProfile(data.slug);

  const [mode, setMode] = useState<'loading' | 'logado' | 'login' | 'cadastro'>('loading');
  const [configFields, setConfigFields] = useState<string[]>(['nome', 'email']);
  // CHANGE 2: Added customLabels state
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Carregar registration_configs da empresa
  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));

    async function loadConfig() {
      try {
        // CHANGE 4: Added custom_fields to select query
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/registration_configs?company_id=eq.${data.companyId}&select=fields,custom_fields`,
          {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            },
          }
        );
        const rows = await res.json();
        console.log('registration_configs rows:', rows);

        // CHANGES 1 & 3: Updated condition and added customLabels population
        if (rows?.[0]) {
          const rawFields = rows[0].fields;
          console.log('rawFields tipo:', typeof rawFields, 'valor:', rawFields);
          const parsed = typeof rawFields === 'string'
            ? JSON.parse(rawFields)
            : rawFields;
          setConfigFields(Array.isArray(parsed) ? parsed : ['nome', 'email']);

          // Carregar labels dos campos personalizados
          const customFields: { key: string; label: string }[] = rows[0].custom_fields ?? [];
          if (customFields.length > 0) {
            setCustomLabels(
              customFields.reduce((acc, cf) => {
                acc[cf.key] = cf.label || cf.key;
                return acc;
              }, {} as Record<string, string>)
            );
          }
        }
      } catch (err) {
        console.error('Erro ao carregar config de cadastro:', err);
      }
    }

    loadConfig();

    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    };
  }, []);

  // Resolver modo baseado no estado do perfil
  useEffect(() => {
    if (loading) return;
    setMode(profile ? 'logado' : 'login');
  }, [profile, loading]);

  const hasIdentifier = configFields.includes('email') || configFields.includes('telefone');

  const handleSubmitLogin = async () => {
    const identifier = formValues.email || formValues.telefone;
    if (!identifier) {
      setError('Informe seu e-mail ou telefone para entrar.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await login(identifier, formValues.senha);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Não encontramos sua conta. Que tal se cadastrar?');
    } else {
      playText?.(`Bem-vindo de volta, ${profile?.nome || ''}!`).catch(() => {});
      onClose();
    }
  };

  const handleSubmitCadastro = async () => {
    if (!formValues.nome?.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await register(formValues);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Erro ao criar conta. Tente novamente.');
    } else {
      playText?.(`Conta criada! Bem-vindo, ${formValues.nome}!`).catch(() => {});
      onClose();
    }
  };

  const handleLogout = async () => {
    await logout();
    playText?.('Você saiu da sua conta.').catch(() => {});
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: C.overlay,
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: '1.25rem',
        width: '100%',
        maxWidth: '420px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.5rem 1.5rem 1rem',
          borderBottom: `1px solid ${C.divider}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: mode === 'logado' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {mode === 'logado' ? (
                <svg width="20" height="20" fill="none" stroke={C.successText} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              )}
            </div>
            <div>
              <p style={{ color: C.text, fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                {mode === 'logado' ? 'Minha Conta' : mode === 'cadastro' ? 'Criar Conta' : 'Entrar'}
              </p>
              <p style={{ color: C.textMuted, fontSize: '0.75rem', margin: 0 }}>
                {mode === 'logado' ? `Olá, ${profile?.nome}!` : 'Acesse sua conta de cliente'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.textMuted, padding: '0.25rem',
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>

          {/* Loading */}
          {mode === 'loading' && (
            <div style={{ textAlign: 'center', padding: '2rem', color: C.textMuted }}>
              <div style={{
                width: 32, height: 32, border: `3px solid ${C.inputBorder}`,
                borderTopColor: '#3b82f6', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
              }} />
              Verificando...
            </div>
          )}

          {/* Perfil logado */}
          {mode === 'logado' && profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: C.success, border: `1px solid ${C.successBorder}`,
                borderRadius: '0.75rem', padding: '1rem',
              }}>
                <p style={{ color: C.successText, fontSize: '0.875rem', margin: 0, fontWeight: 600 }}>
                  ✓ Você está logado
                </p>
                {profile.email && (
                  <p style={{ color: C.textMuted, fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                    {profile.email}
                  </p>
                )}
                {profile.identificador && (
                  <p style={{ color: C.textMuted, fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                    {profile.identificador}
                  </p>
                )}
              </div>

              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '0.75rem',
                  background: C.btnSecondary, border: `1px solid ${C.border}`,
                  borderRadius: '0.625rem', color: C.textMuted,
                  fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                }}
              >
                Sair da conta
              </button>
            </div>
          )}

          {/* Login */}
          {mode === 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {/* Campos de identificação */}
              {configFields.includes('email') && (
                <FieldInput
                  label="E-mail" type="email" value={formValues.email || ''}
                  onChange={(v) => setFormValues(p => ({ ...p, email: v }))}
                  C={C}
                />
              )}
              {!configFields.includes('email') && configFields.includes('telefone') && (
                <FieldInput
                  label="Telefone" type="tel" value={formValues.telefone || ''}
                  onChange={(v) => setFormValues(p => ({ ...p, telefone: v }))}
                  C={C}
                />
              )}
              {configFields.includes('senha') && (
                <FieldInput
                  label="Senha" type="password" value={formValues.senha || ''}
                  onChange={(v) => setFormValues(p => ({ ...p, senha: v }))}
                  C={C}
                />
              )}

              {error && <ErrorMsg msg={error} C={C} />}

              <button
                onClick={handleSubmitLogin}
                disabled={submitting}
                style={{
                  width: '100%', padding: '0.75rem',
                  background: submitting ? C.inputBorder : C.btnPrimary,
                  border: 'none', borderRadius: '0.625rem',
                  color: '#fff', fontSize: '0.875rem', fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Entrando...' : 'Entrar'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <span style={{ color: C.textMuted, fontSize: '0.8rem' }}>
                  Não tem conta?{' '}
                </span>
                <button
                  onClick={() => { setMode('cadastro'); setError(''); setFormValues({}); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600,
                  }}
                >
                  Criar conta
                </button>
              </div>
            </div>
          )}

          {/* Cadastro */}
          {mode === 'cadastro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {configFields.map((field) => (
                <FieldInput
                  key={field}
                  // CHANGE 5: Added customLabels fallback for field labels
                  label={FIELD_LABELS[field] || customLabels[field] || field}
                  type={FIELD_TYPES[field] || 'text'}
                  value={formValues[field] || ''}
                  onChange={(v) => setFormValues(p => ({ ...p, [field]: v }))}
                  C={C}
                />
              ))}

              {error && <ErrorMsg msg={error} C={C} />}

              <button
                onClick={handleSubmitCadastro}
                disabled={submitting}
                style={{
                  width: '100%', padding: '0.75rem',
                  background: submitting ? C.inputBorder : C.btnPrimary,
                  border: 'none', borderRadius: '0.625rem',
                  color: '#fff', fontSize: '0.875rem', fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Criando conta...' : 'Criar conta'}
              </button>

              {hasIdentifier && (
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: C.textMuted, fontSize: '0.8rem' }}>
                    Já tem conta?{' '}
                  </span>
                  <button
                    onClick={() => { setMode('login'); setError(''); setFormValues({}); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600,
                    }}
                  >
                    Entrar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
}

// ── Sub-componentes ──────────────────────────────────────────

function FieldInput({
  label, type, value, onChange, C,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  C: typeof DARK;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.8rem', fontWeight: 500,
        color: C.textMuted, marginBottom: '0.375rem',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '0.625rem 0.875rem',
          background: C.input,
          border: `1.5px solid ${focused ? C.inputBorderFocus : C.inputBorder}`,
          borderRadius: '0.5rem', color: C.text,
          fontSize: '0.875rem', outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
      />
    </div>
  );
}

function ErrorMsg({ msg, C }: { msg: string; C: typeof DARK }) {
  return (
    <div style={{
      background: C.error, border: `1px solid ${C.errorBorder}`,
      borderRadius: '0.5rem', padding: '0.625rem 0.875rem',
    }}>
      <p style={{ color: C.errorText, fontSize: '0.8rem', margin: 0 }}>{msg}</p>
    </div>
  );
}
