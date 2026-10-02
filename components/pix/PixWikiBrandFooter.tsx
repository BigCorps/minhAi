'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function pixHref(path: string) {
  if (typeof window === 'undefined') return `/pix${path}`;
  const h = window.location.hostname.toLowerCase();
  return h === 'pix.wiki' || h === 'www.pix.wiki' ? path : `/pix${path}`;
}

export default function PixWikiBrandFooter() {
  const pathname = usePathname();
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const sync = () => { const saved = localStorage.getItem('publicTheme'); setDark(saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)); };
    sync(); window.addEventListener('storage', sync); window.addEventListener('focus', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', sync); };
  }, []);
  const operational = pathname.includes('/dashboard') || pathname.includes('/caixa');
  const cls = dark ? 'border-white/5 bg-[#020617] text-white/40' : 'border-black/5 bg-white text-slate-500';
  return <footer data-pixwiki-brand-footer className={`border-t px-4 pt-7 text-center text-xs ${operational ? 'pb-24' : 'pb-8'} ${cls}`}>
    <nav className="mb-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
      <a href={pixHref('/docs')} className="hover:opacity-80">API</a>
      <a href={pixHref('/seguranca')} className="hover:opacity-80">Segurança</a>
      <a href={pixHref('/aviso')} className="hover:opacity-80">Privacidade</a>
      <a href={pixHref('/termos')} className="hover:opacity-80">Termos</a>
      <a href={pixHref('/exclusao')} className="hover:opacity-80">Exclusão de dados</a>
    </nav>
    <p className="m-0"><a href="https://pix.wiki" className="hover:opacity-80">PixWiki</a>{' | '}Tecnologia <a href="https://minhai.app" className="hover:opacity-80">minhAi</a>{' | '}Desenvolvido por <a href="https://bigcorps.com.br" className="hover:opacity-80">BigCorps</a></p>
  </footer>;
}
