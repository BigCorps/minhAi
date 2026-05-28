'use client';

import { useState, useEffect } from 'react';
import OneSignal from 'react-onesignal';

interface NotificationBannerProps {
  userId: string;
}

export function NotificationBanner({ userId }: NotificationBannerProps) {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'denied'>('idle');
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Detecta se está rodando como PWA/TWA instalado
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsPWA(isStandalone);

    // Só mostra se:
    // 1. Notificações são suportadas
    // 2. Permissão ainda não foi concedida nem negada definitivamente
    // 3. É mobile ou PWA instalado
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;

    const dismissed = localStorage.getItem('notif_banner_dismissed');
    if (dismissed) return;

    if (isStandalone || isMobile) {
      // Pequeno delay para não aparecer imediatamente ao carregar
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  async function handleEnable() {
    setStatus('loading');
    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // Inicializa OneSignal se ainda não foi
        if (process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
          try {
            await OneSignal.init({
              appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
              notifyButton: { enable: false },
              serviceWorkerParam: { scope: '/' },
              serviceWorkerPath: 'OneSignalSDKWorker.js',
            });
            if (userId) {
              await OneSignal.login(userId);
            }
          } catch (_e) {
            // OneSignal pode já estar inicializado — tudo bem
          }
        }
        setStatus('success');
        setTimeout(() => setShow(false), 3000);
      } else {
        setStatus('denied');
        setTimeout(() => setShow(false), 3000);
      }
    } catch (_e) {
      setStatus('denied');
    }
  }

  function handleDismiss() {
    localStorage.setItem('notif_banner_dismissed', '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 dark:border-cyan-500/20 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900"
      style={{ boxShadow: '0 0 30px rgba(0,200,255,0.04)' }}
    >
      {/* Linha de acento superior */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent dark:via-cyan-400" />

      {/* Efeito de brilho de fundo — só no dark */}
      <div
        className="hidden dark:block absolute pointer-events-none"
        style={{
          top: '-40px', right: '-40px',
          width: '150px', height: '150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,200,255,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="flex items-center gap-4 p-4 md:p-5">

        {/* Ícone */}
        <div className="flex-shrink-0 flex items-center justify-center rounded-xl w-11 h-11 bg-blue-100 border border-blue-200 dark:bg-cyan-500/10 dark:border-cyan-500/20">
          {status === 'success' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2.5"
              className="stroke-blue-500 dark:stroke-cyan-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : status === 'denied' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2.5"
              className="stroke-red-500">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2"
              className="stroke-blue-500 dark:stroke-cyan-400">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          )}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          {status === 'success' ? (
            <>
              <p className="text-sm font-semibold text-blue-600 dark:text-cyan-400">
                Notificações ativadas!
              </p>
              <p className="text-xs mt-0.5 text-blue-500/70 dark:text-white/50">
                Você receberá alertas de PIX e atendimentos em tempo real.
              </p>
            </>
          ) : status === 'denied' ? (
            <>
              <p className="text-sm font-semibold text-red-500">
                Permissão negada
              </p>
              <p className="text-xs mt-0.5 text-gray-500 dark:text-white/50">
                Ative nas configurações do navegador para receber alertas.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {isPWA ? 'Ative as notificações do app' : 'Ative as notificações'}
              </p>
              <p className="text-xs mt-0.5 text-gray-500 dark:text-white/45">
                Receba alertas de PIX recebido, novos atendimentos e lembretes.
              </p>
            </>
          )}
        </div>

        {/* Ações */}
        {status === 'idle' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleEnable}
              className="text-xs font-semibold px-3 py-2 rounded-lg transition-all text-white whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #1a73e8, #0ea5e9)' }}
            >
              Ativar
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-md transition-all text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60"
              aria-label="Fechar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-blue-500 dark:border-cyan-400 border-t-transparent animate-spin" />
        )}
      </div>
    </div>
  );
}