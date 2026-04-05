'use client';

// components/cliente/dashboards/shared/BotaoLogout.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
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
    // logout() já dispara eai:profileLogout — o SlugHeader atualiza o avatar
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
          <Loader2 className="w-4 h-4 animate-spin" />
          Saindo...
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </>
      )}
    </button>
  );
}
