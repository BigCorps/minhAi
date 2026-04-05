'use client';

// ============================================================
// components/cliente/dashboards/shared/BotaoLogout.tsx
// Reutilizado em todos os dashboards.
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';

interface BotaoLogoutProps {
  slug: string;
  theme: 'dark' | 'light';
}

export default function BotaoLogout({ slug, theme }: BotaoLogoutProps) {
  const isDark = theme === 'dark';
  const router = useRouter();
  const { logout } = useProfile(slug);
  const [saindo, setSaindo] = useState(false);

  async function handleLogout() {
    setSaindo(true);
    await logout();
    router.replace(`/ia/${slug}`);
  }

  return (
    <button
      onClick={handleLogout}
      disabled={saindo}
      className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
      style={{
        background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
        color:      isDark ? 'rgb(252,165,165)'     : 'rgb(185,28,28)',
        border:     `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'}`,
        opacity: saindo ? 0.6 : 1,
      }}
    >
      {saindo ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Saindo...
        </>
      ) : (
        <>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair da Conta
        </>
      )}
    </button>
  );
}
