'use client';

import { useState, useEffect } from 'react';

interface SlugFooterProps {
  theme: 'dark' | 'light';
  slug?: string;
  webapp_enabled?: boolean;
  has_consulting?: boolean;
}

// ── Domínios suportados ────────────────────────────────────────────────────────
const WEBAPP_DOMAINS = ['minhaia.app', 'nossaia.app', 'suaia.app', 'minhai.app', 'minhai.com.br'];

export default function SlugFooter({ theme, slug, webapp_enabled, has_consulting }: SlugFooterProps) {
  const [time, setTime]                   = useState<string>('');
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt]       = useState<any>(null);
  const [isKeyboardOpen, setIsKeyboardOpen]       = useState(false);
  const [currentDomain, setCurrentDomain]         = useState<string>('minhai.app');

  // Detecta em qual domínio o webapp está sendo acessado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const matched = WEBAPP_DOMAINS.find(d => hostname.endsWith(d));
      if (matched) setCurrentDomain(matched);
    }
  }, []);

  useEffect(() => {
    const handleKeyboardOpen  = () => setIsKeyboardOpen(true);
    const handleKeyboardClose = () => setIsKeyboardOpen(false);
    window.addEventListener('eai:virtualKeyboardOpen',  handleKeyboardOpen);
    window.addEventListener('eai:virtualKeyboardClose', handleKeyboardClose);
    return () => {
      window.removeEventListener('eai:virtualKeyboardOpen',  handleKeyboardOpen);
      window.removeEventListener('eai:virtualKeyboardClose', handleKeyboardClose);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isStandalone   = window.matchMedia('(display-mode: standalone)').matches;
      const storageKey     = slug ? `appInstalled_${slug}` : 'minhai_pwa_installed';
      const alreadyInstalled = localStorage.getItem(storageKey) === 'true';
      if (!isStandalone && !alreadyInstalled) setShowInstallButton(true);
    };
    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
      const storageKey = slug ? `appInstalled_${slug}` : 'minhai_pwa_installed';
      localStorage.setItem(storageKey, 'true');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled',        handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled',        handleAppInstalled);
    };
  }, [slug]);

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setShowInstallButton(false); setDeferredPrompt(null); }
    } else {
      setShowInstallButton(false);
      const storageKey = slug ? `appInstalled_${slug}` : 'minhai_pwa_installed';
      localStorage.setItem(storageKey, 'true');
    }
  };

  const isDark     = theme === 'dark';
  const hasWebapp  = webapp_enabled && slug;
  const href       = hasWebapp ? `https://${slug}.${currentDomain}` : 'https://minhai.app';
  const linkLabel  = hasWebapp ? (
    <>
      <span className="opacity-50">{slug}</span>
      <span>.{currentDomain}</span>
    </>
  ) : 'minhAi.app';

  const styles = {
    container: {
      background: isDark
        ? 'linear-gradient(to right, rgba(2,6,23,0.8), rgba(15,23,42,0.7), rgba(2,6,23,0.8))'
        : 'rgba(255,255,255,0.8)',
      borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgb(229,231,235)',
      color: isDark ? 'rgb(226,232,240)' : 'rgb(30,41,59)',
    },
  };

  const DownloadButton = () => {
    if (!showInstallButton) return null;
    return (
      <button
        onClick={handleInstallClick}
        className={`ml-2 p-1 rounded-md transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${
          isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
        }`}
        title={has_consulting ? `Baixar App de ${slug}` : 'Baixar App minhAi'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {has_consulting && <span className="ml-1 text-[10px] font-bold uppercase tracking-tighter">App</span>}
      </button>
    );
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 h-8 border-t backdrop-blur-xl transition-transform duration-300 ${
        isKeyboardOpen ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{ ...styles.container, zIndex: isKeyboardOpen ? 10 : 20 }}
    >
      {/* ── Desktop ── */}
      <div className="hidden md:flex h-full items-center px-4 text-xs relative">

        {/* Esquerda — tamanho variável, não interfere no centro */}
        <div className="flex items-center z-10">
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
            {linkLabel}
          </a>
          <DownloadButton />
        </div>

        {/* Centro — absolutamente centralizado, imune às laterais */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="opacity-70">Uma IA pra chamar de sua!</span>
        </div>

        {/* Direita — empurrado para o fim */}
        <div className="ml-auto font-mono text-sm tabular-nums z-10">{time}</div>
      </div>

      {/* ── Mobile ── */}
      <div className="flex md:hidden h-full items-center justify-center px-4 text-xs">
        <div className="flex items-center">
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline text-center">
            {linkLabel}
            <span className="opacity-70"> — Uma IA pra chamar de sua!</span>
          </a>
          <DownloadButton />
        </div>
      </div>
    </div>
  );
}
