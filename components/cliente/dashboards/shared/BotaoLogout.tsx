'use client';

// ============================================================
// components/cliente/dashboards/shared/BotaoLogout.tsx
//
// Clientes     → logout direto (sem confirmação)
// Colaboradores, Caixas, Gerentes, Totens, etc →
//   abre modal pedindo o PIN antes de confirmar o logout.
//   Isso evita que terceiros desliguem sessões sem autorização.
//
// Multi-domínio: usa navigateContextual para funcionar tanto
// em minhai.app/ia/[slug] quanto em [slug].minhai.com.br.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2, Lock, X, ShieldAlert } from 'lucide-react';
import { useProfile, SlugProfile } from '@/hooks/useProfile';
import { navigateContextual } from '@/lib/routing-utils';

// ── Props ─────────────────────────────────────────────────────

interface BotaoLogoutProps {
  slug: string;
  theme: 'dark' | 'light';
  profile: SlugProfile;
  /** Compacto: ícone no mobile, ícone+texto no desktop */
  compact?: boolean;
}

// ── Modal de confirmação PIN ──────────────────────────────────

interface ConfirmPinModalProps {
  theme: 'dark' | 'light';
  onConfirm: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}

function ConfirmPinModal({ theme, onConfirm, onCancel }: ConfirmPinModalProps) {
  const isDark = theme === 'dark';
  const [pin, setPin]         = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  // Foca o campo ao abrir
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Enter confirma
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  async function handleConfirm() {
    if (!pin.trim()) { setError('Digite seu PIN para confirmar.'); return; }
    setLoading(true);
    setError('');
    const result = await onConfirm(pin);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'PIN incorreto.');
      setPin('');
      inputRef.current?.focus();
    }
  }

  // ── Cores ─────────────────────────────────────────────────
  const overlay  = isDark ? 'rgba(0,0,0,0.75)'         : 'rgba(0,0,0,0.5)';
  const bg       = isDark ? '#1e293b'                   : '#ffffff';
  const border   = isDark ? 'rgba(255,255,255,0.08)'    : '#e2e8f0';
  const divider  = isDark ? 'rgba(255,255,255,0.06)'    : '#f1f5f9';
  const text     = isDark ? '#f1f5f9'                   : '#0f172a';
  const muted    = isDark ? 'rgba(255,255,255,0.45)'    : '#64748b';
  const inputBg  = isDark ? '#0f172a'                   : '#f8fafc';
  const inputBdr = isDark ? 'rgba(255,255,255,0.1)'     : '#e2e8f0';
  const inputFoc = '#3b82f6';

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: overlay, backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: bg, border: `1px solid ${border}`,
        borderRadius: '1.25rem', width: '100%', maxWidth: '360px',
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
              background: 'rgba(239,68,68,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldAlert size={18} style={{ color: isDark ? '#fca5a5' : '#dc2626' }} />
            </div>
            <div>
              <p style={{ color: text, fontWeight: 700, fontSize: '0.9375rem', margin: 0 }}>
                Confirmar saída
              </p>
              <p style={{ color: muted, fontSize: '0.72rem', margin: 0 }}>
                Digite seu PIN para sair
              </p>
            </div>
          </div>
          <button onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Campo PIN */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: muted, marginBottom: '0.375rem' }}>
              PIN de acesso
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="••••••"
              style={{
                width: '100%', padding: '0.625rem 0.875rem',
                background: inputBg, border: `1.5px solid ${error ? '#ef4444' : inputBdr}`,
                borderRadius: '0.5rem', color: text,
                fontSize: '1.25rem', letterSpacing: '0.3em',
                outline: 'none', boxSizing: 'border-box',
                textAlign: 'center', fontFamily: 'monospace',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = inputFoc}
              onBlur={e => e.target.style.borderColor = error ? '#ef4444' : inputBdr}
            />
            {error && (
              <p style={{ color: isDark ? '#fca5a5' : '#dc2626', fontSize: '0.78rem', margin: '0.375rem 0 0' }}>
                {error}
              </p>
            )}
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button onClick={onCancel}
              style={{
                flex: 1, padding: '0.6875rem',
                background: 'transparent', border: `1px solid ${border}`,
                borderRadius: '0.625rem', color: muted,
                fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
              }}>
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={loading || !pin.trim()}
              style={{
                flex: 1, padding: '0.6875rem',
                background: loading || !pin.trim() ? (isDark ? 'rgba(239,68,68,0.3)' : '#fca5a5') : '#ef4444',
                border: 'none', borderRadius: '0.625rem',
                color: '#fff', fontSize: '0.875rem', fontWeight: 600,
                cursor: loading || !pin.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                transition: 'background 0.15s',
              }}>
              {loading
                ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />Verificando...</>
                : <><LogOut size={14} />Sair</>
              }
            </button>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}

// ── Componente principal ──────────────────────────────────────

export default function BotaoLogout({ slug, theme, profile, compact = false }: BotaoLogoutProps) {
  const isDark = theme === 'dark';
  const router = useRouter();
  const { logout, login } = useProfile(slug);

  const [saindo, setSaindo]           = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [mounted, setMounted]         = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Clientes saem direto, colaboradores/totens precisam do PIN
  const requiresPin = profile.tipo !== 'cliente';

  function handleClick() {
    if (requiresPin) {
      setShowPinModal(true);
    } else {
      doLogout();
    }
  }

  async function doLogout() {
    setSaindo(true);
    await logout();
    navigateContextual(router, 'ia', slug);
  }

  // Verifica o PIN antes de sair: re-autentica com o identificador + pin
  async function handlePinConfirm(pin: string): Promise<{ ok: boolean; error?: string }> {
    // Usa o identificador ou email do perfil atual para reautenticar
    const identifier = profile.identificador ?? profile.email ?? '';
    if (!identifier) {
      // Sem identificador, não tem como verificar — permite sair
      await doLogout();
      return { ok: true };
    }

    const result = await login(identifier, pin);
    if (!result.success) {
      return { ok: false, error: 'PIN incorreto. Tente novamente.' };
    }

    // PIN correto — executa logout
    setShowPinModal(false);
    await doLogout();
    return { ok: true };
  }

  // ── Estilos compartilhados ────────────────────────────────
  const btnStyle = {
    background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
    color:      isDark ? 'rgb(252,165,165)'     : 'rgb(185,28,28)',
    border:     `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'}`,
    opacity:    saindo ? 0.6 : 1,
  } as const;

  const icon = saindo
    ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
    : <LogOut  className="w-4 h-4 flex-shrink-0" />;

  // ── Versão compacta ───────────────────────────────────────
  if (compact) {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={saindo}
          title={requiresPin ? 'Sair (requer PIN)' : 'Sair da Conta'}
          className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all active:scale-95"
          style={btnStyle}
        >
          {/* PIN lock indicator no mobile */}
          {requiresPin && !saindo
            ? <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 flex-shrink-0 opacity-60" />
                <LogOut className="w-4 h-4 flex-shrink-0" />
              </span>
            : icon
          }
          <span className="hidden sm:inline text-sm font-semibold">
            {saindo ? 'Saindo...' : 'Sair da Conta'}
          </span>
        </button>

        {showPinModal && mounted && (
          <ConfirmPinModal
            theme={theme}
            onConfirm={handlePinConfirm}
            onCancel={() => setShowPinModal(false)}
          />
        )}
      </>
    );
  }

  // ── Versão completa ───────────────────────────────────────
  return (
    <>
      <button
        onClick={handleClick}
        disabled={saindo}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        style={btnStyle}
      >
        {saindo ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Saindo...</>
        ) : (
          <>
            {requiresPin && <Lock className="w-3.5 h-3.5 opacity-60" />}
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair da Conta</span>
          </>
        )}
      </button>

      {showPinModal && mounted && (
        <ConfirmPinModal
          theme={theme}
          onConfirm={handlePinConfirm}
          onCancel={() => setShowPinModal(false)}
        />
      )}
    </>
  );
}
