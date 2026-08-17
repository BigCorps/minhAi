'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PixWikiBrandFooter() {
  const pathname = usePathname();
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const syncTheme = () => {
      const saved = localStorage.getItem('publicTheme');
      if (saved === 'dark' || saved === 'light') {
        setDark(saved === 'dark');
        return;
      }
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    };

    syncTheme();
    window.addEventListener('storage', syncTheme);

    const onFocus = () => syncTheme();
    window.addEventListener('focus', onFocus);

    const interval = window.setInterval(syncTheme, 1000);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, []);

  const isDashboard = pathname.includes('/dashboard');

  return (
    <footer
      data-pixwiki-brand-footer
      className={`border-t px-4 pt-7 text-center text-xs ${
        isDashboard ? 'pb-24' : 'pb-8'
      } ${
        dark
          ? 'border-white/5 bg-[#020617] text-white/40'
          : 'border-black/5 bg-white text-slate-500'
      }`}
    >
      <p className="m-0">
        <a href="https://pix.wiki" className="transition hover:opacity-80">
          PixWiki
        </a>
        {' | '}Tecnologia{' '}
        <a href="https://minhai.app" className="transition hover:opacity-80">
          minhAi
        </a>
        {' | '}Desenvolvido por{' '}
        <a href="https://bigcorps.com.br" className="transition hover:opacity-80">
          BigCorps
        </a>
      </p>
    </footer>
  );
}
