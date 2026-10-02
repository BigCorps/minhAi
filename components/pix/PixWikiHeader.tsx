'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';

export type PixWikiPlanKey = 'free' | 'link' | 'pro' | 'vip';

interface Props {
  plan: PixWikiPlanKey;
  dark: boolean;
  onThemeChange: (dark: boolean) => void;
}

const PLAN_LABEL: Record<PixWikiPlanKey, string> = {
  free: 'PIX GRÁTIS',
  link: 'PIX LINK',
  pro: 'PIX PRO',
  vip: 'PIX VIP',
};

export default function PixWikiHeader({ plan, dark, onThemeChange }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  function toggleTheme() {
    const next = !dark;
    localStorage.setItem('publicTheme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    onThemeChange(next);
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const oneSignalDeferred = typeof window !== 'undefined' ? (window as any).OneSignalDeferred : null;
      if (oneSignalDeferred) {
        await new Promise<void>((resolve) => {
          let finished = false;
          const finish = () => { if (!finished) { finished = true; resolve(); } };
          const timeout = window.setTimeout(finish, 1500);
          oneSignalDeferred.push(async (OneSignal: any) => {
            try {
              const subscriptionId = String(OneSignal?.User?.PushSubscription?.id || '');
              if (subscriptionId) await supabase.rpc('pixwiki_unregister_push_subscription', { p_subscription_id: subscriptionId });
              await OneSignal.logout();
            } catch { /* best effort */ }
            finally { window.clearTimeout(timeout); finish(); }
          });
        });
      }
      await supabase.auth.signOut();
    } finally {
      window.location.href = 'https://pix.wiki';
    }
  }

  const actionClass = dark
    ? 'border-white/10 bg-white/[0.035] text-white hover:bg-white/[0.07]'
    : 'border-black/10 bg-white text-slate-700 shadow-sm hover:bg-slate-50';

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Image src="/brands/pix/pixwiki.png" alt="PixWiki" width={50} height={50} className="h-12 w-12 shrink-0 rounded-xl object-cover sm:h-[50px] sm:w-[50px]" priority />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">PixWiki</h1>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black tracking-wide text-emerald-400">{PLAN_LABEL[plan]}</span>
          </div>
          <p className={`mt-0.5 hidden text-xs sm:block ${dark ? 'text-white/45' : 'text-slate-500'}`}>Pague pela automação, não pelo dinheiro que recebe.</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={toggleTheme} aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'} className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${actionClass}`}>
          {dark ? '☀' : '☾'}
        </button>
        <button type="button" onClick={logout} disabled={loggingOut} aria-label="Sair da conta" className={`flex h-11 w-11 items-center justify-center rounded-full border transition disabled:opacity-50 ${actionClass}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H8m5 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" /></svg>
        </button>
      </div>
    </header>
  );
}
