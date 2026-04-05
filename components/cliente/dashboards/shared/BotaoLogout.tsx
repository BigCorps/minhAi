'use client';

// ============================================================
// components/cliente/dashboards/shared/BotaoLogout.tsx
//
// Multi-domínio: usa navigateContextual (mesmo que SlugHeader)
// para funcionar tanto em minhai.app/ia/[slug] quanto em
// [slug].minhai.com.br onde o middleware reescreve as rotas.
//
// Layout:
//   Mobile  → apenas ícone (compacto, ao lado do título)
//   Desktop → ícone + texto
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { navigateContextual } from '@/lib/routing-utils';

interface BotaoLogoutProps {
  slug: string;
  theme: 'dark' | 'light';
  /** Versão compacta: apenas ícone, sem texto. Para uso inline no header do dashboard. */
  compact?: boolean;
}

export default function BotaoLogout({ slug, theme, compact = false }: BotaoLogoutProps) {
  const isDark = theme === 'dark';
  const router = useRouter();
  const { logout } = useProfile(slug);
  const [saindo, setSaindo] = useState(false);

  async function handleLogout() {
    setSaindo(true);
    await logout();
    // ✅ navigateContextual resolve o domínio correto:
    //   - minhai.app/ia/[slug]  → router.push('/ia/slug')
    //   - loja.minhai.com.br    → router.push('/') (middleware reescreve para /ia/slug)
    navigateContextual(router, 'ia', slug);
  }

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        disabled={saindo}
        title="Sair da Conta"
        className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all active:scale-95"
        style={{
          background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
          color:      isDark ? 'rgb(252,165,165)'     : 'rgb(185,28,28)',
          border:     `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'}`,
          opacity: saindo ? 0.6 : 1,
        }}
      >
        {saindo
          ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          : <LogOut  className="w-4 h-4 flex-shrink-0" />
        }
        {/* Texto só no desktop */}
        <span className="hidden sm:inline text-sm font-semibold">
          {saindo ? 'Saindo...' : 'Sair da Conta'}
        </span>
      </button>
    );
  }

  // ── Versão completa: ícone + texto ────────────────────────
  return (
    <button
      onClick={handleLogout}
      disabled={saindo}
      className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
      style={{
        background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
        color:      isDark ? 'rgb(252,165,165)'     : 'rgb(185,28,28)',
        border:     `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'}`,
        opacity: saindo ? 0.6 : 1,
      }}
    >
      {saindo ? (
        <><Loader2 className="w-4 h-4 animate-spin" />Saindo...</>
      ) : (
        <>
          <LogOut className="w-4 h-4" />
          {/* Texto visível apenas no desktop */}
          <span className="hidden sm:inline">Sair da Conta</span>
        </>
      )}
    </button>
  );
}
