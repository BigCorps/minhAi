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
    <div
      className="relative overflow-hidden rounded-2xl border"
      style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)',
        borderColor: 'rgba(0, 200, 255, 0.2)',
        boxShadow: '0 0 40px rgba(0, 200, 255, 0.08)',
      }}
    >
      {/* Linha de acento superior */}
      <div
        style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #00c8ff, #1a73e8, transparent)',
        }}
      />

      {/* Efeito de brilho de fundo */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,200,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="flex items-center gap-4 p-4 md:p-5">
        {/* Ícone */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-xl"
          style={{
            width: '44px',
            height: '44px',
            background: 'rgba(0, 200, 255, 0.1)',
            border: '1px solid rgba(0, 200, 255, 0.2)',
          }}
        >
          {status === 'success' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00c8ff" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : status === 'denied' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00c8ff" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          )}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          {status === 'success' ? (
            <>
              <p className="text-sm font-semibold" style={{ color: '#00c8ff' }}>
                Notificações ativadas!
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Você receberá alertas de PIX e atendimentos em tempo real.
              </p>
            </>
          ) : status === 'denied' ? (
            <>
              <p className="text-sm font-semibold" style={{ color: '#f87171' }}>
                Permissão negada
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Ative nas configurações do navegador para receber alertas.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {isPWA ? 'Ative as notificações do app' : 'Ative as notificações'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
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
              className="text-xs font-semibold px-3 py-2 rounded-lg transition-all"
              style={{
                background: 'linear-gradient(135deg, #00c8ff, #1a73e8)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Ativar
            </button>
            <button
              onClick={handleDismiss}
              className="transition-all"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)',
                padding: '6px',
                borderRadius: '6px',
              }}
              aria-label="Fechar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div
            className="flex-shrink-0 rounded-full border-2"
            style={{
              width: '28px',
              height: '28px',
              borderColor: '#00c8ff transparent transparent transparent',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}